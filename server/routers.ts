import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sanitize, sanitizeDate, sanitizeDateString, sanitizeNumeric, sanitizePhone } from "./_core/utils";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  // Admin Users
  getAdminUserByEmail,
  getAdminUserById,
  getAllAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  updateAdminUserLastLogin,
  // Clients
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  archiveClient,
  getClientStats,
  getClientDocuments,
  addClientDocument,
  deleteClientDocument,
  // Bikes
  getBikes,
  getBikeById,
  createBike,
  updateBike,
  deleteBike,
  getBikeStats,
  // Bike Discount Rules
  getBikeDiscountRules,
  createBikeDiscountRule,
  deleteBikeDiscountRule,
  deleteAllBikeDiscountRules,
  // Rentals
  getRentals,
  getRentalById,
  createRental,
  updateRental,
  deleteRental,
  archiveRental,
  checkBikeAvailability,
  getRentalStats,
  // Rental Accessories
  getRentalAccessories,
  createRentalAccessory,
  deleteRentalAccessories,
  // Accessories
  getAccessories,
  getAccessoryById,
  createAccessory,
  updateAccessory,
  deleteAccessory,
  // Financial
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
  updateExpenseCategory,
  getRevenueCategories,
  createRevenueCategory,
  deleteRevenueCategory,
  updateRevenueCategory,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getRevenues,
  createRevenue,
  updateRevenue,
  deleteRevenue,
  getFinancialReport,
  // Settings
  getSetting,
  setSetting,
  getAllSettings,
  // Audit
  createAuditLog,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { sendEmail, buildReservationEmailHtml } from "./email";
import { buildProfessionalReservationEmail } from "./email-templates";
import { sendWhatsApp, buildOwnerReservationMessage } from "./whatsapp";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";

const JWT_SECRET = process.env.JWT_SECRET || "biketogo-secret-key-change-me";
const ADMIN_COOKIE = "btg_session";

// ─── Validações de documento ─────────────────────────────────────────────────
function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // sequências iguais
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

function validarRG(rg: string): boolean {
  const clean = rg.replace(/[.\-\s]/g, "").toUpperCase();
  if (clean.length < 7 || clean.length > 9) return false;
  // Aceita formato livre (dígito verificador pode ser X em alguns estados)
  return /^[0-9]{6,8}[0-9X]$/.test(clean);
}

function validarDocumentoCliente(input: {
  nacionalidade?: string | null;
  cpf?: string | null;
  rg?: string | null;
  tipoDocumento?: string | null;
  numeroPassaporte?: string | null;
}) {
  const { nacionalidade, cpf, rg, tipoDocumento, numeroPassaporte } = input;
  if (!nacionalidade) return; // sem nacionalidade informada, validação opcional

  if (nacionalidade === "brasileiro") {
    if (!cpf || cpf.replace(/\D/g, "").length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "CPF é obrigatório para brasileiros." });
    }
    if (!validarCPF(cpf)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "CPF inválido. Verifique os dígitos verificadores." });
    }
  }

  if (nacionalidade === "estrangeiro") {
    if (!numeroPassaporte || numeroPassaporte.trim().length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Número do passaporte é obrigatório para estrangeiros." });
    }
  }

  if (rg && rg.replace(/[.\-\s]/g, "").length > 0) {
    if (!validarRG(rg)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "RG inválido. Verifique o dígito verificador." });
    }
  }
}

// ─── Helper: sign admin JWT ──────────────────────────────────────────────────
function signAdminToken(userId: number, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}

// ─── Admin auth procedure ────────────────────────────────────────────────────
const adminAuthProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Try admin cookie first
  const token = ctx.req.cookies?.[ADMIN_COOKIE];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
      const user = await getAdminUserById(decoded.userId);
      if (user && user.active) {
        return next({ ctx: { ...ctx, adminUser: user } });
      }
    } catch {}
  }

  // Fallback: try Manus OAuth user with admin role
  if (ctx.user && ctx.user.role === "admin") {
    return next({
      ctx: {
        ...ctx,
        adminUser: {
          id: 0,
          name: ctx.user.name || "Admin",
          email: ctx.user.email || "",
          role: "admin" as const,
          active: true,
        },
      },
    });
  }

  throw new TRPCError({ code: "UNAUTHORIZED", message: "Faça login para acessar o sistema." });
});

const adminOnlyProcedure = adminAuthProcedure.use(({ ctx, next }) => {
  if ((ctx as any).adminUser?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ─── Auth router (custom email + password) ───────────────────────────────────
const authRouter = router({
  me: publicProcedure.query(async (opts) => {
    // Try admin cookie
    const token = opts.ctx.req.cookies?.[ADMIN_COOKIE];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
        const user = await getAdminUserById(decoded.userId);
        if (user && user.active) {
          return { id: user.id, name: user.name, email: user.email, role: user.role, source: "local" };
        }
      } catch {}
    }
    // Fallback to Manus OAuth
    if (opts.ctx.user) {
      return { ...opts.ctx.user, source: "manus" };
    }
    return null;
  }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const user = await getAdminUserByEmail(input.email);
      if (!user || !user.active) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos." });
      }

      const token = signAdminToken(user.id, user.role);
      await updateAdminUserLastLogin(user.id);

      ctx.res.cookie(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: ctx.req.secure || ctx.req.headers["x-forwarded-proto"] === "https",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/",
      });

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    // Clear admin cookie
    ctx.res.clearCookie(ADMIN_COOKIE, { path: "/" });
    // Clear Manus cookie
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // Manage admin users
  listUsers: adminOnlyProcedure.query(() => getAllAdminUsers()),

  createUser: adminOnlyProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["admin", "operator"]).default("operator"),
    }))
    .mutation(async ({ input }) => {
      const existing = await getAdminUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado." });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const id = await createAdminUser({ name: input.name, email: input.email, passwordHash, role: input.role });
      return { id };
    }),

  updateUser: adminOnlyProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      role: z.enum(["admin", "operator"]).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, password, ...data } = input;
      const updateData: any = { ...data };
      if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
      await updateAdminUser(id, updateData);
      return { success: true };
    }),

  deleteUser: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAdminUser(input.id);
      return { success: true };
    }),
});

// ─── Clients router ───────────────────────────────────────────────────────────
const clientsRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["lead", "verified", "blocked"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const result = await getClients({ ...input, offset });
      const totalPages = Math.ceil(result.total / input.limit);
      return { ...result, page: input.page, totalPages };
    }),

  byId: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      return client;
    }),

  create: adminAuthProcedure
    .input(z.object({
      name: z.string().min(2),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      pedalFrequency: z.string().optional(),
      origin: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      instagram: z.string().optional(),
      accommodation: z.string().optional(),
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["lead", "verified", "blocked"]).default("lead"),
      // Bloco B — nacionalidade e documento
      nacionalidade: z.enum(["brasileiro", "estrangeiro"]).optional(),
      tipoDocumento: z.enum(["cnh", "rg", "passaporte"]).optional(),
      numeroPassaporte: z.string().max(50).optional(),
      complement: z.string().optional(),
      lgpdConsent: z.boolean().optional(),
      lgpdConsentAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      validarDocumentoCliente({
        nacionalidade: input.nacionalidade,
        cpf: input.cpf,
        rg: input.rg,
        tipoDocumento: input.tipoDocumento,
        numeroPassaporte: input.numeroPassaporte,
      });
      const id = await createClient({
        ...input,
        source: "manual",
        cpf: sanitize(input.cpf) as string | null,
        rg: sanitize(input.rg) as string | null,
        birthDate: sanitize(input.birthDate) as string | null,
        gender: sanitize(input.gender) as string | null,
        height: sanitize(input.height) as string | null,
        weight: sanitize(input.weight) as string | null,
        pedalFrequency: sanitize(input.pedalFrequency) as string | null,
        origin: sanitize(input.origin) as string | null,
        phone: sanitize(input.phone) as string | null,
        email: sanitize(input.email) as string | null,
        instagram: sanitize(input.instagram) as string | null,
        accommodation: sanitize(input.accommodation) as string | null,
        zipCode: sanitize(input.zipCode) as string | null,
        street: sanitize(input.street) as string | null,
        number: sanitize(input.number) as string | null,
        neighborhood: sanitize(input.neighborhood) as string | null,
        city: sanitize(input.city) as string | null,
        state: sanitize(input.state) as string | null,
         country: sanitize(input.country) as string | null || "Brasil",
        notes: sanitize(input.notes) as string | null,
        nacionalidade: sanitize(input.nacionalidade) as "brasileiro" | "estrangeiro" | null,
        tipoDocumento: sanitize(input.tipoDocumento) as "cpf" | "passaporte" | null,
        numeroPassaporte: sanitize(input.numeroPassaporte) as string | null,
        complement: sanitize(input.complement) as string | null,
        lgpdConsent: input.lgpdConsent ?? false,
        lgpdConsentAt: input.lgpdConsent ? new Date() : null,
      });
      return { id };
    }),
  update: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      pedalFrequency: z.string().optional(),
      origin: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      instagram: z.string().optional(),
      accommodation: z.string().optional(),
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["lead", "verified", "blocked"]).optional(),
      receiveEmail: z.boolean().optional(),
      blocked: z.boolean().optional(),
      // Bloco B — nacionalidade e documento
      nacionalidade: z.enum(["brasileiro", "estrangeiro"]).optional(),
      tipoDocumento: z.enum(["cnh", "rg", "passaporte"]).optional(),
      numeroPassaporte: z.string().max(50).optional(),
      complement: z.string().optional(),
      lgpdConsent: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      // Validar documento SO quando campos de documento foram enviados
      const tocaDoc = data.nacionalidade !== undefined || data.cpf !== undefined
        || data.rg !== undefined || data.tipoDocumento !== undefined
        || data.numeroPassaporte !== undefined;
      if (tocaDoc) {
        validarDocumentoCliente({
          nacionalidade: data.nacionalidade,
          cpf: data.cpf,
          rg: data.rg,
          tipoDocumento: data.tipoDocumento,
          numeroPassaporte: data.numeroPassaporte,
        });
      }

      // Gravar APENAS os campos realmente enviados.
      // sanitize() só transforma "" -> null (limpeza intencional de campo enviado).
      // Campos undefined não entram no objeto, preservando o que já está no banco.
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        sanitized[key] = sanitize(value);
      }
      if (data.lgpdConsent !== undefined) {
        sanitized.lgpdConsent = data.lgpdConsent;
        sanitized.lgpdConsentAt = data.lgpdConsent ? new Date() : null;
      }

      await updateClient(id, sanitized);
      return { success: true };
    }),

  validate: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateClient(input.id, { status: "verified" });
      return { success: true };
    }),

  delete: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await archiveClient(input.id);
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "arquivou_cliente", tabela: "clients", registroId: input.id });
      return { success: true };
    }),
  stats: adminAuthProcedure.query(() => getClientStats()),
  listArchived: adminAuthProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, totalPages: 0 };
      const { clients: clientsTable } = await import("../drizzle/schema");
      const { isNotNull, desc: descOp, sql: sqlOp } = await import("drizzle-orm");
      const offset = (input.page - 1) * input.limit;
      const where = isNotNull(clientsTable.deletedAt);
      const [items, countResult] = await Promise.all([
        db.select().from(clientsTable).where(where).orderBy(descOp(clientsTable.deletedAt)).limit(input.limit).offset(offset),
        db.select({ count: sqlOp<number>`count(*)` }).from(clientsTable).where(where),
      ]);
      const total = Number(countResult[0]?.count ?? 0);
      return { items, total, totalPages: Math.ceil(total / input.limit) };
    }),
  restore: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { clients: clientsTable } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      await db.update(clientsTable).set({ deletedAt: null }).where(eqOp(clientsTable.id, input.id));
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "restaurou_cliente", tabela: "clients", registroId: input.id });
      const adminName = (ctx as any).adminUser?.name ?? (ctx as any).user?.name ?? "Admin";
      await notifyOwner({
        title: `Cliente #${input.id} restaurado`,
        content: `O registro do cliente #${input.id} foi restaurado do arquivo por ${adminName}.`,
      });
      return { success: true };
    }),

  documents: adminAuthProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => getClientDocuments(input.clientId)),

  addDocument: adminAuthProcedure
    .input(z.object({
      clientId: z.number(),
      type: z.enum(["rg_front", "rg_back", "other"]),
      url: z.string().url(),
      cloudinaryPublicId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await addClientDocument(input);
      return { id };
    }),

  deleteDocument: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteClientDocument(input.id);
      return { success: true };
    }),
});

