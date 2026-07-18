/**
 * F1 — Agenda de Operações (PGlite, "now" injetado).
 * Entrega = COALESCE(deliveryDate, startDate); devolução = endDate;
 * atrasadas em lista própria (endDate < hoje-SP).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import { getAgenda } from "./agenda";
import * as schema from "../drizzle/schema";

describe("getAgenda", () => {
  let db: any;
  let clientId: number;
  let bikeId: number;
  let bikeSizeId: number;

  // now fixo: 2026-07-20 12:00 SP → hoje = 2026-07-20; janela = 20..26
  const NOW = new Date("2026-07-20T15:00:00Z");
  const FROM = "2026-07-20";
  const TO = "2026-07-26";

  const mk = async (over: any = {}) => {
    const [r] = await db.insert(schema.rentals).values({
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-21", endDate: "2026-07-25",
      status: "active", ...over,
    }).returning({ id: schema.rentals.id });
    return r.id;
  };

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId;
    bikeId = seed.bikeId;
    bikeSizeId = seed.bikeSizeId;
  });

  it("entrega usa deliveryDate quando existe, senão startDate", async () => {
    const comDelivery = await mk({ startDate: "2026-07-21", deliveryDate: "2026-07-23", deliveryTime: "14:00", endDate: null });
    const semDelivery = await mk({ startDate: "2026-07-22", endDate: null });
    const { deliveries } = await getAgenda(db, FROM, TO, NOW);
    const d1 = deliveries.find((x) => x.id === comDelivery);
    const d2 = deliveries.find((x) => x.id === semDelivery);
    expect(d1?.day).toBe("2026-07-23");
    expect(d1?.deliveryTime).toBe("14:00");
    expect(d2?.day).toBe("2026-07-22");
    // ordenadas por dia
    expect(deliveries.findIndex((x) => x.id === semDelivery))
      .toBeLessThan(deliveries.findIndex((x) => x.id === comDelivery));
  });

  it("entrega fora da janela não aparece", async () => {
    const fora = await mk({ startDate: "2026-07-28", endDate: null });
    const { deliveries } = await getAgenda(db, FROM, TO, NOW);
    expect(deliveries.map((x) => x.id)).not.toContain(fora);
  });

  it("devolução com endDate na janela aparece em returns; atrasada vai pra overdue", async () => {
    const noPrazo = await mk({ startDate: "2026-07-18", endDate: "2026-07-24" });
    const atrasada = await mk({ startDate: "2026-07-10", endDate: "2026-07-18", status: "overdue" });
    const { returns, overdue } = await getAgenda(db, FROM, TO, NOW);
    expect(returns.map((x) => x.id)).toContain(noPrazo);
    expect(returns.map((x) => x.id)).not.toContain(atrasada);
    const late = overdue.find((x) => x.id === atrasada);
    expect(late?.daysLate).toBe(2);
  });

  it("devolvido/cancelado/deletado não aparecem em lista nenhuma", async () => {
    const devolvido = await mk({ endDate: "2026-07-24", status: "returned", returnedAt: new Date() });
    const cancelado = await mk({ endDate: "2026-07-24", status: "cancelled" });
    const deletado = await mk({ endDate: "2026-07-24", deletedAt: new Date() });
    const { deliveries, returns, overdue } = await getAgenda(db, FROM, TO, NOW);
    const all = [...deliveries, ...returns, ...overdue].map((x) => x.id);
    expect(all).not.toContain(devolvido);
    expect(all).not.toContain(cancelado);
    expect(all).not.toContain(deletado);
  });

  it("joins populados (nome do cliente e modelo da bike)", async () => {
    const { returns } = await getAgenda(db, FROM, TO, NOW);
    expect(returns[0]?.clientName).toBe("Cliente Teste");
    expect(returns[0]?.bikeModel).toBe("Modelo Teste");
  });
});
