import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

// ─── Helper: create admin context ────────────────────────────────────────────
function createAdminContext(): { ctx: TrpcContext } {
  const user = {
    id: 1,
    openId: "admin-test",
    email: "admin@biketogo.com",
    name: "Admin Test",
    loginMethod: "local" as const,
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Dashboard tests ─────────────────────────────────────────────────────────
describe("dashboard.summary", () => {
  it("returns stats object for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dashboard.summary();

    expect(result).toHaveProperty("clientStats");
    expect(result).toHaveProperty("bikeStats");
    expect(result).toHaveProperty("rentalStats");
    expect(result.clientStats).toHaveProperty("total");
    expect(result.bikeStats).toHaveProperty("total");
    expect(result.rentalStats).toHaveProperty("active");
  });

  it("rejects unauthenticated access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.dashboard.summary()).rejects.toThrow();
  });
});

// ─── Financial tests ─────────────────────────────────────────────────────────
describe("financial.expenseCategories", () => {
  it("returns an array for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.expenseCategories();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.financial.expenseCategories()).rejects.toThrow();
  });
});

describe("financial.revenueCategories", () => {
  it("returns an array for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.revenueCategories();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("financial.expenses", () => {
  it("returns items and total for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.expenses({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe("financial.revenues", () => {
  it("returns items and total for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.revenues({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe("financial.report", () => {
  it("returns rentalRevenue, extraRevenue, totalExpenses", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.financial.report({
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });

    expect(result).toHaveProperty("rentalRevenue");
    expect(result).toHaveProperty("extraRevenue");
    expect(result).toHaveProperty("totalExpenses");
  });
});

// ─── Settings tests ──────────────────────────────────────────────────────────
describe("settings.getAll", () => {
  it("returns an array for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects unauthenticated access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.settings.getAll()).rejects.toThrow();
  });
});

// ─── Clients list test ───────────────────────────────────────────────────────
describe("clients.list", () => {
  it("returns items and total for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.clients.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});

// ─── Bikes list test ─────────────────────────────────────────────────────────
describe("bikes.list", () => {
  it("returns an array for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bikes.list({});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Rentals list test ───────────────────────────────────────────────────────
describe("rentals.list", () => {
  it("returns items and total for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.rentals.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
  });
});

// ─── Public API test ─────────────────────────────────────────────────────────
describe("publicApi.availableBikes", () => {
  it("returns an array without authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicApi.availableBikes();
    expect(Array.isArray(result)).toBe(true);
  });
});
