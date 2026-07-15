/**
 * Camada 1(a) — job de overdue com fuso America/Sao_Paulo (PGlite).
 *
 * Estratégia: PGlite em memória + migrações reais + "now" injetado (nunca o
 * relógio real). Um único banco para o describe — cada teste usa rentals
 * próprios e afirma sobre os ids retornados.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import { markOverdueRentals, todaySaoPaulo } from "./overdue";
import * as schema from "../drizzle/schema";

// SP é UTC-3 o ano inteiro (DST abolido em 2019).
describe("todaySaoPaulo — fuso fixado, borda de meia-noite", () => {
  it("23h59 SP do dia 14 ainda é dia 14 (02h59Z do dia 15)", () => {
    expect(todaySaoPaulo(new Date("2026-07-15T02:59:00Z"))).toBe("2026-07-14");
  });

  it("00h01 SP do dia 15 já é dia 15 (03h01Z)", () => {
    expect(todaySaoPaulo(new Date("2026-07-15T03:01:00Z"))).toBe("2026-07-15");
  });
});

describe("markOverdueRentals", () => {
  let db: any;
  let clientId: number;
  let bikeId: number;
  let bikeSizeId: number;

  // now fixo: 2026-07-20 12:00 SP → hoje-SP = 2026-07-20
  const NOW = new Date("2026-07-20T15:00:00Z");

  const status = async (id: number) => {
    const [row] = await db.select({ status: schema.rentals.status })
      .from(schema.rentals).where(eq(schema.rentals.id, id));
    return row.status;
  };

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId;
    bikeId = seed.bikeId;
    bikeSizeId = seed.bikeSizeId;
  });

  it("active com endDate ontem -> overdue", async () => {
    const id = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-10", endDate: "2026-07-19", status: "active" });
    const ids = await markOverdueRentals(db, NOW);
    expect(ids).toContain(id);
    expect(await status(id)).toBe("overdue");
  });

  it("active com endDate HOJE -> não marca (só vence no dia seguinte)", async () => {
    const id = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-15", endDate: "2026-07-20", status: "active" });
    const ids = await markOverdueRentals(db, NOW);
    expect(ids).not.toContain(id);
    expect(await status(id)).toBe("active");
  });

  it("borda de fuso: 23h59-SP do endDate não marca; 00h01-SP do dia seguinte marca", async () => {
    const id = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-10", endDate: "2026-07-14", status: "active" });

    // 2026-07-15T02:59Z = 14/jul 23h59 em SP → ainda não venceu
    const before = await markOverdueRentals(db, new Date("2026-07-15T02:59:00Z"));
    expect(before).not.toContain(id);
    expect(await status(id)).toBe("active");

    // 2026-07-15T03:01Z = 15/jul 00h01 em SP → venceu
    const after = await markOverdueRentals(db, new Date("2026-07-15T03:01:00Z"));
    expect(after).toContain(id);
    expect(await status(id)).toBe("overdue");
  });

  it("returned/cancelled/soft-deletado/sem endDate não são tocados", async () => {
    const returned = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "returned" });
    const cancelled = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "cancelled" });
    const deleted = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "active", deletedAt: new Date() });
    const openEnd = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: null, status: "active" });

    const ids = await markOverdueRentals(db, NOW);
    expect(ids).not.toContain(returned);
    expect(ids).not.toContain(cancelled);
    expect(ids).not.toContain(deleted);
    expect(ids).not.toContain(openEnd);
    expect(await status(returned)).toBe("returned");
    expect(await status(cancelled)).toBe("cancelled");
    expect(await status(deleted)).toBe("active");
    expect(await status(openEnd)).toBe("active");
  });

  it("idempotente — segunda passada não marca nada de novo", async () => {
    const again = await markOverdueRentals(db, NOW);
    expect(again).toEqual([]);
  });
});
