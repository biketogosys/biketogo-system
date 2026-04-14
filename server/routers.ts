import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addClientDocument,
  createAccessory,
  createBike,
  createClient,
  createRental,
  deleteAccessory,
  deleteBike,
  deleteClientDocument,
  getAccessories,
  getAccessoryById,
  getBikeById,
  getBikes,
  getBikeStats,
  getClientById,
  getClientDocuments,
  getClients,
  getClientStats,
  getRentalById,
  getRentals,
  getRentalStats,
  updateAccessory,
  updateBike,
  updateClient,
  updateRental,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ─── Clients router ───────────────────────────────────────────────────────────
const clientsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["lead", "verified", "blocked"]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(({ input }) => getClients(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado." });
      return client;
    }),

  create: adminProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      const id = await createClient({ ...input, source: "manual" });
      return { id };
    }),

  update: adminProcedure
    .input(
      z.object({
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
        expiresAt: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data as any);
      return { success: true };
    }),

  validate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateClient(input.id, { status: "verified" });
      return { success: true };
    }),

  stats: protectedProcedure.query(() => getClientStats()),

  // Documents
  documents: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => getClientDocuments(input.clientId)),

  addDocument: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        type: z.enum(["rg_front", "rg_back", "other"]),
        url: z.string().url(),
        cloudinaryPublicId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await addClientDocument(input);
      return { id };
    }),

  deleteDocument: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteClientDocument(input.id);
      return { success: true };
    }),
});

// ─── Bikes router ─────────────────────────────────────────────────────────────
const bikesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["available", "rented", "maintenance"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(({ input }) => getBikes(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const bike = await getBikeById(input.id);
      if (!bike) throw new TRPCError({ code: "NOT_FOUND", message: "Bicicleta não encontrada." });
      return bike;
    }),

  create: adminProcedure
    .input(
      z.object({
        serialNumber: z.string().min(1),
        model: z.string().min(1),
        size: z.string().optional(),
        color: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["available", "rented", "maintenance"]).default("available"),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createBike(input);
      return { id };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        serialNumber: z.string().optional(),
        model: z.string().optional(),
        size: z.string().optional(),
        color: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["available", "rented", "maintenance"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateBike(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBike(input.id);
      return { success: true };
    }),

  stats: protectedProcedure.query(() => getBikeStats()),
});

// ─── Rentals router ───────────────────────────────────────────────────────────
const rentalsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        bikeId: z.number().optional(),
        status: z.enum(["active", "returned", "overdue", "cancelled"]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(({ input }) => getRentals(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rental = await getRentalById(input.id);
      if (!rental) throw new TRPCError({ code: "NOT_FOUND", message: "Aluguel não encontrado." });
      return rental;
    }),

  create: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        bikeId: z.number(),
        startDate: z.string(),
        endDate: z.string().optional(),
        dailyRate: z.string().optional(),
        totalAmount: z.string().optional(),
        depositAmount: z.string().optional(),
        paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "other"]).optional(),
        paymentStatus: z.enum(["pending", "paid", "partial", "refunded"]).default("pending"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const rentalData: any = {
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        status: "active",
      };
      const id = await createRental(rentalData);
      // Mark bike as rented
      await updateBike(input.bikeId, { status: "rented" });
      return { id };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        endDate: z.string().optional(),
        returnedAt: z.date().optional(),
        totalAmount: z.string().optional(),
        depositAmount: z.string().optional(),
        paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "other"]).optional(),
        paymentStatus: z.enum(["pending", "paid", "partial", "refunded"]).optional(),
        status: z.enum(["active", "returned", "overdue", "cancelled"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const rental = await getRentalById(id);
      if (!rental) throw new TRPCError({ code: "NOT_FOUND" });

      await updateRental(id, data as any);

      // If returned or cancelled, free the bike
      if (data.status === "returned" || data.status === "cancelled") {
        await updateBike(rental.bikeId, { status: "available" });
      }
      return { success: true };
    }),

  stats: protectedProcedure.query(() => getRentalStats()),
});

// ─── Accessories router ─────────────────────────────────────────────────────────────
const accessoriesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["available", "rented", "maintenance", "lost"]).optional(),
        search: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(({ input }) => getAccessories(input)),

  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const item = await getAccessoryById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Acessório não encontrado." });
      return item;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        serialNumber: z.string().optional(),
        quantity: z.number().min(1).default(1),
        dailyRate: z.string().optional(),
        purchasePrice: z.string().optional(),
        status: z.enum(["available", "rented", "maintenance", "lost"]).default("available"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createAccessory(input as any);
      return { id };
    }),

  update: adminProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAccessory(id, data as any);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAccessory(input.id);
      return { success: true };
    }),
});

// ─── App router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  clients: clientsRouter,
  bikes: bikesRouter,
  rentals: rentalsRouter,
  accessories: accessoriesRouter,

  dashboard: router({
    summary: protectedProcedure.query(async () => {
      const [clientStats, bikeStats, rentalStats] = await Promise.all([
        getClientStats(),
        getBikeStats(),
        getRentalStats(),
      ]);
      return { clientStats, bikeStats, rentalStats };
    }),
  }),
});

export type AppRouter = typeof appRouter;
