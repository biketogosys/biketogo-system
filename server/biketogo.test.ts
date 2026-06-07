import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock database helpers ────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getSizeBreakdown: vi.fn().mockResolvedValue({ total: 0, alugada: 0, manutencao: 0, disponivel: 0 }),
  getSizeAvailability: vi.fn().mockResolvedValue(0),
  getClients: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getClientById: vi.fn().mockResolvedValue(undefined),
  createClient: vi.fn().mockResolvedValue(1),
  updateClient: vi.fn().mockResolvedValue(undefined),
  getClientDocuments: vi.fn().mockResolvedValue([]),
  addClientDocument: vi.fn().mockResolvedValue(1),
  deleteClientDocument: vi.fn().mockResolvedValue(undefined),
  getBikes: vi.fn().mockResolvedValue([]),
  getBikeById: vi.fn().mockResolvedValue(undefined),
  createBike: vi.fn().mockResolvedValue(1),
  updateBike: vi.fn().mockResolvedValue(undefined),
  deleteBike: vi.fn().mockResolvedValue(undefined),
  getBikeStats: vi.fn().mockResolvedValue({ total: 0, available: 0, rented: 0, maintenance: 0 }),
  getRentals: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getRentalById: vi.fn().mockResolvedValue(undefined),
  createRental: vi.fn().mockResolvedValue(1),
  updateRental: vi.fn().mockResolvedValue(undefined),
  getClientStats: vi.fn().mockResolvedValue({ total: 0, leads: 0, verified: 0, blocked: 0 }),
  getRentalStats: vi.fn().mockResolvedValue({ active: 0, monthRevenue: "0" }),
  getFinancialReport: vi.fn().mockResolvedValue({
    rentalRevenue: "0",
    extraRevenue: "0",
    totalExpenses: "0",
    weeklyData: [],
  }),
  archiveClient: vi.fn().mockResolvedValue(undefined),
  archiveRental: vi.fn().mockResolvedValue(undefined),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  getArchivedClients: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
  getArchivedRentals: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      name: "Admin",
      email: "admin@biketogo.com",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "user-open-id",
      name: "User",
      email: "user@biketogo.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAnonCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });
});

// ─── Clients ──────────────────────────────────────────────────────────────────
describe("clients.list", () => {
  it("returns paginated client list for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.clients.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(makeAnonCtx());
    await expect(caller.clients.list({ limit: 10, offset: 0 })).rejects.toThrow();
  });
});

describe("clients.create", () => {
  it("allows admin to create a client", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.clients.create({ name: "João Silva" });
    expect(result).toHaveProperty("id");
    expect(result.id).toBe(1);
  });

  it("rejects non-admin users from creating clients", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.clients.create({ name: "João Silva" })).rejects.toThrow();
  });
});

describe("clients.byId", () => {
  it("throws NOT_FOUND when client does not exist", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(caller.clients.byId({ id: 999 })).rejects.toThrow("Cliente não encontrado");
  });
});

// ─── Bikes ────────────────────────────────────────────────────────────────────
describe("bikes.list", () => {
  it("returns paginated bike list for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.bikes.list({});
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("bikes.create", () => {
  it("allows admin to create a bike", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.bikes.create({
      serialNumber: "BTG-001",
      model: "Trek FX3",
      size: "M",
      status: "available",
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-admin users from creating bikes", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.bikes.create({ serialNumber: "BTG-002", model: "Trek FX3", status: "available" })
    ).rejects.toThrow();
  });
});

// ─── Rentals ─────────────────────────────────────────────────────────────────
describe("rentals.list", () => {
  it("returns rental list for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.rentals.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});

describe("rentals.create", () => {
  it("allows admin to create a rental", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.rentals.create({
      clientId: 1,
      bikeId: 1,
      startDate: "2026-04-11",
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-admin from creating rentals", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.rentals.create({ clientId: 1, bikeId: 1, startDate: "2026-04-11" })
    ).rejects.toThrow();
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
describe("dashboard.summary", () => {
  it("returns summary stats for authenticated users", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.dashboard.summary();
    expect(result).toHaveProperty("clientStats");
    expect(result).toHaveProperty("bikeStats");
    expect(result).toHaveProperty("rentalStats");
  });
});
