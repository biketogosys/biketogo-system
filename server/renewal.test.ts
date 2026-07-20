/**
 * F8 — renovação de aluguel (PGlite).
 * Mesma unidade física, recálculo de valor, propagação pro contrato,
 * overdue→active e bloqueio quando a unidade já está reservada.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import { computeExtension, daysBetween, extendRental, findExtensionConflicts } from "./renewal";
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

  it("recusa devolvido, cancelado e data não-posterior", async () => {
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
