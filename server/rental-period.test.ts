/**
 * Período do aluguel (PGlite) — os dois lados da régua:
 * F8 renovação (mesma unidade física, recálculo, propagação pro contrato,
 * overdue→active, bloqueio quando a unidade já está reservada) e
 * F10 devolução antecipada (dias usados, desconto reaplicado, crédito).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import {
  computeExtension, daysBetween, extendRental, findExtensionConflicts,
  applyEarlyReturn, previewEarlyReturn, pickDiscountPercent, computeRentalTotal,
  contractOpenRentalIds, effectiveDiscountPercent,
} from "./rental-period";
import * as schema from "../drizzle/schema";

describe("cálculo da extensão", () => {
  it("dias adicionados × diária × quantidade", () => {
    expect(computeExtension({ dailyRate: "45.00", quantity: 2, currentEnd: "2026-07-20", newEnd: "2026-07-23" }))
      .toEqual({ addedDays: 3, extraAmount: "270.00" });
  });
  it("daysBetween não escorrega no fuso", () => {
    expect(daysBetween("2026-07-20", "2026-07-27")).toBe(7);
    expect(daysBetween("2026-07-20", "2026-07-20")).toBe(0);
  });
});

describe("extendRental", () => {
  let db: any;
  let clientId: number, bikeId: number, bikeSizeId: number, unitIds: number[];
  const NOW = new Date("2026-07-20T15:00:00Z"); // hoje-SP = 2026-07-20

  const rentalById = async (id: number) => {
    const [r] = await db.select().from(schema.rentals).where(eq(schema.rentals.id, id));
    return r;
  };

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId; bikeId = seed.bikeId; bikeSizeId = seed.bikeSizeId;
    unitIds = seed.unitIds;
  });

  it("estende a data, soma o valor e propaga pro contrato", async () => {
    const [contract] = await db.insert(schema.contracts)
      .values({ clientId, status: "ativo", valorTotal: "450.00" })
      .returning({ id: schema.contracts.id });
    const id = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-15", endDate: "2026-07-25", status: "active",
      contractId: contract.id,
    });
    await db.update(schema.rentals)
      .set({ dailyRate: "45.00", totalAmount: "450.00" })
      .where(eq(schema.rentals.id, id));

    const res = await extendRental(db, id, "2026-07-28", NOW);
    expect(res).toMatchObject({ addedDays: 3, extraAmount: "135.00", newTotal: "585.00" });

    const r = await rentalById(id);
    expect(r.endDate).toBe("2026-07-28");
    expect(r.totalAmount).toBe("585.00");
    const [ct] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contract.id));
    expect(ct.valorTotal).toBe("585.00");
  });

  it("aluguel ATRASADO que renova volta a ficar ativo", async () => {
    const id = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-01", endDate: "2026-07-18", status: "overdue",
    });
    const res = await extendRental(db, id, "2026-07-24", NOW);
    expect(res.statusChanged).toBe(true);
    expect((await rentalById(id)).status).toBe("active");
  });

  it("bloqueia quando a MESMA unidade já está reservada na janela nova", async () => {
    const mine = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-08-01", endDate: "2026-08-05", status: "active",
    });
    const other = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-08-07", endDate: "2026-08-10", status: "pending",
    });
    // as duas reservas dividem a MESMA unidade física
    await db.insert(schema.rentalBikeUnits).values([
      { rentalId: mine, bikeUnitId: unitIds[0] },
      { rentalId: other, bikeUnitId: unitIds[0] },
    ]);

    const conflitos = await findExtensionConflicts(db, mine, "2026-08-05", "2026-08-08");
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].conflictingRentalId).toBe(other);

    await expect(extendRental(db, mine, "2026-08-08", NOW)).rejects.toThrow(/já está reservada/);
    // nada foi alterado
    expect((await rentalById(mine)).endDate).toBe("2026-08-05");
  });

  it("estender até ANTES do conflito é permitido", async () => {
    const mine = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-09-01", endDate: "2026-09-05", status: "active",
    });
    const other = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-09-20", endDate: "2026-09-25", status: "pending",
    });
    await db.insert(schema.rentalBikeUnits).values([
      { rentalId: mine, bikeUnitId: unitIds[1] },
      { rentalId: other, bikeUnitId: unitIds[1] },
    ]);
    const res = await extendRental(db, mine, "2026-09-10", NOW);
    expect(res.addedDays).toBe(5);
  });

  it("recusa devolvido, cancelado e data não-posterior (extensão)", async () => {
    const devolvido = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-01", endDate: "2026-07-05", status: "returned",
    });
    await expect(extendRental(db, devolvido, "2026-07-30", NOW)).rejects.toThrow(/já foi devolvido/);

    const cancelado = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-01", endDate: "2026-07-05", status: "cancelled",
    });
    await expect(extendRental(db, cancelado, "2026-07-30", NOW)).rejects.toThrow(/cancelado/);

    const ativo = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-10-01", endDate: "2026-10-05", status: "active",
    });
    await expect(extendRental(db, ativo, "2026-10-05", NOW)).rejects.toThrow(/posterior/);
  });
});

// ─── F10: devolução ANTECIPADA ────────────────────────────────────────────────
describe("regra de desconto (pura)", () => {
  const regras = [
    { minDays: 3, discountPercent: "5.00" },
    { minDays: 5, discountPercent: "10.00" },
  ];
  it("vale a faixa de MAIOR minDays atingido", () => {
    expect(pickDiscountPercent(regras, 1)).toBe(0);
    expect(pickDiscountPercent(regras, 3)).toBe(5);
    expect(pickDiscountPercent(regras, 9)).toBe(10);
  });
  it("preço = diária × dias × qtd − desconto da faixa", () => {
    expect(computeRentalTotal({
      dailyRate: "100.00", quantity: 1,
      startDate: "2026-07-20", endDate: "2026-07-25", rules: regras,
    })).toEqual({ numDays: 5, discountPercent: 10, totalAmount: "450.00" });
    // devolveu no mesmo dia = 1 diária cheia (nunca zero)
    expect(computeRentalTotal({
      dailyRate: "100.00", quantity: 2,
      startDate: "2026-07-20", endDate: "2026-07-20", rules: regras,
    })).toEqual({ numDays: 1, discountPercent: 0, totalAmount: "200.00" });
  });
});

describe("desconto MANUAL do contrato (Item 6)", () => {
  const regras = [
    { minDays: 3, discountPercent: "5.00" },
    { minDays: 5, discountPercent: "10.00" },
  ];

  it("substitui a faixa, não soma (decisão do Matheus)", () => {
    // 5 dias dariam 10% pela faixa; o manual de 25% entra no lugar
    expect(effectiveDiscountPercent(regras, 5, 25)).toBe(25);
    // manual MENOR que a faixa também vence: quem manda é a decisão dela
    expect(effectiveDiscountPercent(regras, 5, 3)).toBe(3);
  });

  it("sem manual, vale a faixa", () => {
    expect(effectiveDiscountPercent(regras, 5, null)).toBe(10);
    expect(effectiveDiscountPercent(regras, 5, undefined)).toBe(10);
    expect(effectiveDiscountPercent(regras, 5, "")).toBe(10);
    expect(effectiveDiscountPercent(regras, 5, 0)).toBe(10);
  });

  it("aceita string (o banco devolve numeric como string) e trava em 100", () => {
    expect(effectiveDiscountPercent(regras, 5, "12.50")).toBe(12.5);
    expect(effectiveDiscountPercent(regras, 5, 150)).toBe(100);
  });

  it("entra no preço no lugar do desconto por dias", () => {
    expect(computeRentalTotal({
      dailyRate: "100.00", quantity: 1,
      startDate: "2026-07-20", endDate: "2026-07-25", rules: regras,
      manualPercent: 30,
    })).toEqual({ numDays: 5, discountPercent: 30, totalAmount: "350.00" });
  });
});

describe("devolução antecipada (F10)", () => {
  let db: any;
  let clientId: number, bikeId: number, bikeSizeId: number;

  /** Aluguel de 5 dias (20→25/07) a R$100/dia com a regra vigente. */
  const novoAluguel = async (opts: { total: string; contractId?: number; status?: string; paid?: boolean }) => {
    const id = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-20", endDate: "2026-07-25",
      status: opts.status ?? "active", contractId: opts.contractId ?? null,
    });
    await db.update(schema.rentals).set({
      dailyRate: "100.00",
      totalAmount: opts.total,
      discountPercent: "10.00",
      ...(opts.paid ? { paymentStatus: "paid" as const } : {}),
    }).where(eq(schema.rentals.id, id));
    return id;
  };
  const rentalById = async (id: number) => {
    const [r] = await db.select().from(schema.rentals).where(eq(schema.rentals.id, id));
    return r;
  };

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId; bikeId = seed.bikeId; bikeSizeId = seed.bikeSizeId;
    // 5 dias = 10% (é a faixa que o cliente PERDE ao devolver antes)
    await db.insert(schema.bikeDiscountRules).values({ bikeId, minDays: 5, discountPercent: "10.00" });
  });

  it("cobra os dias usados e PERDE o desconto da faixa maior", async () => {
    const id = await novoAluguel({ total: "450.00" }); // 5d × 100 − 10%
    const pv = await previewEarlyReturn(db, id, "2026-07-21");
    expect(pv).toMatchObject({
      removedDays: 4, oldDays: 5, newDays: 1,
      oldTotal: "450.00", newTotal: "100.00", creditAmount: "350.00",
      oldDiscountPercent: 10, newDiscountPercent: 0,
      capped: false, alreadyPaid: false, newEndDate: "2026-07-21",
    });
    // preview NÃO grava
    expect((await rentalById(id)).endDate).toBe("2026-07-25");
  });

  it("devolver na data combinada (ou depois) não é antecipada", async () => {
    const id = await novoAluguel({ total: "450.00" });
    expect(await previewEarlyReturn(db, id, "2026-07-25")).toBeNull();
    expect(await previewEarlyReturn(db, id, "2026-07-28")).toBeNull();
  });

  it("devolver antes do início cobra 1 diária, nunca zero", async () => {
    const id = await novoAluguel({ total: "450.00" });
    const pv = await previewEarlyReturn(db, id, "2026-07-18");
    expect(pv).toMatchObject({ newEndDate: "2026-07-20", newDays: 1, newTotal: "100.00" });
  });

  it("aplica: encurta o período, regrava valor/desconto e abate o contrato", async () => {
    const [contract] = await db.insert(schema.contracts)
      .values({ clientId, status: "ativo", valorTotal: "450.00" })
      .returning({ id: schema.contracts.id });
    const id = await novoAluguel({ total: "450.00", contractId: contract.id });

    const pv = await applyEarlyReturn(db, id, "2026-07-22");
    expect(pv).toMatchObject({ newDays: 2, newTotal: "200.00", creditAmount: "250.00" });

    const r = await rentalById(id);
    expect(r.endDate).toBe("2026-07-22");
    expect(r.totalAmount).toBe("200.00");
    expect(r.discountPercent).toBeNull(); // 2 dias não atingem a faixa de 5
    const [ct] = await db.select().from(schema.contracts).where(eq(schema.contracts.id, contract.id));
    expect(ct.valorTotal).toBe("200.00");
  });

  it("marca alreadyPaid quando o contrato já foi pago (vira estorno no router)", async () => {
    const id = await novoAluguel({ total: "450.00", paid: true });
    expect((await previewEarlyReturn(db, id, "2026-07-21"))!.alreadyPaid).toBe(true);
  });

  it("ignora aluguel devolvido, cancelado ou arquivado (sem recálculo em dobro)", async () => {
    const devolvido = await novoAluguel({ total: "450.00", status: "returned" });
    expect(await previewEarlyReturn(db, devolvido, "2026-07-21")).toBeNull();
    const cancelado = await novoAluguel({ total: "450.00", status: "cancelled" });
    expect(await previewEarlyReturn(db, cancelado, "2026-07-21")).toBeNull();
    const arquivado = await novoAluguel({ total: "450.00" });
    await db.update(schema.rentals).set({ deletedAt: new Date() }).where(eq(schema.rentals.id, arquivado));
    expect(await previewEarlyReturn(db, arquivado, "2026-07-21")).toBeNull();
  });

  it("aluguéis abertos do contrato (o que o encerramento recalcula)", async () => {
    const [contract] = await db.insert(schema.contracts)
      .values({ clientId, status: "ativo", valorTotal: "900.00" })
      .returning({ id: schema.contracts.id });
    const aberto = await novoAluguel({ total: "450.00", contractId: contract.id });
    const fechado = await novoAluguel({ total: "450.00", contractId: contract.id, status: "returned" });
    const ids = await contractOpenRentalIds(db, contract.id);
    expect(ids).toContain(aberto);
    expect(ids).not.toContain(fechado);
  });
});

