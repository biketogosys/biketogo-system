/**
 * Card "Aluguéis ativos" do Dashboard (`getBikeStats`) — bikes em uso AGORA.
 *
 * Relato da dona em 2026-09-17, 09:57: card com 1 e "não tem nenhuma bike na
 * rua". Em produção era o aluguel 85 do contrato #42: `active`, entrega hoje às
 * 11:00, busca amanhã às 09:00. O card contava pelo dia e ignorava a hora.
 *
 * PGlite com migrações reais e "now" injetado (nunca o relógio real).
 * SP é UTC-3 o ano inteiro.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../drizzle/schema";
import { getBikeStats } from "./db";
import { horaSaoPaulo } from "./overdue";
import { createTestDb, makeRental, seedBasics } from "./test-helpers/pglite-db";

describe("horaSaoPaulo", () => {
  it("12:57Z é 09:57 em SP", () => {
    expect(horaSaoPaulo(new Date("2026-09-17T12:57:00Z"))).toBe("09:57");
  });

  it("meia-noite em SP sai 00:00, nunca 24:00", () => {
    expect(horaSaoPaulo(new Date("2026-09-18T03:00:00Z"))).toBe("00:00");
  });
});

describe("getBikeStats — bikes em uso agora", () => {
  let db: any;
  let base: { clientId: number; bikeId: number; bikeSizeId: number };

  const SP_0957 = new Date("2026-09-17T12:57:00Z");
  const SP_1100 = new Date("2026-09-17T14:00:00Z");
  const SP_1000 = new Date("2026-09-17T13:00:00Z");
  const SP_2130 = new Date("2026-09-18T00:30:00Z"); // já é dia 18 em UTC

  const aluguel = (r: {
    startDate: string; endDate: string; startTime?: string; endTime?: string; status?: string;
  }) => makeRental(db, { ...base, quantity: 1, ...r });

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db); // 4 unidades disponíveis
    base = { clientId: seed.clientId, bikeId: seed.bikeId, bikeSizeId: seed.bikeSizeId };
  });

  beforeEach(async () => {
    await db.delete(schema.rentals);
  });

  it("o caso do print: entrega hoje às 11:00 não conta às 09:57", async () => {
    await aluguel({ startDate: "2026-09-17", startTime: "11:00", endDate: "2026-09-18", endTime: "09:00" });

    const antes = await getBikeStats(db, SP_0957);
    expect(antes.rented).toBe(0);
    expect(antes.available).toBe(4);

    const naHora = await getBikeStats(db, SP_1100);
    expect(naHora.rented).toBe(1);
    expect(naHora.available).toBe(3);
  });

  it("aluguel sem hora (anterior à migração 0022) conta desde a meia-noite", async () => {
    await aluguel({ startDate: "2026-09-17", endDate: "2026-09-19" });
    expect((await getBikeStats(db, SP_0957)).rented).toBe(1);
  });

  it("começou ontem: conta a qualquer hora de hoje", async () => {
    await aluguel({ startDate: "2026-09-16", startTime: "18:00", endDate: "2026-09-18", endTime: "18:00" });
    expect((await getBikeStats(db, SP_0957)).rented).toBe(1);
  });

  it("busca marcada para hoje às 09:00 e não marcada como devolvida: continua na rua às 10:00", async () => {
    await aluguel({ startDate: "2026-09-15", startTime: "09:00", endDate: "2026-09-17", endTime: "09:00" });
    expect((await getBikeStats(db, SP_1000)).rented).toBe(1);
  });

  it("atrasado continua contando", async () => {
    await aluguel({ startDate: "2026-09-10", startTime: "09:00", endDate: "2026-09-15", endTime: "09:00", status: "overdue" });
    expect((await getBikeStats(db, SP_0957)).rented).toBe(1);
  });

  it("devolvido e cancelado não contam", async () => {
    await aluguel({ startDate: "2026-09-16", endDate: "2026-09-18", status: "returned" });
    await aluguel({ startDate: "2026-09-16", endDate: "2026-09-18", status: "cancelled" });
    expect((await getBikeStats(db, SP_0957)).rented).toBe(0);
  });

  it("às 21h30 de SP o 'hoje' ainda é o dia 17, não o 18 do UTC", async () => {
    // Asserções separadas: somadas, um erro compensaria o outro.
    // entrega amanhã cedo: pelo dia UTC já contaria
    await aluguel({ startDate: "2026-09-18", startTime: "08:00", endDate: "2026-09-19", endTime: "08:00" });
    expect((await getBikeStats(db, SP_2130)).rented).toBe(0);

    await db.delete(schema.rentals);
    // busca hoje, sem hora gravada: pelo dia UTC já teria sumido do card
    await aluguel({ startDate: "2026-09-15", endDate: "2026-09-17" });
    expect((await getBikeStats(db, SP_2130)).rented).toBe(1);
  });
});
