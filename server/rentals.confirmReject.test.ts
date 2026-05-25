import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Unit tests for rentals.confirmAll and rentals.rejectAll mutations.
 * These are admin-only procedures so we test that:
 * 1. They reject unauthenticated calls
 * 2. They reject non-admin users
 */

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("rentals.confirmAll", () => {
  it("rejects unauthenticated calls", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rentals.confirmAll({ contractId: 1 })).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rentals.confirmAll({ contractId: 1 })).rejects.toThrow();
  });
});

describe("rentals.rejectAll", () => {
  it("rejects unauthenticated calls", async () => {
    const ctx = createAnonymousContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rentals.rejectAll({ contractId: 1 })).rejects.toThrow();
  });

  it("rejects non-admin users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.rentals.rejectAll({ contractId: 1 })).rejects.toThrow();
  });
});