describe("devolução antecipada — trava anti-aumento", () => {
  let db: any;
  let clientId: number, bikeId: number, bikeSizeId: number;

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId; bikeId = seed.bikeId; bikeSizeId = seed.bikeSizeId;
    // Desconto agressivo: 5 dias = 30% (350) < 4 diárias cheias (400)
    await db.insert(schema.bikeDiscountRules).values({ bikeId, minDays: 5, discountPercent: "30.00" });
  });

  it("devolver antes NUNCA aumenta a conta — trava no valor combinado", async () => {
    const id = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-20", endDate: "2026-07-25", status: "active",
    });
    await db.update(schema.rentals)
      .set({ dailyRate: "100.00", totalAmount: "350.00", discountPercent: "30.00" })
      .where(eq(schema.rentals.id, id));

    const pv = await previewEarlyReturn(db, id, "2026-07-24");
    expect(pv).toMatchObject({
      capped: true, newTotal: "350.00", creditAmount: "0.00", newDiscountPercent: 30,
    });
  });
});

describe("devolução antecipada com desconto MANUAL", () => {
  let db: any;
  let clientId: number, bikeId: number, bikeSizeId: number;

  beforeAll(async () => {
    db = await createTestDb();
    const seed = await seedBasics(db);
    clientId = seed.clientId; bikeId = seed.bikeId; bikeSizeId = seed.bikeSizeId;
    // faixa de 10% para 5 dias — é a que o desconto manual substitui
    await db.insert(schema.bikeDiscountRules).values({ bikeId, minDays: 5, discountPercent: "10.00" });
  });

  /** Contrato com desconto manual de 20% e um aluguel de 5 dias a R$100. */
  const cenario = async (descontoManual: string | null) => {
    const [contract] = await db.insert(schema.contracts)
      .values({ clientId, valorTotal: "400.00", status: "ativo", descontoPercent: descontoManual })
      .returning({ id: schema.contracts.id });
    const id = await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-07-20", endDate: "2026-07-25", status: "active", contractId: contract.id,
    });
    await db.update(schema.rentals)
      .set({ dailyRate: "100.00", totalAmount: "400.00", discountPercent: descontoManual ?? "10.00" })
      .where(eq(schema.rentals.id, id));
    return id;
  };

  it("mantém o desconto combinado ao encurtar (não volta pra faixa por dias)", async () => {
    const id = await cenario("20.00"); // 5d × 100 − 20% = 400
    const pv = await previewEarlyReturn(db, id, "2026-07-22");
    // 2 diárias × 100 − 20% = 160. Com a faixa (0% em 2 dias) daria 200 — ou
    // seja, sem o manual o cliente pagaria MAIS por devolver antes.
    expect(pv).toMatchObject({
      newDays: 2, newTotal: "160.00", creditAmount: "240.00",
      oldDiscountPercent: 20, newDiscountPercent: 20, capped: false,
    });
  });

  it("sem desconto manual no contrato, continua valendo a faixa", async () => {
    const id = await cenario(null);
    const pv = await previewEarlyReturn(db, id, "2026-07-22");
    expect(pv).toMatchObject({ newDays: 2, newDiscountPercent: 0, newTotal: "200.00" });
  });
});