// ─── Bikes router ─────────────────────────────────────────────────────────────
const bikesRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      status: z.enum(["available", "rented", "maintenance"]).nullish(),
      search: z.string().nullish(),
      category: z.string().nullish(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { page, limit, ...rawFilters } = input;
      const filters = {
        status: rawFilters.status ?? undefined,
        search: rawFilters.search ?? undefined,
        category: rawFilters.category ?? undefined,
      };
      const allBikes = await getBikes(filters);
      const total = allBikes.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const pageBikes = allBikes.slice(offset, offset + limit);

      // Derivar disponibilidade agregada por bike (soma dos tamanhos)
      const { getDb, getSizeBreakdown } = await import("./db");
      const db = await getDb();
      const { bikeSizes: bsTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const data = await Promise.all(pageBikes.map(async (bike) => {
        if (!db) return { ...bike, disponivelTotal: 0, qtdTotal: 0 };
        const sizes = await db.select({ id: bsTable.id }).from(bsTable).where(eq(bsTable.bikeId, bike.id));
        if (sizes.length === 0) return { ...bike, disponivelTotal: 0, qtdTotal: 0 };
        const breakdowns = await Promise.all(sizes.map((s) => getSizeBreakdown(s.id)));
        const disponivelTotal = breakdowns.reduce((acc, bd) => acc + bd.disponivel, 0);
        const qtdTotal = breakdowns.reduce((acc, bd) => acc + bd.total, 0);
        return { ...bike, disponivelTotal, qtdTotal };
      }));

      return { data, total, totalPages, page };
    }),

  byId: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const bike = await getBikeById(input.id);
      if (!bike) throw new TRPCError({ code: "NOT_FOUND", message: "Bicicleta não encontrada." });
      return bike;
    }),

  create: adminAuthProcedure
    .input(z.object({
      serialNumber: z.string().min(1),
      model: z.string().min(1),
      brand: z.string().optional(),
      category: z.enum(["mtb", "speed", "gravel"]).optional(),
      size: z.string().optional(),
      sizes: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      weight: z.string().optional(),
      weightLimit: z.string().optional(),
      dailyRate: z.string().optional(),
      photoUrl: z.string().optional(),
      quantity: z.number().min(1).default(1),
      notes: z.string().optional(),
      status: z.enum(["available", "rented", "maintenance"]).default("available"),
    }))
    .mutation(async ({ input }) => {
      const id = await createBike(input as any);
      return { id };
    }),

  update: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      serialNumber: z.string().optional(),
      model: z.string().optional(),
      brand: z.string().optional(),
      category: z.enum(["mtb", "speed", "gravel"]).optional(),
      size: z.string().optional(),
      sizes: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      weight: z.string().optional(),
      weightLimit: z.string().optional(),
      dailyRate: z.string().optional(),
      photoUrl: z.string().optional(),
      quantity: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(["available", "rented", "maintenance"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateBike(id, data as any);
      if (data.status) {
        await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: `mudou_status_bike_${data.status}`, tabela: "bikes", registroId: id });
      }
      return { success: true };
    }),

  delete: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBike(input.id);
      return { success: true };
    }),

  stats: adminAuthProcedure.query(() => getBikeStats()),

  // Discount rules
  discountRules: adminAuthProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(({ input }) => getBikeDiscountRules(input.bikeId)),

  addDiscountRule: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      minDays: z.number().min(1),
      discountPercent: z.string(),
    }))
    .mutation(async ({ input }) => {
      const id = await createBikeDiscountRule(input);
      return { id };
    }),

  deleteDiscountRule: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBikeDiscountRule(input.id);
      return { success: true };
    }),

  setDiscountRules: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      rules: z.array(z.object({ minDays: z.number().min(1), discountPercent: z.string() })),
    }))
    .mutation(async ({ input }) => {
      await deleteAllBikeDiscountRules(input.bikeId);
      for (const rule of input.rules) {
        await createBikeDiscountRule({ bikeId: input.bikeId, ...rule });
      }
      return { success: true };
    }),

  // ─── Bike Sizes ──────────────────────────────────────────────────────────────
  listSizes: adminAuthProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(async ({ input }) => {
      const { getDb, getSizeBreakdown } = await import("./db");
      const db = await getDb();
      if (!db) return [];
      const { bikeSizes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(bikeSizes).where(eq(bikeSizes.bikeId, input.bikeId));
      return Promise.all(rows.map(async (s) => {
        const bd = await getSizeBreakdown(s.id);
        return { ...s, quantidadeDisponivel: bd.disponivel, alugada: bd.alugada, manutencao: bd.manutencao };
      }));
    }),
  addSize: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      tamanho: z.string().min(1),
      quantidadeTotal: z.number().min(1).default(1),
      quantidadeDisponivel: z.number().min(0).optional(), // inerte — disponibilidade é derivada
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeSizes } = await import("../drizzle/schema");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.insert(bikeSizes).values({
        bikeId: input.bikeId,
        tamanho: input.tamanho,
        quantidadeTotal: input.quantidadeTotal,
        quantidadeDisponivel: input.quantidadeTotal, // espelho do total; valor inerte (disponibilidade é derivada)
        observacao: sanitize(input.observacao) as string | null,
      }).returning();
      return row;
    }),
  updateSize: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      tamanho: z.string().optional(),
      quantidadeTotal: z.number().optional(),
      quantidadeDisponivel: z.number().optional(), // inerte — disponibilidade é derivada
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeSizes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, quantidadeDisponivel: _ignored, ...data } = input;
      const updateSet: Record<string, unknown> = {};
      if (data.tamanho !== undefined) updateSet.tamanho = data.tamanho;
      if (data.quantidadeTotal !== undefined) {
        updateSet.quantidadeTotal = data.quantidadeTotal;
        updateSet.quantidadeDisponivel = data.quantidadeTotal; // espelho inerte
      }
      if (data.observacao !== undefined) updateSet.observacao = sanitize(data.observacao);
      if (Object.keys(updateSet).length > 0)
        await db.update(bikeSizes).set(updateSet).where(eq(bikeSizes.id, id));
      return { success: true };
    }),
  deleteSize: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { bikeSizes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(bikeSizes).where(eq(bikeSizes.id, input.id));
      return { success: true };
    }),
  // ─── Bike Maintenance Logs ───────────────────────────────────────────────
  listMaintenance: adminAuthProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(async ({ input }) => {
      const { bikeMaintenanceLogs } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      return db.select().from(bikeMaintenanceLogs)
        .where(eq(bikeMaintenanceLogs.bikeId, input.bikeId))
        .orderBy(desc(bikeMaintenanceLogs.dataEntrada));
    }),
  addMaintenance: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      tamanhoBikeId: z.number().nullable().optional(), // null = todos os tamanhos
      quantidadeAfetada: z.number().min(1).default(1),
      descricao: z.string().min(1),
      custo: z.string().optional(),
      dataEntrada: z.string().optional(),
      dataPrevistaRetorno: z.string().optional(),
      status: z.enum(["em_andamento", "concluida"]).default("em_andamento"),
      fotos: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeMaintenanceLogs, bikes, bikeSizes } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.insert(bikeMaintenanceLogs).values({
        bikeId: input.bikeId,
        tamanhoBikeId: input.tamanhoBikeId ?? null,
        quantidadeAfetada: input.quantidadeAfetada,
        descricao: input.descricao,
        custo: sanitize(input.custo) as string | null,
        dataEntrada: input.dataEntrada ? new Date(input.dataEntrada) : new Date(),
        dataPrevistaRetorno: input.dataPrevistaRetorno ? new Date(input.dataPrevistaRetorno) : null,
        status: input.status,
        fotos: input.fotos ?? null,
      }).returning();
      if (input.status === "em_andamento") {
        // Decrement quantidadeDisponivel for affected sizes
        if (input.tamanhoBikeId) {
          // Specific size: decrement by quantidadeAfetada
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`GREATEST(0, ${bikeSizes.quantidadeDisponivel} - ${input.quantidadeAfetada})` })
            .where(eq(bikeSizes.id, input.tamanhoBikeId));
        } else {
          // All sizes of this bike: decrement each by quantidadeAfetada
          const { eq: eqOp } = await import("drizzle-orm");
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`GREATEST(0, ${bikeSizes.quantidadeDisponivel} - ${input.quantidadeAfetada})` })
            .where(eqOp(bikeSizes.bikeId, input.bikeId));
        }
        await db.update(bikes).set({ status: "maintenance" }).where(eq(bikes.id, input.bikeId));
      }
      return row;
    }),
  updateMaintenance: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      bikeId: z.number(),
      descricao: z.string().optional(),
      custo: z.string().optional(),
      dataPrevistaRetorno: z.string().optional(),
      status: z.enum(["em_andamento", "concluida"]).optional(),
      fotos: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeMaintenanceLogs, bikes, bikeSizes } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, bikeId, ...data } = input;
      // Fetch current log to know tamanhoBikeId and quantidadeAfetada before updating
      const [currentLog] = await db.select().from(bikeMaintenanceLogs).where(eq(bikeMaintenanceLogs.id, id));
      await db.update(bikeMaintenanceLogs).set({
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        custo: data.custo !== undefined ? (sanitize(data.custo) as string | null) : undefined,
        dataPrevistaRetorno: data.dataPrevistaRetorno ? new Date(data.dataPrevistaRetorno) : undefined,
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.fotos !== undefined ? { fotos: data.fotos } : {}),
        updatedAt: new Date(),
      }).where(eq(bikeMaintenanceLogs.id, id));
      if (data.status === "concluida" && currentLog) {
        // Restore quantidadeDisponivel for the affected sizes
        const qty = currentLog.quantidadeAfetada ?? 1;
        if (currentLog.tamanhoBikeId) {
          // Restore specific size
          const sizeRow = await db.select({ total: bikeSizes.quantidadeTotal })
            .from(bikeSizes).where(eq(bikeSizes.id, currentLog.tamanhoBikeId));
          const maxQty = sizeRow[0]?.total ?? qty;
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`LEAST(${maxQty}, ${bikeSizes.quantidadeDisponivel} + ${qty})` })
            .where(eq(bikeSizes.id, currentLog.tamanhoBikeId));
        } else {
          // Restore all sizes of this bike
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`LEAST(${bikeSizes.quantidadeTotal}, ${bikeSizes.quantidadeDisponivel} + ${qty})` })
            .where(eq(bikeSizes.bikeId, bikeId));
        }
        const remaining = await db.select({ id: bikeMaintenanceLogs.id, status: bikeMaintenanceLogs.status })
          .from(bikeMaintenanceLogs)
          .where(eq(bikeMaintenanceLogs.bikeId, bikeId));
        const hasOngoing = remaining.some((r: any) => r.id !== id && r.status === "em_andamento");
        if (!hasOngoing) {
          await db.update(bikes).set({ status: "available" }).where(eq(bikes.id, bikeId));
        }
      }
      return { success: true };
    }),
  uploadBikePhoto: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const { bikes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `bikes/${input.bikeId}/photo-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.update(bikes).set({ photoUrl: url }).where(eq(bikes.id, input.bikeId));
      return { url };
    }),
  uploadMaintenancePhoto: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `bikes/${input.bikeId}/maintenance-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
  deleteMaintenanceLog: adminAuthProcedure
    .input(z.object({ logId: z.number(), bikeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { bikeMaintenanceLogs, bikes, bikeSizes, auditLogs } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Fetch the log before deleting so we can restore quantities
      const [log] = await db.select().from(bikeMaintenanceLogs).where(eq(bikeMaintenanceLogs.id, input.logId));
      if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Registro de manutenção não encontrado." });
      // If the log was still active, restore quantidadeDisponivel
      if (log.status === "em_andamento") {
        const qty = log.quantidadeAfetada ?? 1;
        if (log.tamanhoBikeId) {
          const sizeRow = await db.select({ total: bikeSizes.quantidadeTotal })
            .from(bikeSizes).where(eq(bikeSizes.id, log.tamanhoBikeId));
          const maxQty = sizeRow[0]?.total ?? qty;
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`LEAST(${maxQty}, ${bikeSizes.quantidadeDisponivel} + ${qty})` })
            .where(eq(bikeSizes.id, log.tamanhoBikeId));
        } else {
          await db.update(bikeSizes)
            .set({ quantidadeDisponivel: sql`LEAST(${bikeSizes.quantidadeTotal}, ${bikeSizes.quantidadeDisponivel} + ${qty})` })
            .where(eq(bikeSizes.bikeId, input.bikeId));
        }
        // Check if there are other active maintenance logs; if not, restore bike status
        const remaining = await db.select({ id: bikeMaintenanceLogs.id, status: bikeMaintenanceLogs.status })
          .from(bikeMaintenanceLogs)
          .where(eq(bikeMaintenanceLogs.bikeId, input.bikeId));
        const hasOngoing = remaining.some((r: any) => r.id !== input.logId && r.status === "em_andamento");
        if (!hasOngoing) {
          await db.update(bikes).set({ status: "available" }).where(eq(bikes.id, input.bikeId));
        }
      }
      // Delete the log
      await db.delete(bikeMaintenanceLogs).where(eq(bikeMaintenanceLogs.id, input.logId));
      // Audit log
      await db.insert(auditLogs).values({
        adminId: ctx.user?.id ?? null,
        acao: "delete",
        tabela: "bike_maintenance_logs",
        registroId: input.logId,
        dadosAntes: log as any,
        dadosDepois: null,
      });
      return { success: true };
    }),
});

