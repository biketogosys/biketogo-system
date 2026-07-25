/**
 * Disponibilidade de ACESSÓRIO POR DATA (PGlite, integração contra as
 * migrações reais).
 *
 * O caso que motivou tudo (bug de 2026-07-23): capacete preso num contrato de
 * JULHO contava como indisponível em OUTUBRO, porque a ocupação vinha do
 * status `alugado` e não de overlap de datas.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBasics, makeRental } from "./test-helpers/pglite-db";
import {
  findAvailableAccessoryUnits,
  getAccessoryAvailabilityByPeriod,
  reserveAccessoryUnitForPeriod,
} from "./accessory-availability";
import * as schema from "../drizzle/schema";

describe("disponibilidade de acessório por data", () => {
  let db: any;
  let clientId: number;
  let bikeId: number;
  let bikeSizeId: number;
  let capaceteId: number;
  let unidades: Record<string, number>;

  /** Cria um contrato com 1 rental no período e prende as unidades passadas. */
  async function contratoSegurando(
    startDate: string,
    endDate: string,
    unitIds: number[],
    rentalStatus = "active",
  ) {
    const [c] = await db
      .insert(schema.contracts)
      .values({ clientId, status: "ativo" })
      .returning({ id: schema.contracts.id });
    await makeRental(db, {
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate, endDate, status: rentalStatus, contractId: c.id,
    });
    for (const unitId of unitIds) {
      await db.insert(schema.contractAccessories).values({
        contractId: c.id, accessoryId: capaceteId, qty: 1, unitId, status: "ok",
      });
    }
    return c.id;
  }

  beforeEach(async () => {
    db = await createTestDb();
    const basics = await seedBasics(db);
    clientId = basics.clientId;
    bikeId = basics.bikeId;
    bikeSizeId = basics.bikeSizeId;

    const [acc] = await db
      .insert(schema.accessories)
      .values({ name: "Capacete", obrigatorio: true })
      .returning({ id: schema.accessories.id });
    capaceteId = acc.id;

    unidades = {};
    for (const [variante, status] of [
      ["M", "disponivel"],
      ["M", "disponivel"],
      ["G", "disponivel"],
      ["G", "manutencao"],
    ] as Array<[string, string]>) {
      const [u] = await db
        .insert(schema.accessoryUnits)
        .values({ accessoryId: capaceteId, variante, status })
        .returning({ id: schema.accessoryUnits.id });
      unidades[`${variante}-${Object.keys(unidades).length}`] = u.id;
    }
  });

  const ids = () => Object.values(unidades);

  it("🔴 O BUG: unidade presa em JULHO fica livre em OUTUBRO", async () => {
    const presa = ids()[0];
    await contratoSegurando("2026-07-01", "2026-07-20", [presa]);

    const emJulho = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-10", endDate: "2026-07-15",
    });
    const emOutubro = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-10-01", endDate: "2026-10-10",
    });

    expect(emJulho.map((u) => u.id)).not.toContain(presa); // ocupada no período dela
    expect(emOutubro.map((u) => u.id)).toContain(presa);   // livre depois — era o bug
  });

  it("mesmo com status 'alugado' no banco, o que manda é a data (dado legado)", async () => {
    const presa = ids()[0];
    const { eq } = await import("drizzle-orm");
    // dado legado: o fluxo antigo marcava a unidade como alugado "pra sempre"
    await db.update(schema.accessoryUnits).set({ status: "alugado" })
      .where(eq(schema.accessoryUnits.id, presa));

    const livres = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-10-01", endDate: "2026-10-10",
    });
    expect(livres.map((u) => u.id)).toContain(presa);
  });

  it("manutencao/perdido/roubado saem de circulação em QUALQUER data", async () => {
    const livres = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2030-01-01", endDate: "2030-01-05",
    });
    // 4 unidades, 1 em manutenção → 3 em circulação
    expect(livres).toHaveLength(3);
    expect(livres.every((u) => u.variante !== null)).toBe(true);
  });

  it("filtra por variante ('undefined' = qualquer, valor = aquela)", async () => {
    const soM = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, variante: "M", startDate: "2030-01-01", endDate: "2030-01-05",
    });
    expect(soM).toHaveLength(2);
    expect(soM.every((u) => u.variante === "M")).toBe(true);

    const soG = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, variante: "G", startDate: "2030-01-01", endDate: "2030-01-05",
    });
    expect(soG).toHaveLength(1); // a outra G está em manutenção
  });

  it("rental cancelado/devolvido/deletado NÃO segura a unidade", async () => {
    const u = ids()[0];
    await contratoSegurando("2026-07-01", "2026-07-20", [u], "cancelled");
    const livres = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-05", endDate: "2026-07-10",
    });
    expect(livres.map((x) => x.id)).toContain(u);
  });

  it("excludeContractId: o próprio contrato não bloqueia suas unidades (edição)", async () => {
    const u = ids()[0];
    const contratoId = await contratoSegurando("2026-07-01", "2026-07-20", [u]);

    const semExclude = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-05", endDate: "2026-07-10",
    });
    const comExclude = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-05", endDate: "2026-07-10",
      excludeContractId: contratoId,
    });

    expect(semExclude.map((x) => x.id)).not.toContain(u);
    expect(comExclude.map((x) => x.id)).toContain(u); // volta a aparecer
  });

  it("breakdown por período conta disponivel x total por variante", async () => {
    await contratoSegurando("2026-07-01", "2026-07-20", [ids()[0]]);

    const [julho] = await getAccessoryAvailabilityByPeriod(db, {
      accessoryIds: [capaceteId], startDate: "2026-07-10", endDate: "2026-07-12",
    });
    const [outubro] = await getAccessoryAvailabilityByPeriod(db, {
      accessoryIds: [capaceteId], startDate: "2026-10-10", endDate: "2026-10-12",
    });

    const mJulho = julho.byVariante.find((v) => v.variante === "M")!;
    expect(mJulho).toEqual({ variante: "M", disponivel: 1, total: 2 });

    const mOutubro = outubro.byVariante.find((v) => v.variante === "M")!;
    expect(mOutubro).toEqual({ variante: "M", disponivel: 2, total: 2 });

    // manutenção fora do total: G tem 2 unidades, 1 em manutenção
    expect(outubro.byVariante.find((v) => v.variante === "G")!.total).toBe(1);
  });

  it("reserve devolve unidade livre e respeita jaUsadas (app não-transacional)", async () => {
    const primeira = await reserveAccessoryUnitForPeriod(db, {
      accessoryId: capaceteId, variante: "M", startDate: "2026-11-01", endDate: "2026-11-05",
    });
    expect(primeira).not.toBeNull();

    // 2ª reserva no mesmo payload não pode repetir a unidade
    const segunda = await reserveAccessoryUnitForPeriod(db, {
      accessoryId: capaceteId, variante: "M", startDate: "2026-11-01", endDate: "2026-11-05",
      jaUsadas: [primeira!],
    });
    expect(segunda).not.toBeNull();
    expect(segunda).not.toBe(primeira);

    // só há 2 unidades M — a 3ª tem que dar null
    const terceira = await reserveAccessoryUnitForPeriod(db, {
      accessoryId: capaceteId, variante: "M", startDate: "2026-11-01", endDate: "2026-11-05",
      jaUsadas: [primeira!, segunda!],
    });
    expect(terceira).toBeNull();
  });

  it("reserve NÃO altera o status da unidade (ocupação é derivada)", async () => {
    const { eq } = await import("drizzle-orm");
    const id = await reserveAccessoryUnitForPeriod(db, {
      accessoryId: capaceteId, variante: "M", startDate: "2026-11-01", endDate: "2026-11-05",
    });
    const [u] = await db.select().from(schema.accessoryUnits)
      .where(eq(schema.accessoryUnits.id, id!));
    expect(u.status).toBe("disponivel");
  });

  it("períodos que só encostam nas bordas contam como conflito", async () => {
    const u = ids()[0];
    await contratoSegurando("2026-07-10", "2026-07-20", [u]);
    // começa no dia que o outro termina → sobrepõe (mesma regra das bikes)
    const naBorda = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-20", endDate: "2026-07-25",
    });
    expect(naBorda.map((x) => x.id)).not.toContain(u);

    // começa no dia seguinte → livre
    const depois = await findAvailableAccessoryUnits(db, {
      accessoryId: capaceteId, startDate: "2026-07-21", endDate: "2026-07-25",
    });
    expect(depois.map((x) => x.id)).toContain(u);
  });
});
