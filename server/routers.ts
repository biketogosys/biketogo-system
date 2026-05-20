import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sanitize, sanitizeDate, sanitizeDateString, sanitizeNumeric } from "./_core/utils";
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
import { sendWhatsApp, buildOwnerReservationMessage } from "./whatsapp";
import { createStripeCheckout } from "./stripe";
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
      tipoDocumento: z.enum(["cpf", "passaporte"]).optional(),
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
      tipoDocumento: z.enum(["cpf", "passaporte"]).optional(),
      numeroPassaporte: z.string().max(50).optional(),
      complement: z.string().optional(),
      lgpdConsent: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      validarDocumentoCliente({
        nacionalidade: data.nacionalidade,
        cpf: data.cpf,
        rg: data.rg,
        tipoDocumento: data.tipoDocumento,
        numeroPassaporte: data.numeroPassaporte,
      });
      const sanitized: any = {
        ...data,
        cpf: sanitize(data.cpf),
        rg: sanitize(data.rg),
        birthDate: sanitize(data.birthDate),
        gender: sanitize(data.gender),
        height: sanitize(data.height),
        pedalFrequency: sanitize(data.pedalFrequency),
        origin: sanitize(data.origin),
        phone: sanitize(data.phone),
        email: sanitize(data.email),
        instagram: sanitize(data.instagram),
        accommodation: sanitize(data.accommodation),
        zipCode: sanitize(data.zipCode),
        street: sanitize(data.street),
        number: sanitize(data.number),
        neighborhood: sanitize(data.neighborhood),
        city: sanitize(data.city),
        state: sanitize(data.state),
        country: sanitize(data.country),
        notes: sanitize(data.notes),
        nacionalidade: sanitize(data.nacionalidade),
        tipoDocumento: sanitize(data.tipoDocumento),
        numeroPassaporte: sanitize(data.numeroPassaporte),
        complement: sanitize(data.complement),
        ...(data.lgpdConsent !== undefined ? {
          lgpdConsent: data.lgpdConsent,
          lgpdConsentAt: data.lgpdConsent ? new Date() : null,
        } : {}),
      };
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
      status: z.enum(["available", "rented", "maintenance"]).optional(),
      search: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(({ input }) => getBikes(input)),

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

  // Check availability for a date range
  checkAvailability: publicProcedure
    .input(z.object({
      bikeId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(({ input }) => checkBikeAvailability(input.bikeId, input.startDate, input.endDate)),
  // ─── Bike Sizes ──────────────────────────────────────────────────────────
  listSizes: adminAuthProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(async ({ input }) => {
      const { bikeSizes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      return db.select().from(bikeSizes).where(eq(bikeSizes.bikeId, input.bikeId));
    }),
  addSize: adminAuthProcedure
    .input(z.object({
      bikeId: z.number(),
      tamanho: z.string().min(1),
      quantidadeTotal: z.number().min(1).default(1),
      quantidadeDisponivel: z.number().min(0).default(1),
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
        quantidadeDisponivel: input.quantidadeDisponivel,
        observacao: sanitize(input.observacao) as string | null,
      }).returning();
      return row;
    }),
  updateSize: adminAuthProcedure
    .input(z.object({
      id: z.number(),
      tamanho: z.string().optional(),
      quantidadeTotal: z.number().optional(),
      quantidadeDisponivel: z.number().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeSizes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(bikeSizes).set({
        ...data,
        observacao: sanitize(data.observacao) as string | null,
      }).where(eq(bikeSizes.id, id));
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
      descricao: z.string().min(1),
      custo: z.string().optional(),
      dataEntrada: z.string().optional(),
      dataPrevistaRetorno: z.string().optional(),
      status: z.enum(["em_andamento", "concluida"]).default("em_andamento"),
      fotos: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { bikeMaintenanceLogs, bikes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.insert(bikeMaintenanceLogs).values({
        bikeId: input.bikeId,
        descricao: input.descricao,
        custo: sanitize(input.custo) as string | null,
        dataEntrada: input.dataEntrada ? new Date(input.dataEntrada) : new Date(),
        dataPrevistaRetorno: input.dataPrevistaRetorno ? new Date(input.dataPrevistaRetorno) : null,
        status: input.status,
        fotos: input.fotos ?? null,
      }).returning();
      if (input.status === "em_andamento") {
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
      const { bikeMaintenanceLogs, bikes } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, bikeId, ...data } = input;
      await db.update(bikeMaintenanceLogs).set({
        ...(data.descricao !== undefined ? { descricao: data.descricao } : {}),
        custo: data.custo !== undefined ? (sanitize(data.custo) as string | null) : undefined,
        dataPrevistaRetorno: data.dataPrevistaRetorno ? new Date(data.dataPrevistaRetorno) : undefined,
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.fotos !== undefined ? { fotos: data.fotos } : {}),
        updatedAt: new Date(),
      }).where(eq(bikeMaintenanceLogs.id, id));
      if (data.status === "concluida") {
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
});

// ─── Rentals router ───────────────────────────────────────────────────────────
const rentalsRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      clientId: z.number().optional(),
      bikeId: z.number().optional(),
      status: z.enum(["active", "returned", "overdue", "cancelled"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      const result = await getRentals({ ...input, offset });
      const totalPages = Math.ceil(result.total / input.limit);
      return { ...result, page: input.page, totalPages };
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
      status: z.enum(["active", "returned", "overdue", "cancelled"]).optional(),
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
      return { success: true };
    }),
});

// ─── Accessories router ─────────────────────────────────────────────────────
const accessoriesRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      status: z.enum(["available", "rented", "maintenance", "lost"]).optional(),
      search: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const items = await getAccessories(input);
      // Calculate quantidadeDisponivel in real time based on active rentals
      const db = await (await import("./db")).getDb();
      if (!db) return items;
      const { rentalAccessories: ra, rentals: rt } = await import("../drizzle/schema");
      const { eq, inArray, and: andOp } = await import("drizzle-orm");
      const ids = items.map((i) => i.id);
      if (ids.length === 0) return items;
      const activeUsage = await db
        .select({ accessoryId: ra.accessoryId, qty: ra.quantity })
        .from(ra)
        .innerJoin(rt, eq(ra.rentalId, rt.id))
        .where(andOp(inArray(ra.accessoryId, ids), inArray(rt.status, ["active", "overdue"])));
      const usageMap: Record<number, number> = {};
      for (const row of activeUsage) {
        usageMap[row.accessoryId] = (usageMap[row.accessoryId] ?? 0) + (row.qty ?? 1);
      }
      return items.map((item) => ({
        ...item,
        quantidadeDisponivel: Math.max(0, (item.quantidadeTotal ?? item.quantity) - (usageMap[item.id] ?? 0)),
      }));
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
      quantity: z.number().min(1).default(1),
      dailyRate: z.string().optional(),
      purchasePrice: z.string().optional(),
      status: z.enum(["available", "rented", "maintenance", "lost"]).default("available"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const sanitizedAcc: any = {
        ...input,
        description: sanitize(input.description),
        category: sanitize(input.category),
        serialNumber: sanitize(input.serialNumber),
        dailyRate: sanitizeNumeric(input.dailyRate),
        purchasePrice: sanitizeNumeric(input.purchasePrice),
        notes: sanitize(input.notes),
      };
      const id = await createAccessory(sanitizedAcc);
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
      status: z.enum(["available", "rented", "maintenance", "lost"]).optional(),
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
        notes: data.notes !== undefined ? sanitize(data.notes) : undefined,
      };
      await updateAccessory(id, sanitizedAcc);
      return { success: true };
    }),

  delete: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAccessory(input.id);
      return { success: true };
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
      await setSetting(input.key, input.value);
      return { success: true };
    }),
});