// ─── Rentals router ───────────────────────────────────────────────────────────
const rentalsRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      clientId: z.number().optional(),
      bikeId: z.number().optional(),
      status: z.enum(["pending", "active", "returned", "overdue", "cancelled"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const result = await getRentals({ ...input, offset });
      const totalPages = Math.ceil(result.total / input.limit);
      // Enrich each rental with bikeSize.tamanho (avoids "Não informado" in the UI)
      const sizeIdsSet = new Set<number>();
      for (const r of result.items) { if ((r as any).bikeSizeId) sizeIdsSet.add((r as any).bikeSizeId); }
      const sizeIds = Array.from(sizeIdsSet);
      let sizeMap = new Map<number, string>();
      if (sizeIds.length > 0) {
        const db = await getDb();
        if (db) {
          const { bikeSizes: bsTable } = await import("../drizzle/schema");
          const { inArray: inArrayOp } = await import("drizzle-orm");
          const rows = await db.select({ id: bsTable.id, tamanho: bsTable.tamanho }).from(bsTable).where(inArrayOp(bsTable.id, sizeIds));
          sizeMap = new Map(rows.map(r => [r.id, r.tamanho]));
        }
      }
      const enriched = result.items.map((r: any) => ({
        ...r,
        bikeSize: r.bikeSizeId ? { tamanho: sizeMap.get(r.bikeSizeId) ?? null } : null,
      }));
      return { ...result, items: enriched, page: input.page, totalPages };
    }),

  byId: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rental = await getRentalById(input.id);
      if (!rental) throw new TRPCError({ code: "NOT_FOUND", message: "Aluguel não encontrado." });
      return rental;
    }),

  create: adminAuthProcedure
    .input(z.object({
      clientId: z.number(),
      bikeId: z.number(),
      startDate: z.string(),
      endDate: z.string().optional(),
      deliveryTime: z.string().optional(),
      dailyRate: z.string().optional(),
      totalAmount: z.string().optional(),
      discountPercent: z.string().optional(),
      deliveryFee: z.string().optional(),
      depositAmount: z.string().optional(),
      paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "stripe", "other"]).optional(),
      paymentStatus: z.enum(["pending", "paid", "partial", "refunded"]).default("pending"),
      notes: z.string().optional(),
      accessories: z.array(z.object({
        accessoryId: z.number(),
        quantity: z.number().min(1).default(1),
        dailyRate: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { accessories: rentalAccs, ...rentalData } = input;

      const data: any = {
        ...rentalData,
        startDate: sanitizeDateString(rentalData.startDate) as string,
        endDate: sanitizeDateString(rentalData.endDate),
        deliveryTime: sanitize(rentalData.deliveryTime),
        dailyRate: sanitizeNumeric(rentalData.dailyRate),
        totalAmount: sanitizeNumeric(rentalData.totalAmount),
        discountPercent: sanitizeNumeric(rentalData.discountPercent),
        deliveryFee: sanitizeNumeric(rentalData.deliveryFee),
        depositAmount: sanitizeNumeric(rentalData.depositAmount),
        notes: sanitize(rentalData.notes),
        status: "active",
        source: "manual",
      };

      const id = await createRental(data);

      // Mark bike as rented
      await updateBike(input.bikeId, { status: "rented" });

      // Add accessories
      if (rentalAccs && rentalAccs.length > 0) {
        for (const acc of rentalAccs) {
          await createRentalAccessory({ rentalId: id, ...acc });
        }
      }

      return { id };
    }),

  update: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      endDate: z.string().optional(),
      returnedAt: z.date().optional(),
      totalAmount: z.string().optional(),
      depositAmount: z.string().optional(),
      deliveryFee: z.string().optional(),
      discountPercent: z.string().optional(),
      paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "stripe", "other"]).optional(),
      paymentStatus: z.enum(["pending", "paid", "partial", "refunded"]).optional(),
      status: z.enum(["pending", "active", "returned", "overdue", "cancelled"]).optional(),
      bikeCondition: z.enum(["ok", "damaged"]).optional(),
      returnNotes: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const rental = await getRentalById(id);
      if (!rental) throw new TRPCError({ code: "NOT_FOUND" });

      const updateData: any = {
        ...data,
        endDate: data.endDate ? sanitizeDateString(data.endDate) : undefined,
        totalAmount: data.totalAmount !== undefined ? sanitizeNumeric(data.totalAmount) : undefined,
        depositAmount: data.depositAmount !== undefined ? sanitizeNumeric(data.depositAmount) : undefined,
        deliveryFee: data.deliveryFee !== undefined ? sanitizeNumeric(data.deliveryFee) : undefined,
        discountPercent: data.discountPercent !== undefined ? sanitizeNumeric(data.discountPercent) : undefined,
        returnCondition: data.bikeCondition !== undefined ? data.bikeCondition : undefined,
        notes: data.notes !== undefined ? sanitize(data.notes) : (data.returnNotes !== undefined ? sanitize(data.returnNotes) : undefined),
      };

      await updateRental(id, updateData);

      // If returned or cancelled, free the bike
      if (data.status === "returned" || data.status === "cancelled") {
        await updateBike(rental.bikeId, { status: "available" });
      }
      return { success: true };
    }),

  // Return / close rental with condition check
  returnRental: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      bikeCondition: z.enum(["ok", "damaged"]),
      returnNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const rental = await getRentalById(input.id);
      if (!rental) throw new TRPCError({ code: "NOT_FOUND" });

      await updateRental(input.id, {
        status: "returned",
        returnedAt: new Date(),
        returnCondition: input.bikeCondition,
        notes: input.returnNotes || null,
      } as any);

      await updateBike(rental.bikeId, { status: "available" });
      return { success: true };
    }),

  delete: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const rental = await getRentalById(input.id);
      if (rental && rental.status === "active") {
        await updateBike(rental.bikeId, { status: "available" });
      }
      await archiveRental(input.id);
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "arquivou_aluguel", tabela: "rentals", registroId: input.id });
      return { success: true };
    }),

  // Accessories for a rental
  accessories: adminAuthProcedure
    .input(z.object({ rentalId: z.number() }))
    .query(({ input }) => getRentalAccessories(input.rentalId)),

  stats: adminAuthProcedure.query(() => getRentalStats()),
  listArchived: adminAuthProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, totalPages: 0 };
      const { rentals: rentalsTable } = await import("../drizzle/schema");
      const { isNotNull, desc: descOp, sql: sqlOp } = await import("drizzle-orm");
      const offset = (input.page - 1) * input.limit;
      const where = isNotNull(rentalsTable.deletedAt);
      const [items, countResult] = await Promise.all([
        db.select().from(rentalsTable).where(where).orderBy(descOp(rentalsTable.deletedAt)).limit(input.limit).offset(offset),
        db.select({ count: sqlOp<number>`count(*)` }).from(rentalsTable).where(where),
      ]);
      const total = Number(countResult[0]?.count ?? 0);
      return { items, total, totalPages: Math.ceil(total / input.limit) };
    }),
  restore: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { rentals: rentalsTable } = await import("../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      await db.update(rentalsTable).set({ deletedAt: null }).where(eqOp(rentalsTable.id, input.id));
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "restaurou_aluguel", tabela: "rentals", registroId: input.id });
      const adminName = (ctx as any).adminUser?.name ?? (ctx as any).user?.name ?? "Admin";
      await notifyOwner({
        title: `Aluguel #${input.id} restaurado`,
        content: `O registro do aluguel #${input.id} foi restaurado do arquivo por ${adminName}.`,
      });
      return { success: true };
    }),

  // Confirm all pending rentals in a contract
  confirmAll: adminOnlyProcedure
    .input(z.object({ contractId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { rentals: rentalsTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, isNull: isNullOp } = await import("drizzle-orm");
      // Get all pending rentals for this contract
      const pendingRentals = await db.select().from(rentalsTable).where(
        andOp(eqOp(rentalsTable.contractId, input.contractId), eqOp(rentalsTable.status, "pending"), isNullOp(rentalsTable.deletedAt))
      );
      if (pendingRentals.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma reserva pendente encontrada." });
      // Block confirmation if client is not verified
      if (pendingRentals.length > 0) {
        const { contracts: contractsTable2, clients: clientsTable2 } = await import("../drizzle/schema");
        const [contract] = await db.select().from(contractsTable2).where(eqOp(contractsTable2.id, input.contractId));
        if (contract?.clientId) {
          const [client] = await db.select().from(clientsTable2).where(eqOp(clientsTable2.id, contract.clientId));
          if (client && client.status !== "verified") {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Cliente "${client.name}" ainda n\u00e3o foi verificado. Verifique o cliente antes de confirmar a reserva.`,
            });
          }
        }
      }
      // Confirm each rental: set status to active, mark bike as rented
      for (const rental of pendingRentals) {
        await updateRental(rental.id, { status: "active" } as any);
        await updateBike(rental.bikeId, { status: "rented" });
      }
      // Register revenue for the contract total
      try {
        const today = new Date().toISOString().split("T")[0];
        const totalAmt = pendingRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
        if (totalAmt > 0) {
          await createRevenue({ categoryId: 1, description: `Contrato #${input.contractId} confirmado`, amount: totalAmt.toFixed(2), date: today } as any);
        }
      } catch (err) { console.warn("[confirmAll] Revenue error:", err); }
      // Mark accessory units as 'alugado' for this contract
      try {
        const { contractAccessories: caTable, accessoryUnits: auTable } = await import("../drizzle/schema");
        const { eq: eqOp2, and: andOp2 } = await import("drizzle-orm");
        const caRows = await db.select().from(caTable).where(eqOp2(caTable.contractId, input.contractId));
        for (const ca of caRows) {
          if (ca.unitId) {
            // Update the specific linked unit
            await db.update(auTable).set({ status: "alugado" }).where(eqOp2(auTable.id, ca.unitId));
          } else {
            // No specific unit linked — mark first available unit of this accessory
            const [availUnit] = await db.select().from(auTable)
              .where(andOp2(eqOp2(auTable.accessoryId, ca.accessoryId), eqOp2(auTable.status, "disponivel")))
              .limit(1);
            if (availUnit) {
              await db.update(auTable).set({ status: "alugado" }).where(eqOp2(auTable.id, availUnit.id));
              // Link the unit to the contract_accessory for future tracking
              await db.update(caTable).set({ unitId: availUnit.id }).where(eqOp2(caTable.id, ca.id));
            }
          }
        }
      } catch (err) { console.warn("[confirmAll] Unit marking error:", err); }
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "confirmou_reserva", tabela: "contracts", registroId: input.contractId });
      // Generate PDF, upload to S3, save pdfUrl, send email
      let pdfUrl: string | null = null;
      try {
        const { generateContractPdf } = await import("./pdf");
        const { storagePut } = await import("./storage");
        const { contracts: cTable2, clients: clTable2, accessories: accTable2, contractAccessories: caTable3, accessoryUnits: auTable3 } = await import("../drizzle/schema");
        const { eq: eqPdf, and: andPdf, isNull: isNullPdf } = await import("drizzle-orm");
        const [contractRow] = await db.select().from(cTable2).where(eqPdf(cTable2.id, input.contractId));
        const [clientRow] = contractRow?.clientId
          ? await db.select().from(clTable2).where(eqPdf(clTable2.id, contractRow.clientId))
          : [null];
        const rentalsForPdf = await db.select({
          bikeId: rentalsTable.bikeId, startDate: rentalsTable.startDate, endDate: rentalsTable.endDate,
          totalAmount: rentalsTable.totalAmount,
        }).from(rentalsTable).where(andPdf(eqPdf(rentalsTable.contractId, input.contractId), isNullPdf(rentalsTable.deletedAt)));
        const { bikes: bikesT } = await import("../drizzle/schema");
        const rentalsWithBike = await Promise.all(rentalsForPdf.map(async (r) => {
          const [bike] = r.bikeId ? await db.select({ model: bikesT.model, brand: bikesT.brand, serialNumber: bikesT.serialNumber }).from(bikesT).where(eqPdf(bikesT.id, r.bikeId)) : [null];
          return { ...r, bikeModel: bike?.model, bikeBrand: bike?.brand, bikeSerialNumber: bike?.serialNumber };
        }));
        const caRows3 = await db.select({
          accessoryId: caTable3.accessoryId, qty: caTable3.qty, unitId: caTable3.unitId,
          accessoryName: accTable2.name,
        }).from(caTable3).leftJoin(accTable2, eqPdf(caTable3.accessoryId, accTable2.id)).where(eqPdf(caTable3.contractId, input.contractId));
        const accWithSerial = await Promise.all(caRows3.map(async (ca) => {
          let serialNumber: string | null = null;
          if (ca.unitId) {
            const [unit] = await db.select({ serialNumber: auTable3.serialNumber }).from(auTable3).where(eqPdf(auTable3.id, ca.unitId));
            serialNumber = unit?.serialNumber ?? null;
          }
          return { accessoryName: ca.accessoryName, qty: ca.qty, serialNumber };
        }));
        // Read company settings
        // Dados da empresa são buscados internamente por generateContractPdf via getSetting("company_*")
        const pdfBuffer = await generateContractPdf({
          contractId: input.contractId,
          clientName: clientRow?.name ?? "—",
          clientCpf: clientRow?.cpf ?? null,
          clientPhone: clientRow?.phone ?? null,
          clientEmail: clientRow?.email ?? null,
          criadoEm: contractRow?.criadoEm ?? new Date(),
          valorTotal: contractRow?.valorTotal ?? null,
          rentals: rentalsWithBike,
          accessories: accWithSerial,
        });
        const suffix = Date.now().toString(36);
        const { url } = await storagePut(`contracts/contrato-${input.contractId}-${suffix}.pdf`, pdfBuffer, "application/pdf");
        pdfUrl = url;
        // Save pdfUrl in contracts table
        const { contracts: cTable3 } = await import("../drizzle/schema");
        await db.update(cTable3).set({ pdfUrl: url }).where(eqPdf(cTable3.id, input.contractId));
        // Send email with PDF link if client has email
        if (clientRow?.email) {
          const { sendEmail } = await import("./email");
          await sendEmail({
            to: clientRow.email,
            subject: `Contrato #${input.contractId} confirmado — Bike To Go`,
            html: `<p>Ol\u00e1, <strong>${clientRow.name}</strong>!</p><p>Sua reserva foi confirmada. Acesse o contrato pelo link abaixo:</p><p><a href="${url}">Baixar Contrato PDF</a></p><p>Obrigado por escolher a Bike To Go!</p>`,
          });
        }
      } catch (pdfErr) { console.warn("[confirmAll] PDF generation error:", pdfErr); }
      return { success: true, confirmed: pendingRentals.length, pdfUrl };
    }),

  // Reject all pending rentals in a contract
  rejectAll: adminOnlyProcedure
    .input(z.object({ contractId: z.number(), motivo: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { rentals: rentalsTable, contracts: contractsTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, isNull: isNullOp } = await import("drizzle-orm");
      // Get all pending rentals for this contract
      const pendingRentals = await db.select().from(rentalsTable).where(
        andOp(eqOp(rentalsTable.contractId, input.contractId), eqOp(rentalsTable.status, "pending"), isNullOp(rentalsTable.deletedAt))
      );
      if (pendingRentals.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma reserva pendente encontrada." });
      // Cancel each rental
      for (const rental of pendingRentals) {
        await updateRental(rental.id, { status: "cancelled", notes: input.motivo || "Reserva recusada pelo admin" } as any);
      }
      // Cancel the contract
      await db.update(contractsTable).set({ status: "cancelado" }).where(eqOp(contractsTable.id, input.contractId));
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "recusou_reserva", tabela: "contracts", registroId: input.contractId });
      return { success: true, rejected: pendingRentals.length };
    }),

  // List rentals grouped by contract (for /alugueis refactored view)
  listGroupedByContract: adminAuthProcedure
    .input(z.object({
      contractStatus: z.enum(["pendente", "ativo", "parcialmente_devolvido", "encerrado", "cancelado"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, totalPages: 0 };
      const { contracts: contractsTable, rentals: rentalsTable, clients: clientsTable, bikes: bikesTable, bikeSizes: bikeSizesTable } = await import("../drizzle/schema");
      const { eq: eqOp, and: andOp, isNull: isNullOp, desc: descOp, sql: sqlOp } = await import("drizzle-orm");
      
      // Build where clause for contracts
      const contractWhere: Parameters<typeof andOp>[0][] = [];
      if (input.contractStatus) contractWhere.push(eqOp(contractsTable.status, input.contractStatus));
      
      // Get total count
      const countResult = await db.select({ count: sqlOp<number>`count(distinct ${contractsTable.id})` })
        .from(contractsTable)
        .where(contractWhere.length > 0 ? andOp(...contractWhere) : undefined);
      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / input.limit);
      const offset = (input.page - 1) * input.limit;
      
      // Get contracts with pagination
      const contracts = await db.select({
        id: contractsTable.id,
        clientId: contractsTable.clientId,
        status: contractsTable.status,
        valorTotal: contractsTable.valorTotal,
        criadoEm: contractsTable.criadoEm,
        clientName: clientsTable.name,
        clientPhone: clientsTable.phone,
        clientEmail: clientsTable.email,
      })
        .from(contractsTable)
        .leftJoin(clientsTable, eqOp(contractsTable.clientId, clientsTable.id))
        .where(contractWhere.length > 0 ? andOp(...contractWhere) : undefined)
        .orderBy(descOp(contractsTable.criadoEm))
        .limit(input.limit)
        .offset(offset);
      
      // For each contract, get its rentals
      const contractsWithRentals = await Promise.all(contracts.map(async (contract) => {
        const rentals = await db.select({
          id: rentalsTable.id,
          bikeId: rentalsTable.bikeId,
          bikeSizeId: rentalsTable.bikeSizeId,
          startDate: rentalsTable.startDate,
          endDate: rentalsTable.endDate,
          status: rentalsTable.status,
          paymentStatus: rentalsTable.paymentStatus,
          totalAmount: rentalsTable.totalAmount,
          bikeModel: bikesTable.model,
          bikeBrand: bikesTable.brand,
          bikeSerialNumber: bikesTable.serialNumber,
          bikeSize: bikeSizesTable.tamanho,
        })
          .from(rentalsTable)
          .leftJoin(bikesTable, eqOp(rentalsTable.bikeId, bikesTable.id))
          .leftJoin(bikeSizesTable, eqOp(rentalsTable.bikeSizeId, bikeSizesTable.id))
          .where(andOp(eqOp(rentalsTable.contractId, contract.id), isNullOp(rentalsTable.deletedAt)));
        return { ...contract, rentals };
      }));
      
      return { items: contractsWithRentals, total, totalPages, page: input.page };
    }),
});
// ─── Accessories routerr ─────────────────────────────────────────────────────
const accessoriesRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      status: z.enum(["available", "rented", "maintenance", "lost"]).nullish(),
      search: z.string().nullish(),
      category: z.string().nullish(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const { page, limit, ...rawFilters } = input;
      const filters = {
        status: rawFilters.status ?? undefined,
        search: rawFilters.search ?? undefined,
        category: rawFilters.category ?? undefined,
      };
      const allItems = await getAccessories(filters);
      // Derive quantidadeDisponivel from accessory_units status (source of truth)
      const { getAccessoryBreakdown } = await import("./db");
      const enriched = await Promise.all(
        allItems.map(async (item) => {
          const breakdown = await getAccessoryBreakdown(item.id);
          return {
            ...item,
            quantidadeTotal: breakdown.total > 0 ? breakdown.total : (item.quantidadeTotal ?? item.quantity ?? 0),
            quantidadeDisponivel: breakdown.disponivel,
            breakdown,
          };
        })
      );
      const total = enriched.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const data = enriched.slice(offset, offset + limit);
      return { data, total, totalPages, page };
    }),
  listByCategory: adminAuthProcedure
    .query(async () => {
      const items = await getAccessories({});
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        const cat = item.category ?? "Sem categoria";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }
      return Object.entries(grouped).map(([category, accessories]) => ({ category, accessories }));
    }),
  updateQuantity: adminAuthProcedure
    .input(z.object({ id: z.number(), quantidadeTotal: z.number().min(0) }))
    .mutation(async ({ input }) => {
      await updateAccessory(input.id, { quantidadeTotal: input.quantidadeTotal, quantity: input.quantidadeTotal });
      return { success: true };
    }),

  byId: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await getAccessoryById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Acessório não encontrado." });
      return item;
    }),

  create: adminAuthProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      serialNumber: z.string().optional(),
      dailyRate: z.string().optional(),
      purchasePrice: z.string().optional(),
      replacementValue: z.string().optional(),
      status: z.enum(["available", "rented", "maintenance", "lost"]).default("available"),
      obrigatorio: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const sanitizedAcc: any = {
        ...input,
        quantity: 1, // always start with 1 unit; quantity is managed via accessory_units
        quantidadeTotal: 1,
        quantidadeDisponivel: 1,
        description: sanitize(input.description),
        category: sanitize(input.category),
        serialNumber: sanitize(input.serialNumber),
        dailyRate: sanitizeNumeric(input.dailyRate),
        purchasePrice: sanitizeNumeric(input.purchasePrice),
        replacementValue: sanitizeNumeric(input.replacementValue),
        notes: sanitize(input.notes),
        obrigatorio: input.obrigatorio ?? false,
      };
      const id = await createAccessory(sanitizedAcc);
      // Auto-create 1 initial unit in accessory_units
      const { accessoryUnits } = await import("../drizzle/schema");
      const db = await (await import("./db")).getDb();
      if (db) {
        await db.insert(accessoryUnits).values([{ accessoryId: id, status: "disponivel" as const }]);
      }
      return { id };
    }),

  update: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      serialNumber: z.string().optional(),
      quantity: z.number().optional(),
      dailyRate: z.string().optional(),
      purchasePrice: z.string().optional(),
      replacementValue: z.string().optional(),
      status: z.enum(["available", "rented", "maintenance", "lost"]).optional(),
      obrigatorio: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const sanitizedAcc: any = {
        ...data,
        description: data.description !== undefined ? sanitize(data.description) : undefined,
        category: data.category !== undefined ? sanitize(data.category) : undefined,
        serialNumber: data.serialNumber !== undefined ? sanitize(data.serialNumber) : undefined,
        dailyRate: data.dailyRate !== undefined ? sanitizeNumeric(data.dailyRate) : undefined,
        purchasePrice: data.purchasePrice !== undefined ? sanitizeNumeric(data.purchasePrice) : undefined,
        replacementValue: data.replacementValue !== undefined ? sanitizeNumeric(data.replacementValue) : undefined,
        notes: data.notes !== undefined ? sanitize(data.notes) : undefined,
        obrigatorio: data.obrigatorio,
      };
      await updateAccessory(id, sanitizedAcc);
      // Handle quantidadeTotal change: create additional units or warn on decrease
      if (sanitizedAcc.quantidadeTotal !== undefined || sanitizedAcc.quantity !== undefined) {
        const newTotal = sanitizedAcc.quantidadeTotal ?? sanitizedAcc.quantity;
        if (newTotal !== undefined) {
          const { accessoryUnits } = await import("../drizzle/schema");
          const { eq: eqOp, count: countFn } = await import("drizzle-orm");
          const db = await (await import("./db")).getDb();
          if (db) {
            const [{ value: existingCount }] = await db
              .select({ value: countFn(accessoryUnits.id) })
              .from(accessoryUnits)
              .where(eqOp(accessoryUnits.accessoryId, id));
            const existing = Number(existingCount ?? 0);
            if (newTotal > existing) {
              // Create additional units
              const diff = newTotal - existing;
              const unitRows = Array.from({ length: diff }, () => ({ accessoryId: id, status: "disponivel" as const }));
              await db.insert(accessoryUnits).values(unitRows);
              return { success: true, unitsCreated: diff };
            } else if (newTotal < existing) {
              // Warn but do NOT delete existing units
              return { success: true, warning: `Existem ${existing} unidades cadastradas, mas quantidadeTotal foi definida como ${newTotal}. Nenhuma unidade foi removida.` };
            }
          }
        }
      }
      return { success: true };
    }),

  delete: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAccessory(input.id);
      return { success: true };
    }),

  // ─── Unit-level endpoints ─────────────────────────────────────────────────
  getUnits: adminAuthProcedure
    .input(z.object({ accessoryId: z.number() }))
    .query(async ({ input }) => {
      const { accessoryUnits } = await import("../drizzle/schema");
      const { eq, asc } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      return db.select().from(accessoryUnits)
        .where(eq(accessoryUnits.accessoryId, input.accessoryId))
        .orderBy(asc(accessoryUnits.id));
    }),

  updateUnitStatus: adminAuthProcedure
    .input(z.object({
      unitId: z.number(),
      status: z.enum(["disponivel", "alugado", "perdido", "manutencao", "roubado"]),
      observacao: z.string().optional(),
      variante: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { accessoryUnits } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(accessoryUnits).set({
        status: input.status,
        observacao: input.observacao ?? null,
        variante: input.variante ?? null,
      }).where(eq(accessoryUnits.id, input.unitId));
      return { success: true };
    }),

  deleteUnit: adminAuthProcedure
    .input(z.object({ unitId: z.number() }))
    .mutation(async ({ input }) => {
      const { accessoryUnits, accessories } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Check unit exists and is not rented
      const [unit] = await db.select().from(accessoryUnits).where(eq(accessoryUnits.id, input.unitId));
      if (!unit) throw new TRPCError({ code: "NOT_FOUND", message: "Unidade não encontrada." });
      if (unit.status === "alugado") throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível excluir unidade alugada." });
      const accessoryId = unit.accessoryId;
      await db.delete(accessoryUnits).where(eq(accessoryUnits.id, input.unitId));
      // Recalculate quantidadeTotal from real count of remaining units
      await db.update(accessories)
        .set({
          quantidadeTotal: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${accessoryId})`,
          quantity: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${accessoryId})`,
        })
        .where(eq(accessories.id, accessoryId));
      return { success: true };
    }),

  createUnit: adminAuthProcedure
    .input(z.object({
      accessoryId: z.number(),
      serialNumber: z.string().optional(),
      variante: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { accessoryUnits, accessories } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.insert(accessoryUnits).values({
        accessoryId: input.accessoryId,
        serialNumber: input.serialNumber ?? null,
        variante: input.variante ?? null,
        status: "disponivel",
      }).returning();
      // Sync quantidadeTotal and quantity on the parent accessory
      await db.update(accessories)
        .set({
          quantidadeTotal: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
          quantity: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
        })
        .where(eq(accessories.id, input.accessoryId));
      return row;
    }),

  // ACC-2: bulk add units by variante
  addUnits: adminAuthProcedure
    .input(z.object({
      accessoryId: z.number(),
      variante: z.string().optional(),
      quantity: z.number().int().min(1).max(50),
    }))
    .mutation(async ({ input }) => {
      const { accessoryUnits, accessories } = await import("../drizzle/schema");
      const { eq, sql, and, isNull } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Fetch accessory name for serial prefix
      const [acc] = await db.select({ name: accessories.name })
        .from(accessories)
        .where(eq(accessories.id, input.accessoryId));
      if (!acc) throw new TRPCError({ code: "NOT_FOUND", message: "Acessório não encontrado." });

      // Build 3-letter uppercase prefix from accessory name
      const prefix = acc.name
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .slice(0, 3)
        .padEnd(3, "X");

      // Find current max serial number for this accessory to ensure uniqueness
      const existingUnits = await db.select({ serialNumber: accessoryUnits.serialNumber })
        .from(accessoryUnits)
        .where(eq(accessoryUnits.accessoryId, input.accessoryId));

      // Extract numeric suffixes from existing serials matching our prefix
      let maxSeq = 0;
      for (const u of existingUnits) {
        if (u.serialNumber && u.serialNumber.startsWith(prefix + "-")) {
          const num = parseInt(u.serialNumber.slice(prefix.length + 1), 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }

      // Build insert rows
      const rows = Array.from({ length: input.quantity }, (_, i) => ({
        accessoryId: input.accessoryId,
        serialNumber: `${prefix}-${String(maxSeq + i + 1).padStart(3, "0")}`,
        variante: input.variante ?? null,
        status: "disponivel" as const,
      }));

      const inserted = await db.insert(accessoryUnits).values(rows).returning();

      // Recalculate quantidadeTotal
      await db.update(accessories)
        .set({
          quantidadeTotal: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
          quantity: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
        })
        .where(eq(accessories.id, input.accessoryId));

      return { inserted: inserted.length };
    }),

  // ACC-2: remove one available unit from a variante
  removeAvailableUnit: adminAuthProcedure
    .input(z.object({
      accessoryId: z.number(),
      variante: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { accessoryUnits, accessories } = await import("../drizzle/schema");
      const { eq, sql, and, isNull, desc } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find the most recent available unit for this variante
      const varianteFilter = input.variante
        ? eq(accessoryUnits.variante, input.variante)
        : isNull(accessoryUnits.variante);

      const [unit] = await db.select()
        .from(accessoryUnits)
        .where(and(
          eq(accessoryUnits.accessoryId, input.accessoryId),
          eq(accessoryUnits.status, "disponivel"),
          varianteFilter,
        ))
        .orderBy(desc(accessoryUnits.id))
        .limit(1);

      if (!unit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sem unidades disponíveis para remover nesta variante.",
        });
      }

      await db.delete(accessoryUnits).where(eq(accessoryUnits.id, unit.id));

      // Recalculate quantidadeTotal
      await db.update(accessories)
        .set({
          quantidadeTotal: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
          quantity: sql`(SELECT COUNT(*) FROM accessory_units WHERE "accessoryId" = ${input.accessoryId})`,
        })
        .where(eq(accessories.id, input.accessoryId));

      return { success: true, removedId: unit.id };
    }),
});

