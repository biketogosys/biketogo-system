/**
 * LOTE-5 — Integration tests for availability/overlap + unit assignment (PGlite)
 *
 * Estratégia: PGlite em memória + migrações reais + SEM vi.mock.
 * Cada describe usa createTestDb() no beforeAll para isolamento.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import { getSizeBreakdowns } from "./db";
import { assignBikeUnits, releaseBikeUnits, findAvailableBikeUnits } from "./routers";
import * as schema from "../drizzle/schema";

// ─── C1: getSizeBreakdowns — janela de overlap ────────────────────────────────
describe("C1: getSizeBreakdowns — overlap window", () => {
  let db: any;
  let bikeSizeId: number;
  let clientId: number;
  let bikeId: number;

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId;
    bikeId = seed.bikeId;
    bikeSizeId = seed.bikeSizeId;
  });

  it("sobrepoe: consulta 07-03..07-07 com aluguel 07-01..07-05 -> alugada=1", async () => {
    await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "active" });
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db);
    expect(map.get(bikeSizeId)?.alugada).toBe(1);
  });

  it("nao sobrepoe: consulta 07-06..07-08 com aluguel 07-01..07-05 -> alugada=0", async () => {
    // O aluguel do teste anterior ainda existe — mas não sobrepõe 07-06..07-08
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-06", "2026-07-08", undefined, undefined, db);
    expect(map.get(bikeSizeId)?.alugada).toBe(0);
  });

  it("borda: consulta 07-05..07-06 com aluguel 07-01..07-05 -> alugada=1 (endDate==inicio conta)", async () => {
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-05", "2026-07-06", undefined, undefined, db);
    expect(map.get(bikeSizeId)?.alugada).toBe(1);
  });

  it("endDate NULL -> alugada=1 em qualquer consulta futura", async () => {
    // Criar aluguel sem endDate
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    await makeRental(db2, { clientId: seed2.clientId, bikeId: seed2.bikeId, bikeSizeId: seed2.bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: null, status: "active" });
    const map = await getSizeBreakdowns([seed2.bikeSizeId], "2026-12-01", "2026-12-31", undefined, undefined, db2);
    expect(map.get(seed2.bikeSizeId)?.alugada).toBe(1);
  });

  it("status cancelled -> alugada=0", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    await makeRental(db2, { clientId: seed2.clientId, bikeId: seed2.bikeId, bikeSizeId: seed2.bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "cancelled" });
    const map = await getSizeBreakdowns([seed2.bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(seed2.bikeSizeId)?.alugada).toBe(0);
  });

  it("rental deletado (deletedAt setado) -> alugada=0", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    const rentalId = await makeRental(db2, { clientId: seed2.clientId, bikeId: seed2.bikeId, bikeSizeId: seed2.bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "active" });
    // Soft-delete
    await db2.update(schema.rentals).set({ deletedAt: new Date() }).where(eq(schema.rentals.id, rentalId));
    const map = await getSizeBreakdowns([seed2.bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(seed2.bikeSizeId)?.alugada).toBe(0);
  });

  it("status pending -> conta (reserva estoque)", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    await makeRental(db2, { clientId: seed2.clientId, bikeId: seed2.bikeId, bikeSizeId: seed2.bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "pending" });
    const map = await getSizeBreakdowns([seed2.bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(seed2.bikeSizeId)?.alugada).toBe(1);
  });

  it("status overdue -> conta (reserva estoque)", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    await makeRental(db2, { clientId: seed2.clientId, bikeId: seed2.bikeId, bikeSizeId: seed2.bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "overdue" });
    const map = await getSizeBreakdowns([seed2.bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(seed2.bikeSizeId)?.alugada).toBe(1);
  });
});

// ─── C2: getSizeBreakdowns — unidades ────────────────────────────────────────
describe("C2: getSizeBreakdowns — unit status breakdown", () => {
  it("4 unidades: perdido/roubado/manutencao/disponivel -> total=2, manutencao=1", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { bikeSizeId, unitIds } = seed;
    // Alterar status das unidades: perdido, roubado, manutencao, disponivel
    await db.update(schema.bikeUnits).set({ status: "perdido" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    await db.update(schema.bikeUnits).set({ status: "roubado" }).where(eq(schema.bikeUnits.id, unitIds[1]));
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[2]));
    // unitIds[3] permanece "disponivel"

    const map = await getSizeBreakdowns([bikeSizeId], undefined, undefined, undefined, undefined, db);
    const bd = map.get(bikeSizeId)!;
    expect(bd.total).toBe(2);       // exclui perdido + roubado
    expect(bd.manutencao).toBe(1);
    expect(bd.disponivel).toBe(1);  // 2 total - 1 manutencao - 0 alugada
  });

  it("com 1 aluguel ativo -> disponivel = max(0, 2-1-1) = 0", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed2;
    await db2.update(schema.bikeUnits).set({ status: "perdido" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    await db2.update(schema.bikeUnits).set({ status: "roubado" }).where(eq(schema.bikeUnits.id, unitIds[1]));
    await db2.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[2]));
    // 1 aluguel ativo
    await makeRental(db2, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10", status: "active" });
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(bikeSizeId)?.disponivel).toBe(0);
  });

  it("disponivel nunca negativo (2 alugueis + 1 manutencao com total 2 -> 0)", async () => {
    const db2 = await createTestDb();
    const seed2 = await seedBasics(db2);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed2;
    await db2.update(schema.bikeUnits).set({ status: "perdido" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    await db2.update(schema.bikeUnits).set({ status: "roubado" }).where(eq(schema.bikeUnits.id, unitIds[1]));
    await db2.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[2]));
    // 2 alugueis ativos (total=2, manutencao=1 → disponivel deveria ser -1 mas fica 0)
    await makeRental(db2, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10", status: "active" });
    await makeRental(db2, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10", status: "active" });
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-03", "2026-07-07", undefined, undefined, db2);
    expect(map.get(bikeSizeId)?.disponivel).toBeGreaterThanOrEqual(0);
  });
});

// ─── C3: excludeRentalId / excludeContractId ─────────────────────────────────
describe("C3: excludeRentalId / excludeContractId", () => {
  it("excludeRentalId do proprio aluguel -> alugada=0 (edicao nao se conta)", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId } = seed;
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "active" });
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-03", "2026-07-07", rentalId, undefined, db);
    expect(map.get(bikeSizeId)?.alugada).toBe(0);
  });

  it("rental com contractId X + excludeContractId X -> alugada=0", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId } = seed;
    // Criar um contrato mínimo
    const [contract] = await db.insert(schema.contracts).values({ clientId }).returning({ id: schema.contracts.id });
    await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05", status: "active", contractId: contract.id });
    const map = await getSizeBreakdowns([bikeSizeId], "2026-07-03", "2026-07-07", undefined, contract.id, db);
    expect(map.get(bikeSizeId)?.alugada).toBe(0);
  });
});

// ─── C4: assignBikeUnits AUTO ─────────────────────────────────────────────────
describe("C4: assignBikeUnits AUTO (sem unitIds)", () => {
  it("liga quantity unidades livres em rental_bike_units", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId } = seed;
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 2, startDate: "2026-07-01", endDate: "2026-07-05" });
    const linked = await assignBikeUnits(db, rentalId, bikeSizeId, 2, "2026-07-01", "2026-07-05");
    expect(linked).toBe(2);
    const rows = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalId));
    expect(rows).toHaveLength(2);
  });

  it("pula unidades manutencao/perdido/roubado", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Marcar 3 unidades como indisponíveis
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    await db.update(schema.bikeUnits).set({ status: "perdido" }).where(eq(schema.bikeUnits.id, unitIds[1]));
    await db.update(schema.bikeUnits).set({ status: "roubado" }).where(eq(schema.bikeUnits.id, unitIds[2]));
    // Só unitIds[3] está disponível
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05" });
    const linked = await assignBikeUnits(db, rentalId, bikeSizeId, 1, "2026-07-01", "2026-07-05");
    expect(linked).toBe(1);
    const rows = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalId));
    expect(rows[0].bikeUnitId).toBe(unitIds[3]);
  });

  it("pula unidade ja ligada a rental sobreposto — assign pega OUTRA unidade", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental A: pega a primeira unidade
    const rentalA = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10" });
    await assignBikeUnits(db, rentalA, bikeSizeId, 1, "2026-07-01", "2026-07-10");
    const rowsA = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalA));
    const unitUsedByA = rowsA[0].bikeUnitId;

    // Rental B sobreposto: deve pegar uma unidade diferente
    const rentalB = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-03", endDate: "2026-07-07" });
    await assignBikeUnits(db, rentalB, bikeSizeId, 1, "2026-07-03", "2026-07-07");
    const rowsB = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalB));
    expect(rowsB[0].bikeUnitId).not.toBe(unitUsedByA);
  });

  it("estoque fisico menor que quantity -> liga as que houver (best-effort)", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Deixar só 1 unidade disponível
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[1]));
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[2]));
    // Pedir 3, mas só 1 disponível
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 3, startDate: "2026-07-01", endDate: "2026-07-05" });
    const linked = await assignBikeUnits(db, rentalId, bikeSizeId, 3, "2026-07-01", "2026-07-05");
    // Comportamento atual: liga as que houver (best-effort, não lança erro)
    expect(linked).toBe(1);
  });
});

// ─── C5: assignBikeUnits PICK (com unitIds) ───────────────────────────────────
describe("C5: assignBikeUnits PICK (com unitIds)", () => {
  it("unitIds validos -> liga exatamente eles", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 2, startDate: "2026-07-01", endDate: "2026-07-05" });
    const linked = await assignBikeUnits(db, rentalId, bikeSizeId, 2, "2026-07-01", "2026-07-05", [unitIds[0], unitIds[1]]);
    expect(linked).toBe(2);
    const rows = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalId));
    const linkedIds = rows.map((r) => r.bikeUnitId).sort();
    expect(linkedIds).toEqual([unitIds[0], unitIds[1]].sort());
  });

  it("unitId de OUTRO tamanho -> PRECONDITION_FAILED", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId } = seed;
    // Criar outro tamanho com uma unidade
    const [otherSize] = await db.insert(schema.bikeSizes).values({ bikeId, tamanho: "G" }).returning({ id: schema.bikeSizes.id });
    const [otherUnit] = await db.insert(schema.bikeUnits).values({ bikeSizeId: otherSize.id, numeroSistema: "X01" }).returning({ id: schema.bikeUnits.id });
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05" });
    await expect(
      assignBikeUnits(db, rentalId, bikeSizeId, 1, "2026-07-01", "2026-07-05", [otherUnit.id])
    ).rejects.toThrow(TRPCError);
  });

  it("unitId com status manutencao -> PRECONDITION_FAILED", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[0]));
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-05" });
    await expect(
      assignBikeUnits(db, rentalId, bikeSizeId, 1, "2026-07-01", "2026-07-05", [unitIds[0]])
    ).rejects.toThrow(TRPCError);
  });

  it("unitId ja ocupado em periodo sobreposto -> PRECONDITION_FAILED", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental A ocupa unitIds[0]
    const rentalA = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10" });
    await assignBikeUnits(db, rentalA, bikeSizeId, 1, "2026-07-01", "2026-07-10", [unitIds[0]]);
    // Rental B tenta pegar a mesma unidade no período sobreposto
    const rentalB = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-05", endDate: "2026-07-15" });
    await expect(
      assignBikeUnits(db, rentalB, bikeSizeId, 1, "2026-07-05", "2026-07-15", [unitIds[0]])
    ).rejects.toThrow(TRPCError);
  });

  it("quando falha, NENHUMA linha inserida em rental_bike_units p/ o rental", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental A ocupa unitIds[0]
    const rentalA = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10" });
    await assignBikeUnits(db, rentalA, bikeSizeId, 1, "2026-07-01", "2026-07-10", [unitIds[0]]);
    // Rental B tenta pegar unitIds[0] (ocupado) e unitIds[1] (livre) — deve falhar
    const rentalB = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 2, startDate: "2026-07-05", endDate: "2026-07-15" });
    try {
      await assignBikeUnits(db, rentalB, bikeSizeId, 2, "2026-07-05", "2026-07-15", [unitIds[0], unitIds[1]]);
    } catch {
      // esperado
    }
    // Verificar se alguma linha foi inserida para rentalB
    const rows = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalB));
    // Reportar comportamento real: a função valida TODOS antes de inserir (atomica)
    // Se for atômica: rows.length === 0; se não for: rows.length > 0
    // O teste documenta o comportamento atual sem forçar
    expect(rows.length).toBe(0); // comportamento atual: validação antes de qualquer insert
  });
});

// ─── C6: releaseBikeUnits ─────────────────────────────────────────────────────
describe("C6: releaseBikeUnits", () => {
  it("apos assign, release remove as linhas do rental", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId } = seed;
    const rentalId = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 2, startDate: "2026-07-01", endDate: "2026-07-05" });
    await assignBikeUnits(db, rentalId, bikeSizeId, 2, "2026-07-01", "2026-07-05");
    const before = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalId));
    expect(before.length).toBeGreaterThan(0);
    await releaseBikeUnits(db, rentalId);
    const after = await db.select().from(schema.rentalBikeUnits).where(eq(schema.rentalBikeUnits.rentalId, rentalId));
    expect(after).toHaveLength(0);
  });
});

// ─── C7: findAvailableBikeUnits ───────────────────────────────────────────────
describe("C7: findAvailableBikeUnits", () => {
  it("devolve so status disponivel do tamanho, ordenado por numeroSistema", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { bikeSizeId, unitIds } = seed;
    // Marcar 1 unidade como manutencao
    await db.update(schema.bikeUnits).set({ status: "manutencao" }).where(eq(schema.bikeUnits.id, unitIds[3]));
    const result = await findAvailableBikeUnits(db, { bikeSizeId, startDate: "2026-07-01", endDate: "2026-07-05" });
    // Deve retornar apenas as 3 com status "disponivel"
    expect(result).toHaveLength(3);
    // Verificar ordenação por numeroSistema
    const nums = result.map((r) => r.numeroSistema);
    expect(nums).toEqual([...nums].sort());
  });

  it("exclui unidade presa em rental sobreposto", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental A ocupa unitIds[0]
    const rentalA = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10" });
    await assignBikeUnits(db, rentalA, bikeSizeId, 1, "2026-07-01", "2026-07-10", [unitIds[0]]);
    const result = await findAvailableBikeUnits(db, { bikeSizeId, startDate: "2026-07-05", endDate: "2026-07-08" });
    const ids = result.map((r) => r.id);
    expect(ids).not.toContain(unitIds[0]);
    expect(result).toHaveLength(3); // 4 - 1 ocupada
  });

  it("excludeRentalId: unidades do PROPRIO rental voltam a aparecer (edicao)", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental A ocupa unitIds[0]
    const rentalA = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10" });
    await assignBikeUnits(db, rentalA, bikeSizeId, 1, "2026-07-01", "2026-07-10", [unitIds[0]]);
    // Sem exclude: unitIds[0] não aparece
    const withoutExclude = await findAvailableBikeUnits(db, { bikeSizeId, startDate: "2026-07-05", endDate: "2026-07-08" });
    expect(withoutExclude.map((r) => r.id)).not.toContain(unitIds[0]);
    // Com excludeRentalId=rentalA: unitIds[0] volta a aparecer
    const withExclude = await findAvailableBikeUnits(db, { bikeSizeId, startDate: "2026-07-05", endDate: "2026-07-08", excludeRentalId: rentalA });
    expect(withExclude.map((r) => r.id)).toContain(unitIds[0]);
  });

  it("unidade presa em rental cancelado/deletado -> aparece", async () => {
    const db = await createTestDb();
    const seed = await seedBasics(db);
    const { clientId, bikeId, bikeSizeId, unitIds } = seed;
    // Rental cancelado com unitIds[0]
    const rentalC = await makeRental(db, { clientId, bikeId, bikeSizeId, quantity: 1, startDate: "2026-07-01", endDate: "2026-07-10", status: "cancelled" });
    await db.insert(schema.rentalBikeUnits).values({ rentalId: rentalC, bikeUnitId: unitIds[0] });
    const result = await findAvailableBikeUnits(db, { bikeSizeId, startDate: "2026-07-05", endDate: "2026-07-08" });
    // unitIds[0] deve aparecer porque o rental está cancelado
    expect(result.map((r) => r.id)).toContain(unitIds[0]);
  });
});