// ─── Public API (for Shopify integration) ────────────────────────────────────
const publicApiRouter = router({
  // Get available bikes for the public form
  availableBikes: publicProcedure.query(async () => {
    const allBikes = await getBikes();
    return allBikes.map((b) => ({
      id: b.id,
      model: b.model,
      brand: (b as any).brand || null,
      category: (b as any).category || null,
      size: b.size,
      sizes: (b as any).sizes || null,
      dailyRate: (b as any).dailyRate || null,
      photoUrl: (b as any).photoUrl || null,
      status: b.status,
      description: (b as any).description || null,
      weight: (b as any).weight || null,
      weightLimit: (b as any).weightLimit || null,
    }));
  }),

  // Get discount rules for a bike
  bikeDiscountRules: publicProcedure
    .input(z.object({ bikeId: z.number() }))
    .query(({ input }) => getBikeDiscountRules(input.bikeId)),

  // Check bike availability for dates
  checkAvailability: publicProcedure
    .input(z.object({
      bikeId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(({ input }) => checkBikeAvailability(input.bikeId, input.startDate, input.endDate)),

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
          .where(andOp(inArray(ra.accessoryId, ids), inArray(rt.status, ["active", "overdue"])));
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

  // Submit reservation from Shopify
  submitReservation: publicProcedure
    .input(z.object({
      // Client data
      name: z.string().min(2),
      cpf: z.string().optional(),
      rg: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.string().optional(),
      height: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      instagram: z.string().optional(),
      accommodation: z.string().optional(),
      // Address
      zipCode: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      // Profile
      docOrigin: z.string().optional(),
      pedalFreq: z.string().optional(),
      howFound: z.string().optional(),
      lgpdConsent: z.boolean().optional(),
      // Rental data
      bikeId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      deliveryTime: z.string().optional(),
      totalAmount: z.string().optional(),
      discountPercent: z.string().optional(),
      deliveryFee: z.string().optional(),
      paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "stripe", "other"]).optional(),
      notes: z.string().optional(),
      // Accessories
      accessories: z.array(z.object({
        accessoryId: z.number(),
        quantity: z.number().min(1).default(1),
      })).optional(),
      // API key for security
      apiKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Verify API key
      const storedKey = await getSetting("shopify_api_key");
      if (storedKey && input.apiKey !== storedKey) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Chave de API inválida." });
      }
      // Validate CPF and RG
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
      // Check bike availability
      const available = await checkBikeAvailability(input.bikeId, input.startDate, input.endDate);
      if (!available) {
        throw new TRPCError({ code: "CONFLICT", message: "Bicicleta não disponível para o período selecionado." });
      }

      // Create client
      const clientId = await createClient({
        name: input.name,
        cpf: sanitize(input.cpf) as string | null,
        rg: sanitize(input.rg) as string | null,
        birthDate: sanitize(input.birthDate) as string | null,
        gender: sanitize(input.gender) as string | null,
        height: sanitize(input.height) as string | null,
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
        source: "shopify",
        status: "lead",
      } as any);

      // Create rental
      const rentalId = await createRental({
        clientId,
        bikeId: input.bikeId,
        startDate: sanitizeDateString(input.startDate) as string,
        endDate: sanitizeDateString(input.endDate),
        deliveryTime: sanitize(input.deliveryTime) as string | null,
        totalAmount: sanitizeNumeric(input.totalAmount),
        discountPercent: sanitizeNumeric(input.discountPercent),
        deliveryFee: sanitizeNumeric(input.deliveryFee),
        paymentMethod: input.paymentMethod || null,
        paymentStatus: "pending",
        status: "active",
        source: "shopify",
        notes: sanitize(input.notes) as string | null,
      } as any);

      // Mark bike as rented
      await updateBike(input.bikeId, { status: "rented" });

      // Add accessories
      if (input.accessories && input.accessories.length > 0) {
        for (const acc of input.accessories) {
          const accessory = await getAccessoryById(acc.accessoryId);
          await createRentalAccessory({
            rentalId,
            accessoryId: acc.accessoryId,
            quantity: acc.quantity,
            dailyRate: accessory?.dailyRate || null,
          } as any);
        }
      }

      // Notify owner via all channels
      try {
        const bike = await getBikeById(input.bikeId);
        const bikeModel = bike?.model || "N/A";

        // 1. Manus built-in notification
        await notifyOwner({
          title: "Nova Reserva pelo Site!",
          content: `Cliente: ${input.name}\nBike: ${bikeModel}\nPeríodo: ${input.startDate} a ${input.endDate}\nValor: R$ ${input.totalAmount || "N/A"}\nPagamento: ${input.paymentMethod || "N/A"}`,
        });

        // 2. WhatsApp notification to owner
        const waMessage = buildOwnerReservationMessage({
          clientName: input.name,
          clientPhone: input.phone,
          bikeModel,
          startDate: input.startDate,
          endDate: input.endDate,
          deliveryTime: input.deliveryTime,
          totalAmount: input.totalAmount,
        });
        await sendWhatsApp({ text: waMessage });

        // 3. Email confirmation to client
        if (input.email) {
          const emailHtml = buildReservationEmailHtml({
            clientName: input.name,
            bikeModel,
            startDate: input.startDate,
            endDate: input.endDate,
            deliveryTime: input.deliveryTime,
            totalAmount: input.totalAmount,
          });
          await sendEmail({
            to: input.email,
            subject: `Reserva Confirmada — ${bikeModel} | Bike To Go`,
            html: emailHtml,
          });
        }
      } catch (err) {
        console.warn("[Notification] Error sending notifications:", err);
      }

      return { clientId, rentalId, success: true };
    }),

  // ─── Create Stripe Checkout Session ────────────────────────────────────────
  createCheckout: publicProcedure
    .input(z.object({
      rentalId: z.number(),
      clientId: z.number(),
      clientName: z.string(),
      clientEmail: z.string().optional(),
      bikeModel: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      totalAmountBRL: z.number(),
      paymentType: z.enum(["card", "pix"]),
      origin: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await createStripeCheckout({
        rentalId: input.rentalId,
        clientId: input.clientId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        bikeModel: input.bikeModel,
        startDate: input.startDate,
        endDate: input.endDate,
        totalAmountBRL: input.totalAmountBRL,
        paymentType: input.paymentType,
        origin: input.origin,
      });
      return result;
    }),

  // ─── Upload document photo (base64) ────────────────────────────────────────
  uploadDocument: publicProcedure
    .input(z.object({
      clientId: z.number(),
      side: z.enum(["front", "back"]),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import("./storage");
      const base64Data = input.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `clients/${input.clientId}/doc-${input.side}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const field = input.side === "front" ? "docFrontUrl" : "docBackUrl";
      await updateClient(input.clientId, { [field]: url } as any);
      return { url };
    }),
});

// ─── Dashboard router ────────────────────────────────────────────────────────
const dashboardRouter = router({
  summary: adminAuthProcedure.query(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const [clientStats, bikeStats, rentalStats, financialReport] = await Promise.all([
      getClientStats(),
      getBikeStats(),
      getRentalStats(),
      getFinancialReport(fmt(startOfMonth), fmt(endOfMonth)),
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

  weeklyRevenue: adminAuthProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { rentals: rentalsSchema, expenses: expensesSchema, revenues: revenuesSchema } = await import("../drizzle/schema");
    const { between, isNotNull, gte: gteOp, lte: lteOp } = await import("drizzle-orm");
    const weeks: { week: string; receitaAlugueis: number; receitasExtras: number; despesas: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];
      const [rentalRows, revenueRows, expenseRows] = await Promise.all([
        db.select({ total: rentalsSchema.totalAmount })
          .from(rentalsSchema)
          .where(and(isNotNull(rentalsSchema.returnedAt), between(rentalsSchema.returnedAt, start, end))),
        db.select({ total: revenuesSchema.amount })
          .from(revenuesSchema)
          .where(and(gteOp(revenuesSchema.date, startStr), lteOp(revenuesSchema.date, endStr))),
        db.select({ total: expensesSchema.amount })
          .from(expensesSchema)
          .where(and(gteOp(expensesSchema.date, startStr), lteOp(expensesSchema.date, endStr))),
      ]);
      const label = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      weeks.push({
        week: label,
        receitaAlugueis: Math.round(rentalRows.reduce((a, r) => a + parseFloat(r.total ?? "0"), 0) * 100) / 100,
        receitasExtras: Math.round(revenueRows.reduce((a, r) => a + parseFloat(r.total ?? "0"), 0) * 100) / 100,
        despesas: Math.round(expenseRows.reduce((a, r) => a + parseFloat(r.total ?? "0"), 0) * 100) / 100,
      });
    }
    return weeks;
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
      const accChecklist = await db.select({
        id: contractAccessories.id,
        accessoryId: contractAccessories.accessoryId,
        qty: contractAccessories.qty,
        status: contractAccessories.status,
        observacao: contractAccessories.observacao,
        fotoUrl: contractAccessories.fotoUrl,
        accessoryName: accessoriesTable.name,
      })
        .from(contractAccessories)
        .leftJoin(accessoriesTable, eq(contractAccessories.accessoryId, accessoriesTable.id))
        .where(eq(contractAccessories.contractId, input.id));
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
      // Update accessories checklist
      if (input.accessories && input.accessories.length > 0) {
        for (const acc of input.accessories) {
          await db.update(contractAccessories)
            .set({
              status: acc.status,
              observacao: acc.observacao ?? null,
              fotoUrl: acc.fotoUrl ?? null,
            })
            .where(eq(contractAccessories.id, acc.id));
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
        // Notify admin
        const pendentes = (input.accessories ?? [])
          .filter((a) => a.status !== "ok")
          .map((a) => `Acessório #${a.id}: ${a.status}${a.observacao ? " — " + a.observacao : ""}`)
          .join("\n");
        await notifyOwner({
          title: `⚠️ Pendência de acessório — Contrato #${input.id}`,
          content: `Acessórios com problema ao encerrar o contrato #${input.id}:\n\n${pendentes}`,
        }).catch(() => {});
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
