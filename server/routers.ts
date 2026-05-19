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
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => getClients(input)),

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
    }))
    .mutation(async ({ input }) => {
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
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
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
    .mutation(async ({ input }) => {
      await deleteClient(input.id);
      return { success: true };
    }),

  stats: adminAuthProcedure.query(() => getClientStats()),

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
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateBike(id, data as any);
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
});

// ─── Rentals router ───────────────────────────────────────────────────────────
const rentalsRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      clientId: z.number().optional(),
      bikeId: z.number().optional(),
      status: z.enum(["active", "returned", "overdue", "cancelled"]).optional(),
      limit: z.number().min(1).max(1000).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => getRentals(input)),

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
    .mutation(async ({ input }) => {
      const rental = await getRentalById(input.id);
      if (rental && rental.status === "active") {
        await updateBike(rental.bikeId, { status: "available" });
      }
      await deleteRental(input.id);
      return { success: true };
    }),

  // Accessories for a rental
  accessories: adminAuthProcedure
    .input(z.object({ rentalId: z.number() }))
    .query(({ input }) => getRentalAccessories(input.rentalId)),

  stats: adminAuthProcedure.query(() => getRentalStats()),
});

// ─── Accessories router ─────────────────────────────────────────────────────
const accessoriesRouter = router({
  list: adminAuthProcedure
    .input(z.object({
      status: z.enum(["available", "rented", "maintenance", "lost"]).optional(),
      search: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(({ input }) => getAccessories(input)),

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

  // Get available accessories
  availableAccessories: publicProcedure.query(async () => {
    const all = await getAccessories({ status: "available" });
    return all.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      dailyRate: a.dailyRate,
      quantity: a.quantity,
    }));
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
    const [clientStats, bikeStats, rentalStats] = await Promise.all([
      getClientStats(),
      getBikeStats(),
      getRentalStats(),
    ]);
    return { clientStats, bikeStats, rentalStats };
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
});

export type AppRouter = typeof appRouter;