// ─── Financial router ────────────────────────────────────────────────────────
const financialRouter = router({
  // Expense categories
  expenseCategories: adminAuthProcedure.query(() => getExpenseCategories()),
  createExpenseCategory: adminAuthProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const id = await createExpenseCategory(input);
      return { id };
    }),
  updateExpenseCategory: adminAuthProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await updateExpenseCategory(input.id, { name: input.name });
      return { success: true };
    }),
  deleteExpenseCategory: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExpenseCategory(input.id);
      return { success: true };
    }),

  // Revenue categories
  revenueCategories: adminAuthProcedure.query(() => getRevenueCategories()),
  createRevenueCategory: adminAuthProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const id = await createRevenueCategory(input);
      return { id };
    }),
  updateRevenueCategory: adminAuthProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await updateRevenueCategory(input.id, { name: input.name });
      return { success: true };
    }),
  deleteRevenueCategory: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRevenueCategory(input.id);
      return { success: true };
    }),

  // Expenses
  expenses: adminAuthProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => getExpenses(input)),

  createExpense: adminAuthProcedure
    .input(z.object({
      categoryId: z.number(),
      description: z.string().min(1),
      amount: z.string(),
      date: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const dateVal = sanitizeDateString(input.date);
      if (!dateVal) throw new TRPCError({ code: "BAD_REQUEST", message: "Data inválida." });
      const id = await createExpense({
        categoryId: input.categoryId,
        description: input.description,
        amount: sanitizeNumeric(input.amount) as string,
        date: dateVal,
      } as any);
      return { id };
    }),

  updateExpense: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.date) updateData.date = sanitizeDateString(data.date);
      if (data.amount !== undefined) updateData.amount = sanitizeNumeric(data.amount);
      await updateExpense(id, updateData);
      return { success: true };
    }),

  deleteExpense: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteExpense(input.id);
      return { success: true };
    }),

  // Revenues (extra)
  revenues: adminAuthProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => getRevenues(input)),

  createRevenue: adminAuthProcedure
    .input(z.object({
      categoryId: z.number(),
      description: z.string().min(1),
      amount: z.string(),
      date: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const dateVal = sanitizeDateString(input.date);
      if (!dateVal) throw new TRPCError({ code: "BAD_REQUEST", message: "Data inválida." });
      const id = await createRevenue({
        categoryId: input.categoryId,
        description: input.description,
        amount: sanitizeNumeric(input.amount) as string,
        date: dateVal,
      } as any);
      return { id };
    }),

  updateRevenue: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      categoryId: z.number().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.date) updateData.date = sanitizeDateString(data.date);
      if (data.amount !== undefined) updateData.amount = sanitizeNumeric(data.amount);
      await updateRevenue(id, updateData);
      return { success: true };
    }),

  deleteRevenue: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRevenue(input.id);
      return { success: true };
    }),

  // Financial report
  report: adminAuthProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(({ input }) => getFinancialReport(input.startDate, input.endDate)),
});

