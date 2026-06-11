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

    const result = await caller.clients.list({ limit: 10, page: 1 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("totalPages");
  });
});

// ─── Bikes list test ─────────────────────────────────────────────────────────
describe("bikes.list", () => {
  it("returns paginated data for authenticated admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bikes.list({});
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("totalPages");
    expect(Array.isArray(result.data)).toBe(true);
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
// publicApi.availableBikes was removed in Lote L0 (dead code cleanup)
// Bike availability is now derived via getSizeAvailability helper in db.ts

// ─── Public API: additional endpoints ────────────────────────────────────────
describe("publicApi.availableAccessories", () => {
  it("returns an array without authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicApi.availableAccessories();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("publicApi.deliveryFee", () => {
  it("returns a string without authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicApi.deliveryFee();
    expect(typeof result).toBe("string");
  });
});

// publicApi.checkAvailability was removed in Lote L0 (dead code cleanup)
// The bikes.checkAvailability procedure was also removed in Lote 3a
// Availability is now derived via getSizeAvailability helper in db.ts

describe("publicApi.bikeDiscountRules", () => {
  it("returns an array without authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.publicApi.bikeDiscountRules({ bikeId: 99999 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Email helper tests ──────────────────────────────────────────────────────
describe("email helper", () => {
  it("buildReservationEmailHtml returns valid HTML", async () => {
    const { buildReservationEmailHtml } = await import("./email");
    const html = buildReservationEmailHtml({
      clientName: "João Silva",
      bikeModel: "Mountain Pro 29",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      deliveryTime: "10:00",
      totalAmount: "450.00",
      accessories: ["Capacete", "Cadeado"],
    });

    expect(html).toContain("João Silva");
    expect(html).toContain("Mountain Pro 29");
    expect(html).toContain("450.00");
    expect(html).toContain("Capacete");
    expect(html).toContain("Cadeado");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("sendEmail returns false when no API key is configured", async () => {
    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });
    expect(result).toBe(false);
  }, 15000);
});

// ─── WhatsApp helper tests ───────────────────────────────────────────────────
describe("whatsapp helper", () => {
  it("buildOwnerReservationMessage returns formatted text", async () => {
    const { buildOwnerReservationMessage } = await import("./whatsapp");
    const msg = buildOwnerReservationMessage({
      clientName: "Maria Santos",
      clientPhone: "+5548999999999",
      bikeModel: "City Comfort",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      deliveryTime: "14:00",
      totalAmount: "200.00",
    });

    expect(msg).toContain("Maria Santos");
    expect(msg).toContain("City Comfort");
    expect(msg).toContain("200.00");
    expect(msg).toContain("+5548999999999");
  });

  it("sendWhatsApp returns false when no provider is configured", async () => {
    const { sendWhatsApp } = await import("./whatsapp");
    const result = await sendWhatsApp({
      to: "+5548999999999",
      text: "Test message",
    });
    expect(result).toBe(false);
  }, 15000);
});