// ─── Settings router ─────────────────────────────────────────────────────────
const settingsRouter = router({
  getAll: adminAuthProcedure.query(() => getAllSettings()),

  get: adminAuthProcedure
    .input(z.object({ key: z.string() }))
    .query(({ input }) => getSetting(input.key)),

  set: adminOnlyProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      // Sanitize phone numbers before saving
      const phoneKeys = ["whatsapp_number", "notification_phone"];
      const valueToSave = phoneKeys.includes(input.key)
        ? (sanitizePhone(input.value) ?? input.value)
        : input.value;
      await setSetting(input.key, valueToSave);
      return { success: true };
    }),

  setMany: adminOnlyProcedure
    .input(z.object({ entries: z.array(z.object({ key: z.string(), value: z.string() })) }))
    .mutation(async ({ input }) => {
      const phoneKeys = ["whatsapp_number", "notification_phone"];
      for (const e of input.entries) {
        const valueToSave = phoneKeys.includes(e.key)
          ? (sanitizePhone(e.value) ?? e.value)
          : e.value;
        await setSetting(e.key, valueToSave);
      }
      return { success: true };
    }),
});

// ─── Public API (for Shopify integration) ────────────────────────────────────
const publicApiRouter = router({
  // Get bike sizes with real-time availability
  bikeSizes: publicProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(async ({ input }) => {
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      const { bikeSizes: bs, rentals: rt } = await import("../drizzle/schema");
      const { eq, inArray, isNull: isNullOp, and: andOp } = await import("drizzle-orm");
      // Get all sizes for this bike
      const allSizes = await db.select().from(bs).where(eq(bs.bikeId, input.bikeId));
      // Derivar disponibilidade pelo modelo de fonte única de verdade
      const { getSizeAvailability } = await import("./db");
      const sizeAvailability = await Promise.all(
        allSizes.map(async (size) => ({
          id: size.id,
          bikeId: size.bikeId,
          tamanho: size.tamanho,
          quantidadeTotal: size.quantidadeTotal,
          quantidadeDisponivel: await getSizeAvailability(size.id),
        }))
      );
      return sizeAvailability;
    }),
  // Get discount rules for a bike
  bikeDiscountRules: publicProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(({ input }) => getBikeDiscountRules(input.bikeId)),


  // Get available accessories (with real-time availability)
  availableAccessories: publicProcedure.query(async () => {
    const all = await getAccessories({ status: "available" });
    const db = await (await import("./db")).getDb();
    if (!db) return all.map((a) => ({ id: a.id, name: a.name, category: a.category, dailyRate: a.dailyRate, quantity: a.quantity, quantidadeTotal: a.quantidadeTotal ?? a.quantity, quantidadeDisponivel: a.quantidadeTotal ?? a.quantity }));
    const { rentalAccessories: ra, rentals: rt } = await import("../drizzle/schema");
    const { eq, inArray, and: andOp } = await import("drizzle-orm");
    const ids = all.map((i) => i.id);
    const activeUsage = ids.length > 0 ? await db
      .select({ accessoryId: ra.accessoryId, qty: ra.quantity })
      .from(ra)
      .innerJoin(rt, eq(ra.rentalId, rt.id))
      .where(andOp(inArray(ra.accessoryId, ids), inArray(rt.status, ["active", "overdue"]))) : [];
    const usageMap: Record<number, number> = {};
    for (const row of activeUsage) { usageMap[row.accessoryId] = (usageMap[row.accessoryId] ?? 0) + (row.qty ?? 1); }
    return all.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      dailyRate: a.dailyRate,
      quantity: a.quantity,
      quantidadeTotal: a.quantidadeTotal ?? a.quantity,
      quantidadeDisponivel: Math.max(0, (a.quantidadeTotal ?? a.quantity) - (usageMap[a.id] ?? 0)),
      obrigatorio: (a as any).obrigatorio ?? false,
    }));
  }),

  // Get available accessories grouped by category (for public form)
  availableAccessoriesByCategory: publicProcedure.query(async () => {
    const all = await getAccessories({ status: "available" });
    const db = await (await import("./db")).getDb();
    const availMap: Record<number, number> = {};
    if (db) {
      const { rentalAccessories: ra, rentals: rt } = await import("../drizzle/schema");
      const { eq, inArray, and: andOp } = await import("drizzle-orm");
      const ids = all.map((i) => i.id);
      if (ids.length > 0) {
        const activeUsage = await db
          .select({ accessoryId: ra.accessoryId, qty: ra.quantity })
          .from(ra)
          .innerJoin(rt, eq(ra.rentalId, rt.id))
          .where(andOp(inArray(ra.accessoryId, ids), inArray(rt.status, ["pending", "active", "overdue"])));
        for (const row of activeUsage) { availMap[row.accessoryId] = (availMap[row.accessoryId] ?? 0) + (row.qty ?? 1); }
      }
    }
    const items = all.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category ?? "Outros",
      dailyRate: a.dailyRate,
      quantidadeTotal: a.quantidadeTotal ?? a.quantity,
      quantidadeDisponivel: Math.max(0, (a.quantidadeTotal ?? a.quantity) - (availMap[a.id] ?? 0)),
      obrigatorio: (a as any).obrigatorio ?? false,
    }));
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const cat = item.category ?? "Outros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped).map(([category, accessories]) => ({ category, accessories }));
  }),

  // Get delivery fee setting
  deliveryFee: publicProcedure.query(async () => {
    const fee = await getSetting("delivery_fee");
    return fee || "0";
  }),




  // ─── Pré-cadastro: cria apenas o cliente como Lead (sem reserva) ─────────────
  submitPreRegistration: publicProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      // Identificação
      name: z.string().min(2),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      passport: z.string().optional(),
      docOrigin: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      height: z.string().min(1),
      weight: z.string().min(1),
      pedalFreq: z.string().optional(),
      howFound: z.string().optional(),
      // Contato
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      instagram: z.string().optional(),
      accommodation: z.string().optional(),
      // Endereço
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      // LGPD
      lgpdConsent: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      // Validate CPF for Brazilians
      if (input.cpf && input.cpf.replace(/\D/g, "").length > 0) {
        if (!validarCPF(input.cpf)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "CPF inválido." });
        }
      }
      if (input.rg && input.rg.replace(/[.\-\s]/g, "").length > 0) {
        if (!validarRG(input.rg)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "RG inválido." });
        }
      }

      // Create client with status 'lead'
      const clientId = await createClient({
        name: input.name,
        cpf: sanitize(input.cpf) as string | null,
        rg: sanitize(input.rg ?? input.passport) as string | null,
        birthDate: sanitize(input.birthDate) as string | null,
        gender: sanitize(input.gender) as string | null,
        height: sanitize(input.height) as string | null,
        weight: sanitize(input.weight) as string | null,
        phone: sanitize(input.phone) as string | null,
        email: sanitize(input.email) as string | null,
        instagram: sanitize(input.instagram) as string | null,
        accommodation: sanitize(input.accommodation) as string | null,
        zipCode: sanitize(input.zipCode) as string | null,
        street: sanitize(input.street) as string | null,
        number: sanitize(input.number) as string | null,
        complement: sanitize(input.complement) as string | null,
        neighborhood: sanitize(input.neighborhood) as string | null,
        city: sanitize(input.city) as string | null,
        state: sanitize(input.state) as string | null,
        country: sanitize(input.country) as string | null || "Brasil",
        pedalFrequency: sanitize(input.pedalFreq) as string | null,
        origin: sanitize(input.howFound) as string | null,
        source: "site",
        status: "lead",
      } as any);

      // Notify owner
      try {
        const [companyName, rawOwnerPhone] = await Promise.all([
          getSetting("company_name"),
          getSetting("whatsapp_number"),
        ]);
        const ownerPhone = sanitizePhone(rawOwnerPhone) ?? rawOwnerPhone ?? undefined;

        // Manus built-in notification
        await notifyOwner({
          title: "📋 Novo Pré-Cadastro!",
          content: `Cliente: ${input.name}\nTelefone: ${input.phone || "N/A"}\nE-mail: ${input.email || "N/A"}\n\nVerifique em /clientes e entre em contato para combinar a locação.`,
        });

        // WhatsApp to owner
        const waMsg = `📋 *Novo pré-cadastro recebido! — Bike To Go*\n\n*Cliente:* ${input.name}\n*Telefone:* ${input.phone || "N/A"}\n*E-mail:* ${input.email || "N/A"}\n\nVerifique em /clientes e entre em contato para combinar a locação.`;
        await sendWhatsApp({ text: waMsg, to: ownerPhone });

        // E-mail to owner
        const ownerEmail = await getSetting("company_email") || await getSetting("notification_email");
        if (ownerEmail) {
          await sendEmail({
            to: ownerEmail,
            subject: `📋 Novo Pré-Cadastro — ${input.name} | ${companyName || "Bike To Go"}`,
            html: `<p>Novo pré-cadastro recebido pelo site.</p><p><strong>Cliente:</strong> ${input.name}<br><strong>Telefone:</strong> ${input.phone || "N/A"}<br><strong>E-mail:</strong> ${input.email || "N/A"}</p><p>Acesse <a href="/clientes">/clientes</a> para verificar e entrar em contato.</p>`,
          });
        }
      } catch (err) {
        console.warn("[submitPreRegistration] Notification error:", err);
      }

      return { clientId, success: true };
    }),

  // ─── Upload document photo (base64) ────────────────────────────────────────
  getReservationWhatsApp: publicProcedure.query(async () => {
    const { getSetting } = await import("./db");
    const raw = await getSetting("whatsapp_reservas");
    const number = raw ? raw.replace(/\D/g, "") : null;
    return { number: number && number.length >= 10 ? number : null };
  }),

  uploadDocument: publicProcedure
    .input(z.object({
      clientId: z.number(),
      side: z.enum(["front", "back"]),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      // Validate mimeType: accept image/* or application/pdf only
      const isImage = input.mimeType.startsWith("image/");
      const isPdf = input.mimeType === "application/pdf";
      if (!isImage && !isPdf) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de arquivo não suportado. Envie uma imagem ou PDF." });
      }
      const { storagePut } = await import("./storage");
      const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      // Normalize extension: application/pdf -> pdf, image/jpeg -> jpg, etc.
      const extMap: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
      const ext = extMap[input.mimeType] || input.mimeType.split("/")[1] || "bin";
      const key = `clients/${input.clientId}/doc-${input.side}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const field = input.side === "front" ? "docFrontUrl" : "docBackUrl";
      await updateClient(input.clientId, { [field]: url } as any);
      return { url };
    }),
});

// ─── Dashboard router ────────────────────────────────────────────────────────
const dashboardRouter = router({
  summary: adminAuthProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const periodStart = input?.startDate ?? fmt(startOfMonth);
    const periodEnd = input?.endDate ?? fmt(endOfMonth);
    const [clientStats, bikeStats, rentalStats, financialReport] = await Promise.all([
      getClientStats(),
      getBikeStats(),
      getRentalStats(),
      getFinancialReport(periodStart, periodEnd),
    ]);
    const receitaAlugueis = parseFloat(financialReport.rentalRevenue ?? "0");
    const receitasExtras = parseFloat(financialReport.extraRevenue ?? "0");
    const despesas = parseFloat(financialReport.totalExpenses ?? "0");
    const lucroLiquido = receitaAlugueis + receitasExtras - despesas;
    return {
      clientStats,
      bikeStats,
      rentalStats,
      financial: {
        receitaAlugueis,
        receitasExtras,
        despesas,
        lucroLiquido,
      },
    };
  }),

  weeklyRevenue: adminAuthProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const { rentals: rentalsSchema, expenses: expensesSchema, revenues: revenuesSchema } = await import("../drizzle/schema");
    const { isNotNull, gte: gteOp, lte: lteOp } = await import("drizzle-orm");

    // Calcular range completo das 8 semanas (7 semanas atrás + semana atual)
    const now = new Date();
    // Semana mais antiga: começa 7*7 = 49 dias atrás (segunda da semana mais antiga)
    const rangeStart = new Date(now);
    rangeStart.setDate(now.getDate() - 7 * 7);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(now);
    rangeEnd.setHours(23, 59, 59, 999);
    const rangeStartStr = rangeStart.toISOString().split("T")[0];
    const rangeEndStr = rangeEnd.toISOString().split("T")[0];

    // 3 queries totais para o range completo
    const [rentalRows, revenueRows, expenseRows] = await Promise.all([
      db.select({ returnedAt: rentalsSchema.returnedAt, total: rentalsSchema.totalAmount })
        .from(rentalsSchema)
        .where(and(isNotNull(rentalsSchema.returnedAt), gteOp(rentalsSchema.returnedAt, rangeStart), lteOp(rentalsSchema.returnedAt, rangeEnd))),
      db.select({ date: revenuesSchema.date, total: revenuesSchema.amount })
        .from(revenuesSchema)
        .where(and(gteOp(revenuesSchema.date, rangeStartStr), lteOp(revenuesSchema.date, rangeEndStr))),
      db.select({ date: expensesSchema.date, total: expensesSchema.amount })
        .from(expensesSchema)
        .where(and(gteOp(expensesSchema.date, rangeStartStr), lteOp(expensesSchema.date, rangeEndStr))),
    ]);

    // Agrupar em JavaScript nas 8 semanas (mesmo formato de retorno)
    const weeks: { week: string; receitaAlugueis: number; receitasExtras: number; despesas: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const receitaAlugueis = rentalRows
        .filter(r => r.returnedAt && r.returnedAt >= start && r.returnedAt <= end)
        .reduce((a, r) => a + parseFloat(r.total ?? "0"), 0);

      const receitasExtras = revenueRows
        .filter(r => r.date >= startStr && r.date <= endStr)
        .reduce((a, r) => a + parseFloat(r.total ?? "0"), 0);

      const despesas = expenseRows
        .filter(r => r.date >= startStr && r.date <= endStr)
        .reduce((a, r) => a + parseFloat(r.total ?? "0"), 0);

      const label = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      weeks.push({
        week: label,
        receitaAlugueis: Math.round(receitaAlugueis * 100) / 100,
        receitasExtras: Math.round(receitasExtras * 100) / 100,
        despesas: Math.round(despesas * 100) / 100,
      });
    }
    return weeks;
  }),

  revenueByBike: adminAuthProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { rentals: rentalsSchema, bikes: bikesSchema } = await import("../drizzle/schema");
      const { eq: eqOp, gte: gteOp, lte: lteOp, isNotNull: isNotNullOp, sql: sqlOp } = await import("drizzle-orm");
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const periodStart = input?.startDate ?? fmt(startOfMonth);
      const periodEnd = input?.endDate ?? fmt(endOfMonth);
      // Join rentals with bikes, filter paid rentals within period, group by bike model
      const rows = await db
        .select({
          modelo: bikesSchema.model,
          receita: sqlOp<string>`SUM(CAST(${rentalsSchema.totalAmount} AS DECIMAL(10,2)))`,
        })
        .from(rentalsSchema)
        .innerJoin(bikesSchema, eqOp(rentalsSchema.bikeId, bikesSchema.id))
        .where(
          and(
            eqOp(rentalsSchema.paymentStatus, "paid"),
            isNotNullOp(rentalsSchema.totalAmount),
            gteOp(rentalsSchema.startDate, periodStart),
            lteOp(rentalsSchema.startDate, periodEnd),
          )
        )
        .groupBy(bikesSchema.model)
        .orderBy(sqlOp`SUM(CAST(${rentalsSchema.totalAmount} AS DECIMAL(10,2))) DESC`);
      return rows.map((r) => ({
        modelo: r.modelo,
        receita: Math.round(parseFloat(r.receita ?? "0") * 100) / 100,
      }));
    }),
});

// ─── Audit Logs router ────────────────────────────────────────────────────────
const auditLogsRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      acao: z.string().optional(),
      tabela: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0, totalPages: 0 };
      const { auditLogs: auditLogsTable } = await import("../drizzle/schema");
      const { and: andOp, eq: eqOp, gte: gteOp, lte: lteOp, desc: descOp } = await import("drizzle-orm");
      const conditions: any[] = [];
      if (input.acao) conditions.push(eqOp(auditLogsTable.acao, input.acao));
      if (input.tabela) conditions.push(eqOp(auditLogsTable.tabela, input.tabela));
      if (input.dataInicio) conditions.push(gteOp(auditLogsTable.criadoEm, new Date(input.dataInicio)));
      if (input.dataFim) {
        const end = new Date(input.dataFim);
        end.setHours(23, 59, 59, 999);
        conditions.push(lteOp(auditLogsTable.criadoEm, end));
      }
      const where = conditions.length > 0 ? andOp(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;
      const { sql: sqlOp } = await import("drizzle-orm");
      const [data, countResult] = await Promise.all([
        db.select().from(auditLogsTable).where(where).orderBy(descOp(auditLogsTable.criadoEm)).limit(input.limit).offset(offset),
        db.select({ count: sqlOp<number>`count(*)` }).from(auditLogsTable).where(where),
      ]);
      const total = Number(countResult[0]?.count ?? 0);
      return { data, total, totalPages: Math.ceil(total / input.limit) };
    }),
});

// ─── Contracts router ───────────────────────────────────────────────────────────────
import { and, eq, isNull, sql as drizzleSql } from "drizzle-orm";
import {
  contracts,
  contractAccessories,
  rentals as rentalsTable,
  clients as clientsTable,
  bikes as bikesTable,
  accessories as accessoriesTable,
  accessoryUnits,
  Contract,
  InsertContract,
} from "../drizzle/schema";
import { getDb } from "./db";

/** Recalcula e persiste o status do contrato com base nos rentals vinculados */
async function recalcContractStatus(contractId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const linked = await db
    .select({ status: rentalsTable.status })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.contractId, contractId), isNull(rentalsTable.deletedAt)));
  if (linked.length === 0) return;
  const total = linked.length;
  const returned = linked.filter(r => r.status === "returned" || r.status === "cancelled").length;
  let newStatus: "ativo" | "parcialmente_devolvido" | "encerrado";
  if (returned === 0) {
    newStatus = "ativo";
  } else if (returned < total) {
    newStatus = "parcialmente_devolvido";
  } else {
    newStatus = "encerrado";
  }
  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "encerrado") updateData.encerradoEm = new Date();
  await db.update(contracts).set(updateData).where(eq(contracts.id, contractId));
}

const contractsRouter = router({
  // Cria contrato e vincula N rentals existentes
  create: adminAuthProcedure
    .input(z.object({
      clientId: z.number(),
      rentalIds: z.array(z.number()).min(1),
      valorTotal: z.string().optional(),
      accessories: z.array(z.object({
        accessoryId: z.number(),
        qty: z.number().min(1).default(1),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [contract] = await db.insert(contracts).values({
        clientId: input.clientId,
        valorTotal: input.valorTotal ?? null,
        status: "ativo",
      }).returning({ id: contracts.id });
      // Link rentals to contract
      for (const rentalId of input.rentalIds) {
        await db.update(rentalsTable)
          .set({ contractId: contract.id })
          .where(eq(rentalsTable.id, rentalId));
      }
      // Add accessories checklist
      if (input.accessories && input.accessories.length > 0) {
        for (const acc of input.accessories) {
          await db.insert(contractAccessories).values({
            contractId: contract.id,
            accessoryId: acc.accessoryId,
            qty: acc.qty,
            status: "ok",
          });
        }
      }
      await recalcContractStatus(contract.id);
      return { id: contract.id };
    }),

  // Lista contratos ativos (sem soft delete)
  list: adminAuthProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: 1, totalPages: 1 };
      const offset = (input.page - 1) * input.limit;
      const [items, countResult] = await Promise.all([
        db.select({
          id: contracts.id,
          clientId: contracts.clientId,
          status: contracts.status,
          valorTotal: contracts.valorTotal,
          criadoEm: contracts.criadoEm,
          encerradoEm: contracts.encerradoEm,
          clientName: clientsTable.name,
        })
          .from(contracts)
          .leftJoin(clientsTable, eq(contracts.clientId, clientsTable.id))
          .where(isNull(contracts.deletedAt))
          .orderBy(contracts.criadoEm)
          .limit(input.limit)
          .offset(offset),
        db.select({ count: drizzleSql<number>`count(*)` })
          .from(contracts)
          .where(isNull(contracts.deletedAt)),
      ]);
      const total = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / input.limit);
      return { items, total, page: input.page, totalPages };
    }),

  // Detalhe do contrato com rentals e acessórios vinculados
  getById: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [contract] = await db.select({
        id: contracts.id,
        clientId: contracts.clientId,
        status: contracts.status,
        valorTotal: contracts.valorTotal,
        pdfUrl: contracts.pdfUrl,
        criadoEm: contracts.criadoEm,
        encerradoEm: contracts.encerradoEm,
        clientName: clientsTable.name,
        clientPhone: clientsTable.phone,
        clientEmail: clientsTable.email,
        clientStatus: clientsTable.status,
      })
        .from(contracts)
        .leftJoin(clientsTable, eq(contracts.clientId, clientsTable.id))
        .where(eq(contracts.id, input.id));
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      const linkedRentals = await db.select({
        id: rentalsTable.id,
        bikeId: rentalsTable.bikeId,
        startDate: rentalsTable.startDate,
        endDate: rentalsTable.endDate,
        status: rentalsTable.status,
        paymentStatus: rentalsTable.paymentStatus,
        returnCondition: rentalsTable.returnCondition,
        totalAmount: rentalsTable.totalAmount,
        notes: rentalsTable.notes,
        bikeModel: bikesTable.model,
        bikeBrand: bikesTable.brand,
        bikeSerialNumber: bikesTable.serialNumber,
      })
        .from(rentalsTable)
        .leftJoin(bikesTable, eq(rentalsTable.bikeId, bikesTable.id))
        .where(and(eq(rentalsTable.contractId, input.id), isNull(rentalsTable.deletedAt)));
      const accChecklistRaw = await db.select({
        id: contractAccessories.id,
        accessoryId: contractAccessories.accessoryId,
        qty: contractAccessories.qty,
        status: contractAccessories.status,
        observacao: contractAccessories.observacao,
        fotoUrl: contractAccessories.fotoUrl,
        accessoryName: accessoriesTable.name,
        replacementValue: accessoriesTable.replacementValue,
        unitId: contractAccessories.unitId,
      })
        .from(contractAccessories)
        .leftJoin(accessoriesTable, eq(contractAccessories.accessoryId, accessoriesTable.id))
        .where(eq(contractAccessories.contractId, input.id));
      // Fetch serialNumber for each linked unit
      const accChecklist = await Promise.all(accChecklistRaw.map(async (ca) => {
        let serialNumber: string | null = null;
        if (ca.unitId) {
          const [unit] = await db.select({ serialNumber: accessoryUnits.serialNumber })
            .from(accessoryUnits).where(eq(accessoryUnits.id, ca.unitId));
          serialNumber = unit?.serialNumber ?? null;
        }
        return { ...ca, serialNumber };
      }));
      return { ...contract, rentals: linkedRentals, accessories: accChecklist };
    }),

  // Recalcula status do contrato manualmente
  updateStatus: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await recalcContractStatus(input.id);
      return { success: true };
    }),

  // Encerra contrato: atualiza checklist de acessórios e recalcula status
  close: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      accessories: z.array(z.object({
        id: z.number(),
        status: z.enum(["ok", "danificado", "perdido", "roubado"]),
        observacao: z.string().optional(),
        fotoUrl: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Update accessories checklist and sync unit status
      if (input.accessories && input.accessories.length > 0) {
        const { accessoryUnits } = await import("../drizzle/schema");
        for (const acc of input.accessories) {
          // Get the contract_accessory row to find linked unitId
          const [caRow] = await db.select().from(contractAccessories).where(eq(contractAccessories.id, acc.id)).limit(1);
          await db.update(contractAccessories)
            .set({
              status: acc.status,
              observacao: acc.observacao ?? null,
              fotoUrl: acc.fotoUrl ?? null,
            })
            .where(eq(contractAccessories.id, acc.id));
          // Sync accessory unit status
          if (caRow?.unitId) {
            let unitStatus: "disponivel" | "perdido" | "manutencao" | "roubado" = "disponivel";
            if (acc.status === "perdido") unitStatus = "perdido";
            else if (acc.status === "roubado") unitStatus = "roubado";
            else if (acc.status === "danificado") unitStatus = "manutencao";
            // else ok → disponivel
            await db.update(accessoryUnits).set({ status: unitStatus }).where(eq(accessoryUnits.id, caRow.unitId));
          }
        }
      }
      // Check for accessory pendencies
      const hasPendencia = (input.accessories ?? []).some(
        (acc) => acc.status !== "ok"
      );
      if (hasPendencia) {
        // Flag contract with pendencia_acessorio
        await db.update(contracts)
          .set({ pendenciaAcessorio: true })
          .where(eq(contracts.id, input.id));
        // Build human-readable list of pending accessories (with names via JOIN)
        const pendingIds = (input.accessories ?? [])
          .filter((a) => a.status !== "ok")
          .map((a) => a.id);
        const { accessories: accessoriesTable2 } = await import("../drizzle/schema");
        const { inArray: inArrayOp } = await import("drizzle-orm");
        const caRows = pendingIds.length > 0
          ? await db
              .select({
                caId: contractAccessories.id,
                accessoryId: contractAccessories.accessoryId,
                accessoryName: accessoriesTable2.name,
              })
              .from(contractAccessories)
              .leftJoin(accessoriesTable2, eq(contractAccessories.accessoryId, accessoriesTable2.id))
              .where(inArrayOp(contractAccessories.id, pendingIds))
          : [];
        const caNameMap = new Map(caRows.map((r) => [r.caId, r.accessoryName ?? `Acessório #${r.caId}`]));
        const pendentes = (input.accessories ?? [])
          .filter((a) => a.status !== "ok")
          .map((a) => {
            const nome = caNameMap.get(a.id) ?? `Acessório #${a.id}`;
            const obs = a.observacao ? ` — ${a.observacao}` : "";
            return `• ${nome}: ${a.status}${obs}`;
          })
          .join("\n");
        // Fetch client name for the WhatsApp message
        const [contractRow] = await db
          .select({ clientId: contracts.clientId })
          .from(contracts)
          .where(eq(contracts.id, input.id))
          .limit(1);
        let clientName = "—";
        if (contractRow?.clientId) {
          const { clients: clientsTable3 } = await import("../drizzle/schema");
          const [clientRow] = await db
            .select({ name: clientsTable3.name })
            .from(clientsTable3)
            .where(eq(clientsTable3.id, contractRow.clientId))
            .limit(1);
          if (clientRow?.name) clientName = clientRow.name;
        }
        // Notify via Manus notification
        await notifyOwner({
          title: `⚠️ Pendência de acessório — Contrato #${input.id}`,
          content: `Acessórios com problema ao encerrar o contrato #${input.id}:\n\n${pendentes}`,
        }).catch(() => {});
        // Notify via WhatsApp (Z-API) — fail silently if not configured
        try {
          const rawOwnerPhone = await getSetting("whatsapp_number");
          const ownerPhone = sanitizePhone(rawOwnerPhone) ?? rawOwnerPhone ?? undefined;
          if (ownerPhone) {
            const waMessage =
              `⚠️ Contrato #${input.id} encerrado com PENDÊNCIA de acessório.\n` +
              `Cliente: ${clientName}.\n` +
              `Verifique o checklist de devolução.\n\n` +
              `Itens pendentes:\n${pendentes}`;
            await sendWhatsApp({ text: waMessage, to: ownerPhone });
          }
        } catch {
          // Z-API not configured or unavailable — do not break contract closure
        }
      }
      // Mark all active/overdue bike rentals as returned (releases stock)
      {
        const activeRentals = await db
          .select({ id: rentalsTable.id })
          .from(rentalsTable)
          .where(
            and(
              eq(rentalsTable.contractId, input.id),
              isNull(rentalsTable.deletedAt),
              // status IN ('active','overdue')
              drizzleSql`${rentalsTable.status} IN ('active','overdue')`,
            )
          );
        for (const r of activeRentals) {
          await updateRental(r.id, { status: "returned", returnedAt: new Date() } as any);
        }
      }
      // Recalc status (may set to encerrado if all rentals returned)
      await recalcContractStatus(input.id);
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "encerrou_contrato", tabela: "contracts", registroId: input.id });
      return { success: true, hasPendencia };
    }),
  // Soft delete do contrato
  archive: adminAuthProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(contracts)
        .set({ deletedAt: new Date() })
        .where(eq(contracts.id, input.id));
      await createAuditLog({ adminId: (ctx as any).adminUser?.id ?? null, acao: "arquivou_contrato", tabela: "contracts", registroId: input.id });
      return { success: true };
    }),

  // Confirm presential payment: mark all rentals as paid, register revenue, activate bikes
  // Cria contrato manualmente pelo painel (admin)
  createManual: adminAuthProcedure
    .input(z.object({
      clientId: z.number(),
      bikes: z.array(z.object({
        bikeId: z.number(),
        bikeSizeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        quantity: z.number().min(1).default(1),
        dailyRate: z.string().optional(),
        totalAmount: z.string().optional(),
      })).min(1),
      accessories: z.array(z.object({
        accessoryId: z.number(),
        qty: z.number().min(1).default(1),
        variante: z.string().optional(),
        unitId: z.number().optional(),
      })).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Validate client is verified
      const [client] = await db.select({ id: clientsTable.id, status: clientsTable.status })
        .from(clientsTable)
        .where(eq(clientsTable.id, input.clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      if (client.status !== "verified")
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Apenas clientes verificados podem ter contratos criados manualmente." });

      // Validate availability for each bike size BEFORE creating anything (modelo derivado)
      {
        const { getSizeAvailability } = await import("./db");
        for (const b of input.bikes) {
          if (!b.bikeSizeId) continue;
          const available = await getSizeAvailability(b.bikeSizeId, b.startDate, b.endDate);
          if (b.quantity > available) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: `Quantidade indisponível para o tamanho selecionado. Disponível: ${available}.`,
            });
          }
        }
      }

      // Calculate total value from all bikes
      let totalValue = 0;
      for (const b of input.bikes) {
        if (b.totalAmount) totalValue += parseFloat(b.totalAmount);
      }

      // Create contract with status "pendente" (not yet paid)
      const [contract] = await db.insert(contracts).values({
        clientId: input.clientId,
        valorTotal: totalValue > 0 ? totalValue.toFixed(2) : null,
        status: "pendente",
      }).returning({ id: contracts.id });

      // Create one rental per bike entry with status "pending" (not yet active)
      const rentalIds: number[] = [];
      for (const b of input.bikes) {
        const rentalId = await createRental({
          clientId: input.clientId,
          bikeId: b.bikeId,
          bikeSizeId: b.bikeSizeId ?? null,
          quantity: b.quantity,
          startDate: b.startDate,
          endDate: b.endDate,
          dailyRate: b.dailyRate ?? null,
          totalAmount: b.totalAmount ?? null,
          paymentType: "presential",
          paymentStatus: "pending",
          status: "pending",
          source: "manual",
          contractId: contract.id,
          notes: input.notes ?? null,
        } as any);
        rentalIds.push(rentalId);
        // Note: Do NOT mark bike as rented or decrease availability here
        // Availability is derived and pending status reserves the stock
      }

      // Add accessories to contract_accessories and rental_accessories
      if (input.accessories && input.accessories.length > 0) {
        const { contractAccessories: caSchema } = await import("../drizzle/schema");
        for (const acc of input.accessories) {
          const accessory = await getAccessoryById(acc.accessoryId);
          // Link to first rental
          await createRentalAccessory({
            rentalId: rentalIds[0],
            accessoryId: acc.accessoryId,
            quantity: acc.qty,
            dailyRate: accessory?.dailyRate ?? null,
          } as any);
          // Link to contract
          await db.insert(caSchema).values({
            contractId: contract.id,
            accessoryId: acc.accessoryId,
            qty: acc.qty,
            unitId: acc.unitId ?? null,
            status: "ok",
          });
        }
      }

      await recalcContractStatus(contract.id);

      // ── Generate PDF ─────────────────────────────────────────────────────────
      let pdfUrl: string | null = null;
      try {
        const { generateContractPdf } = await import("./pdf");
        const { storagePut } = await import("./storage");
        const { contracts: cTablePdf, clients: clTablePdf, accessories: accTablePdf, contractAccessories: caTablePdf, accessoryUnits: auTablePdf } = await import("../drizzle/schema");
        const { eq: eqPdf, and: andPdf, isNull: isNullPdf } = await import("drizzle-orm");
        const [contractRow] = await db.select().from(cTablePdf).where(eqPdf(cTablePdf.id, contract.id));
        const [clientRow] = await db.select().from(clTablePdf).where(eqPdf(clTablePdf.id, input.clientId));
        const rentalsForPdf = await db.select({
          bikeId: rentalsTable.bikeId, startDate: rentalsTable.startDate, endDate: rentalsTable.endDate,
          totalAmount: rentalsTable.totalAmount,
        }).from(rentalsTable).where(andPdf(eqPdf(rentalsTable.contractId, contract.id), isNullPdf(rentalsTable.deletedAt)));
        const { bikes: bikesTpdf } = await import("../drizzle/schema");
        const rentalsWithBike = await Promise.all(rentalsForPdf.map(async (r) => {
          const [bike] = r.bikeId ? await db.select({ model: bikesTpdf.model, brand: bikesTpdf.brand, serialNumber: bikesTpdf.serialNumber }).from(bikesTpdf).where(eqPdf(bikesTpdf.id, r.bikeId)) : [null];
          return { ...r, bikeModel: bike?.model, bikeBrand: bike?.brand, bikeSerialNumber: bike?.serialNumber };
        }));
        const caRowsPdf = await db.select({
          accessoryId: caTablePdf.accessoryId, qty: caTablePdf.qty, unitId: caTablePdf.unitId,
          accessoryName: accTablePdf.name,
        }).from(caTablePdf).leftJoin(accTablePdf, eqPdf(caTablePdf.accessoryId, accTablePdf.id)).where(eqPdf(caTablePdf.contractId, contract.id));
        const accWithSerial = await Promise.all(caRowsPdf.map(async (ca) => {
          let serialNumber: string | null = null;
          if (ca.unitId) {
            const [unit] = await db.select({ serialNumber: auTablePdf.serialNumber }).from(auTablePdf).where(eqPdf(auTablePdf.id, ca.unitId));
            serialNumber = unit?.serialNumber ?? null;
          }
          return { accessoryName: ca.accessoryName, qty: ca.qty, serialNumber };
        }));
        const pdfBuffer = await generateContractPdf({
          contractId: contract.id,
          clientName: clientRow?.name ?? "—",
          clientCpf: clientRow?.cpf ?? null,
          clientPhone: clientRow?.phone ?? null,
          clientEmail: clientRow?.email ?? null,
          criadoEm: contractRow?.criadoEm ?? new Date(),
          valorTotal: contractRow?.valorTotal ?? null,
          rentals: rentalsWithBike,
          accessories: accWithSerial,
        });
        const suffix = Date.now().toString(36);
        const { url: pdfS3Url } = await storagePut(`contracts/contrato-${contract.id}-${suffix}.pdf`, pdfBuffer, "application/pdf");
        pdfUrl = pdfS3Url;
        const { contracts: cTableUpd } = await import("../drizzle/schema");
        await db.update(cTableUpd).set({ pdfUrl: pdfS3Url }).where(eqPdf(cTableUpd.id, contract.id));
      } catch (pdfErr) { console.warn("[createManual] PDF generation error:", pdfErr); }

      // ── Send email & WhatsApp notifications ──────────────────────────────────
      try {
        const [companyName, companyEmail2, companyPhone2, logoUrl, whatsappNumber] = await Promise.all([
          getSetting("company_name"),
          getSetting("company_email"),
          getSetting("company_phone"),
          getSetting("logo_url"),
          getSetting("whatsapp_number"),
        ]);
        const { clients: clientsSchemaEmail } = await import("../drizzle/schema");
        const { eq: eqEmail } = await import("drizzle-orm");
        const [clientForEmail] = await db.select({ name: clientsSchemaEmail.name, email: clientsSchemaEmail.email, phone: clientsSchemaEmail.phone })
          .from(clientsSchemaEmail)
          .where(eqEmail(clientsSchemaEmail.id, input.clientId));
        // Build email items from bikeEntries
        const emailItems = await Promise.all(input.bikes.map(async (b) => {
          const bike = await getBikeById(b.bikeId);
          return {
            bikeModel: bike?.model || "N/A",
            bikeBrand: bike?.brand || undefined,
            startDate: b.startDate,
            endDate: b.endDate,
            deliveryTime: undefined as string | undefined,
            totalAmount: b.totalAmount ?? "0.00",
          };
        }));
        const accessoryNames: string[] = [];
        if (input.accessories && input.accessories.length > 0) {
          for (const acc of input.accessories) {
            const accessory = await getAccessoryById(acc.accessoryId);
            if (accessory?.name) {
              const varianteSuffix = acc.variante ? ` (${acc.variante})` : "";
              accessoryNames.push(`${accessory.name}${varianteSuffix} ×${acc.qty}`);
            }
          }
        }
        const grandTotalEmail = input.bikes.reduce((s, b) => s + parseFloat(b.totalAmount ?? "0"), 0);
        const professionalEmailHtml = buildProfessionalReservationEmail({
          clientName: clientForEmail?.name ?? "Cliente",
          cartItems: emailItems,
          accessories: accessoryNames,
          grandTotal: grandTotalEmail.toFixed(2),
          paymentMethod: "presential",
          companyName: companyName || "Bike To Go",
          companyEmail: companyEmail2 || undefined,
          companyPhone: companyPhone2 || undefined,
          logoUrl: logoUrl || undefined,
        });
        if (clientForEmail?.email) {
          await sendEmail({
            to: clientForEmail.email,
            subject: `Contrato #${contract.id} criado — ${companyName || "Bike To Go"}`,
            html: professionalEmailHtml,
          });
        }
        // Copy to company_email
        const ownerCopyEmail = companyEmail2 || await getSetting("notification_email");
        if (ownerCopyEmail && ownerCopyEmail !== clientForEmail?.email) {
          const contractPath = `/contratos?contractId=${contract.id}`;
          const ownerHtml = professionalEmailHtml.replace(
            "</body>",
            `<div style="max-width:620px;margin:0 auto;padding:0 16px 24px;"><div style="padding:12px 16px;background:#1a0a0a;border-left:3px solid #e74c3c;border-radius:4px;"><p style="margin:0;font-size:13px;color:#e74c3c;"><strong>Nota para o admin:</strong> Contrato criado manualmente. Acesse: <a href="${contractPath}" style="color:#C8920A;">${contractPath}</a></p></div></div></body>`
          );
          await sendEmail({ to: ownerCopyEmail, subject: `⚠️ Contrato Manual #${contract.id} — ${clientForEmail?.name ?? "Cliente"} | ${companyName || "Bike To Go"}`, html: ownerHtml });
        }
        // WhatsApp to owner
        if (whatsappNumber) {
          const sanitized = sanitizePhone(whatsappNumber);
          if (sanitized) {
            const bikeSummaryWa = input.bikes.map((b) => `Bike #${b.bikeId}`).join(", ");
            await sendWhatsApp({
              to: sanitized,
              text: `📋 Contrato #${contract.id} criado manualmente pelo admin.\nCliente: ${clientForEmail?.name ?? "—"}\nBikes: ${bikeSummaryWa}\nTotal: R$ ${grandTotalEmail.toFixed(2)}`,
            });
          }
        }
      } catch (notifErr) { console.warn("[createManual] Notification error:", notifErr); }

      await createAuditLog({
        adminId: (ctx as any).adminUser?.id ?? null,
        acao: "criou_contrato_manual",
        tabela: "contracts",
        registroId: contract.id,
        dadosDepois: { clientId: input.clientId, bikes: input.bikes.length, accessories: input.accessories?.length ?? 0 },
      });

      return { id: contract.id };
    }),

  // Update contract: only allowed if status is "pendente"
  update: adminOnlyProcedure
    .input(z.object({
      id: z.number(),
      clientId: z.number(),
      notes: z.string().optional(),
      bikes: z.array(z.object({
        rentalId: z.number().optional(), // present for existing rentals (ativo/parcial mode)
        bikeId: z.number(),
        bikeSizeId: z.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        quantity: z.number().min(1).default(1),
        dailyRate: z.string().optional(),
        totalAmount: z.string().optional(),
      })).min(1),
      accessories: z.array(z.object({
        accessoryId: z.number(),
        qty: z.number().min(1).default(1),
        variante: z.string().optional(),
        unitId: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify contract exists and is editable
      const [contract] = await db.select().from(contracts).where(eq(contracts.id, input.id));
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado." });
      const editableStatuses = ["pendente", "ativo", "parcialmente_devolvido"];
      if (!editableStatuses.includes(contract.status ?? ""))
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Apenas contratos pendentes, ativos ou parcialmente devolvidos podem ser editados." });

      const isPendente = contract.status === "pendente";

      // ─── RAMO PENDENTE: substituição total (comportamento original) ───────────
      if (isPendente) {
        // Validate availability for each bike size, EXCLUDING current rentals of this contract
        {
          const { getSizeAvailability } = await import("./db");
          for (const b of input.bikes) {
            if (!b.bikeSizeId) continue;
            const available = await getSizeAvailability(b.bikeSizeId, b.startDate, b.endDate, undefined, input.id);
            if (b.quantity > available) {
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: `Quantidade indisponível para o tamanho selecionado. Disponível: ${available}.`,
              });
            }
          }
        }

        // Recalculate total value
        let totalValue = 0;
        for (const b of input.bikes) {
          if (b.totalAmount) totalValue += parseFloat(b.totalAmount);
        }

        // Update contract header
        await db.update(contracts)
          .set({ clientId: input.clientId, valorTotal: totalValue > 0 ? totalValue.toFixed(2) : null })
          .where(eq(contracts.id, input.id));

        // Soft-delete all current rentals for this contract
        await db.update(rentalsTable)
          .set({ deletedAt: new Date() })
          .where(and(eq(rentalsTable.contractId, input.id), isNull(rentalsTable.deletedAt)));

        // Recreate rentals from input.bikes
        for (const b of input.bikes) {
          await createRental({
            clientId: input.clientId,
            bikeId: b.bikeId,
            bikeSizeId: b.bikeSizeId ?? null,
            quantity: b.quantity,
            startDate: b.startDate,
            endDate: b.endDate,
            dailyRate: b.dailyRate ?? null,
            totalAmount: b.totalAmount ?? null,
            paymentType: "presential",
            paymentStatus: "pending",
            status: "pending",
            source: "manual",
            contractId: input.id,
            notes: input.notes ?? null,
          } as any);
        }

        // Reconcile accessories: delete old contract_accessories, recreate
        await db.delete(contractAccessories).where(eq(contractAccessories.contractId, input.id));
        if (input.accessories && input.accessories.length > 0) {
          const newRentals = await db.select({ id: rentalsTable.id })
            .from(rentalsTable)
            .where(and(eq(rentalsTable.contractId, input.id), isNull(rentalsTable.deletedAt)))
            .limit(1);
          const firstRentalId = newRentals[0]?.id;
          for (const acc of input.accessories) {
            const accessory = await getAccessoryById(acc.accessoryId);
            if (firstRentalId) {
              await createRentalAccessory({
                rentalId: firstRentalId,
                accessoryId: acc.accessoryId,
                quantity: acc.qty,
                dailyRate: accessory?.dailyRate ?? null,
              } as any);
            }
            await db.insert(contractAccessories).values({
              contractId: input.id,
              accessoryId: acc.accessoryId,
              qty: acc.qty,
              unitId: acc.unitId ?? null,
              status: "ok",
            });
          }
        }

        await createAuditLog({
          adminId: (ctx as any).adminUser?.id ?? null,
          acao: "editou_contrato_pendente",
          tabela: "contracts",
          registroId: input.id,
          dadosDepois: { clientId: input.clientId, bikes: input.bikes.length, accessories: input.accessories?.length ?? 0 },
        });

        return { id: input.id };
      }

      // ─── RAMO ATIVO / PARCIALMENTE DEVOLVIDO: modelo de diferença ────────────
      // oldTotal for financial delta
      const oldTotal = parseFloat(contract.valorTotal ?? "0");
      const newTotal = input.bikes.reduce((s, b) => s + parseFloat(b.totalAmount ?? "0"), 0);

      // Fetch current non-deleted rentals for this contract
      const currentRentals = await db.select()
        .from(rentalsTable)
        .where(and(eq(rentalsTable.contractId, input.id), isNull(rentalsTable.deletedAt)));

      const inputRentalIds = new Set(input.bikes.filter(b => b.rentalId).map(b => b.rentalId!));

      // Soft-delete rentals NOT present in input (user removed them)
      for (const r of currentRentals) {
        if (!inputRentalIds.has(r.id)) {
          await db.update(rentalsTable)
            .set({ deletedAt: new Date() })
            .where(eq(rentalsTable.id, r.id));
        }
      }

      // UPDATE existing rentals / INSERT new ones
      for (const b of input.bikes) {
        if (b.rentalId) {
          // UPDATE existing rental (preserve status — do NOT change 'returned')
          await db.update(rentalsTable)
            .set({
              startDate: b.startDate,
              endDate: b.endDate,
              totalAmount: b.totalAmount ?? null,
              dailyRate: b.dailyRate ?? null,
            })
            .where(and(eq(rentalsTable.id, b.rentalId), isNull(rentalsTable.deletedAt)));
        } else {
          // INSERT new rental (ativo, paid)
          await createRental({
            clientId: input.clientId,
            bikeId: b.bikeId,
            bikeSizeId: b.bikeSizeId ?? null,
            quantity: b.quantity,
            startDate: b.startDate,
            endDate: b.endDate,
            dailyRate: b.dailyRate ?? null,
            totalAmount: b.totalAmount ?? null,
            paymentType: "presential",
            paymentStatus: "paid",
            status: "active",
            source: "manual",
            contractId: input.id,
            notes: input.notes ?? null,
          } as any);
        }
      }

      // Update contract header with new total
      await db.update(contracts)
        .set({ clientId: input.clientId, valorTotal: newTotal > 0 ? newTotal.toFixed(2) : null })
        .where(eq(contracts.id, input.id));

      // Financial adjustment (delta)
      try {
        const delta = newTotal - oldTotal;
        if (Math.abs(delta) > 0.001) {
          const today = new Date().toISOString().split("T")[0];
          await createRevenue({
            categoryId: 1,
            description: `Ajuste — Contrato #${input.id} (edição)`,
            amount: delta.toFixed(2),
            date: today,
          } as any);
        }
      } catch (err) { console.warn("[contracts.update] Revenue adjustment error:", err); }

      // Regenerate PDF (non-blocking)
      try {
        const { generateContractPdf } = await import("./pdf");
        const { storagePut } = await import("./storage");
        const { contracts: cTable2, clients: clTable2, accessories: accTable2, contractAccessories: caTable3, accessoryUnits: auTable3 } = await import("../drizzle/schema");
        const { eq: eqPdf, and: andPdf, isNull: isNullPdf } = await import("drizzle-orm");
        const [contractRow] = await db.select().from(cTable2).where(eqPdf(cTable2.id, input.id));
        const [clientRow] = contractRow?.clientId
          ? await db.select().from(clTable2).where(eqPdf(clTable2.id, contractRow.clientId))
          : [null];
        const rentalsForPdf = await db.select({
          bikeId: rentalsTable.bikeId, startDate: rentalsTable.startDate, endDate: rentalsTable.endDate,
          totalAmount: rentalsTable.totalAmount,
        }).from(rentalsTable).where(andPdf(eqPdf(rentalsTable.contractId, input.id), isNullPdf(rentalsTable.deletedAt)));
        const { bikes: bikesT } = await import("../drizzle/schema");
        const rentalsWithBike = await Promise.all(rentalsForPdf.map(async (r) => {
          const [bike] = r.bikeId ? await db.select({ model: bikesT.model, brand: bikesT.brand, serialNumber: bikesT.serialNumber }).from(bikesT).where(eqPdf(bikesT.id, r.bikeId)) : [null];
          return { ...r, bikeModel: bike?.model, bikeBrand: bike?.brand, bikeSerialNumber: bike?.serialNumber };
        }));
        const caRows3 = await db.select({
          accessoryId: caTable3.accessoryId, qty: caTable3.qty, unitId: caTable3.unitId,
          accessoryName: accTable2.name,
        }).from(caTable3).leftJoin(accTable2, eqPdf(caTable3.accessoryId, accTable2.id)).where(eqPdf(caTable3.contractId, input.id));
        const accWithSerial = await Promise.all(caRows3.map(async (ca) => {
          let serialNumber: string | null = null;
          if (ca.unitId) {
            const [unit] = await db.select({ serialNumber: auTable3.serialNumber }).from(auTable3).where(eqPdf(auTable3.id, ca.unitId));
            serialNumber = unit?.serialNumber ?? null;
          }
          return { accessoryName: ca.accessoryName, qty: ca.qty, serialNumber };
        }));
        const pdfBuffer = await generateContractPdf({
          contractId: input.id,
          clientName: clientRow?.name ?? "—",
          clientCpf: clientRow?.cpf ?? null,
          clientPhone: clientRow?.phone ?? null,
          clientEmail: clientRow?.email ?? null,
          criadoEm: contractRow?.criadoEm ?? new Date(),
          valorTotal: contractRow?.valorTotal ?? null,
          rentals: rentalsWithBike,
          accessories: accWithSerial,
        });
        const suffix = Date.now().toString(36);
        const { url } = await storagePut(`contracts/contrato-${input.id}-${suffix}.pdf`, pdfBuffer, "application/pdf");
        await db.update(cTable2).set({ pdfUrl: url }).where(eqPdf(cTable2.id, input.id));
      } catch (err) { console.warn("[contracts.update] PDF regeneration error:", err); }

      await createAuditLog({
        adminId: (ctx as any).adminUser?.id ?? null,
        acao: "editou_contrato_ativo",
        tabela: "contracts",
        registroId: input.id,
        dadosDepois: { clientId: input.clientId, bikes: input.bikes.length, oldTotal, newTotal },
      });

      return { id: input.id };
    }),

  // Cancel contract: only allowed if status is "pendente"
  cancel: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      
      // Get contract and verify it's in "pendente" status
      const [contract] = await db.select()
        .from(contracts)
        .where(eq(contracts.id, input.id));
      if (!contract)
        throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado." });
      if (contract.status !== "pendente")
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Apenas contratos em status 'pendente' podem ser cancelados." });
      
      // Cancel contract
      await db.update(contracts)
        .set({ status: "cancelado" })
        .where(eq(contracts.id, input.id));
      
      // Cancel all pending rentals for this contract
      await db.update(rentalsTable)
        .set({ status: "cancelled" })
        .where(and(eq(rentalsTable.contractId, input.id), isNull(rentalsTable.deletedAt)));
      
      await createAuditLog({
        adminId: (ctx as any).adminUser?.id ?? null,
        acao: "cancelou_contrato",
        tabela: "contracts",
        registroId: input.id,
      });
      
      return { success: true };
    }),

  confirmPayment: adminOnlyProcedure
    .input(z.object({ contractId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      
      // Get contract and verify it's in "pendente" status
      const [contract] = await db.select()
        .from(contracts)
        .where(eq(contracts.id, input.contractId));
      if (!contract)
        throw new TRPCError({ code: "NOT_FOUND", message: "Contrato não encontrado." });
      if (contract.status !== "pendente")
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Contrato deve estar em status 'pendente' para confirmar pagamento." });
      
      // Get all pending rentals for this contract
      const contractRentals = await db.select()
        .from(rentalsTable)
        .where(and(eq(rentalsTable.contractId, input.contractId), isNull(rentalsTable.deletedAt)));
      if (contractRentals.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum aluguel encontrado para este contrato." });
      
      // Mark all rentals as paid and transition from pending to active
      await db.update(rentalsTable)
        .set({ paymentStatus: "paid", status: "active" })
        .where(and(eq(rentalsTable.contractId, input.contractId), isNull(rentalsTable.deletedAt)));
      
      // Transition contract from "pendente" to "ativo"
      await db.update(contracts)
        .set({ status: "ativo" })
        .where(eq(contracts.id, input.contractId));
      
      // Register revenue in financial module
      try {
        const today = new Date().toISOString().split("T")[0];
        const totalAmt = contractRentals.reduce((sum, r) => sum + parseFloat(r.totalAmount || "0"), 0);
        if (totalAmt > 0) {
          await createRevenue({
            categoryId: 1,
            description: `Pagamento presencial — Contrato #${input.contractId}`,
            amount: totalAmt.toFixed(2),
            date: today,
          } as any);
        }
      } catch (err) { console.warn("[confirmPayment] Revenue error:", err); }
      
      await createAuditLog({
        adminId: (ctx as any).adminUser?.id ?? null,
        acao: "confirmou_pagamento_presencial",
        tabela: "contracts",
        registroId: input.contractId,
      });
      return { success: true, paid: contractRentals.length };
    }),
});

// ─── App router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  clients: clientsRouter,
  bikes: bikesRouter,
  rentals: rentalsRouter,
  accessories: accessoriesRouter,
  financial: financialRouter,
  settings: settingsRouter,
  publicApi: publicApiRouter,
  dashboard: dashboardRouter,
  contracts: contractsRouter,
  auditLogs: auditLogsRouter,
});

export type AppRouter = typeof appRouter;
