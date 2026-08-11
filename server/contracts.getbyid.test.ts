/**
 * `contracts.getById` — as consultas em LOTE (tarefa 2, 2026-08-07).
 *
 * Por que este arquivo existe: o N+1 do detalhe do contrato virou duas consultas
 * `inArray` + agrupamento em memória. É mudança que NÃO altera o comportamento
 * visível, então um erro no agrupamento passaria despercebido: a tela mostraria
 * unidade trocada, variante do acessório errada ou nenhuma, e ninguém notaria
 * até a Cassiana montar um contrato com a bike errada.
 *
 * Na sessão da mudança a garantia foi verificação manual no `dev:local`. Isto
 * aqui é o que sobrevive à próxima pessoa que mexer na procedure.
 *
 * ⚠️ Roda a PROCEDURE DE VERDADE (`appRouter.createCaller`), não uma cópia da
 * query: espelhar a lógica no teste provaria só que a cópia funciona. O `getDb`
 * é apontado para o PGlite; o resto do `./db` continua real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => ({ db: null as any }));

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  return { ...real, getDb: async () => alvo.db };
});

// Importado DEPOIS do vi.mock (que o vitest içá para o topo), então a procedure
// já enxerga o `getDb` apontado para o PGlite.
const { appRouter } = await import("./routers");

/** Contexto de admin pelo ramo `ctx.user.role === "admin"` do adminAuthProcedure. */
function contextoAdmin(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-teste",
      email: "admin@teste.local",
      name: "Admin Teste",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}

const chamar = (id: number) => appRouter.createCaller(contextoAdmin()).contracts.getById({ id });

async function criarContrato(db: any, clientId: number) {
  const [c] = await db.insert(schema.contracts)
    .values({ clientId, valorTotal: "500.00", status: "ativo" })
    .returning({ id: schema.contracts.id });
  return c.id;
}

async function criarAluguel(
  db: any,
  base: { clientId: number; bikeId: number; bikeSizeId: number },
  contractId: number,
  unidades: number[],
) {
  const [r] = await db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: unidades.length, startDate: "2026-09-01", endDate: "2026-09-05",
    status: "active", contractId, totalAmount: "250.00",
  }).returning({ id: schema.rentals.id });
  for (const bikeUnitId of unidades) {
    await db.insert(schema.rentalBikeUnits).values({ rentalId: r.id, bikeUnitId });
  }
  return r.id;
}

beforeEach(async () => {
  alvo.db = await createTestDb();
});

describe("contracts.getById — unidades de bike em lote", () => {
  it("aluguel com DUAS unidades devolve as duas, agrupadas nele", async () => {
    // O caso que o agrupamento pode errar: duas linhas para o MESMO rental.
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    const rentalId = await criarAluguel(alvo.db, base, contratoId, [base.unitIds[0], base.unitIds[1]]);

    const r = await chamar(contratoId);

    expect(r.rentals).toHaveLength(1);
    expect(r.rentals[0].id).toBe(rentalId);
    expect(r.rentals[0].bikeUnitIds).toEqual([base.unitIds[0], base.unitIds[1]]);
    expect(r.rentals[0].bikeUnitNumeros).toEqual(["001", "002"]);
  });

  it("NÃO mistura as unidades entre aluguéis do mesmo contrato", async () => {
    // Se o agrupamento ignorasse o rentalId, os dois viriam com as 3 unidades.
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    const r1 = await criarAluguel(alvo.db, base, contratoId, [base.unitIds[0], base.unitIds[1]]);
    const r2 = await criarAluguel(alvo.db, base, contratoId, [base.unitIds[2]]);

    const r = await chamar(contratoId);
    const porId = new Map(r.rentals.map((x: any) => [x.id, x]));

    expect(porId.get(r1)!.bikeUnitIds).toEqual([base.unitIds[0], base.unitIds[1]]);
    expect(porId.get(r2)!.bikeUnitIds).toEqual([base.unitIds[2]]);
  });

  it("aluguel SEM unidade ligada devolve lista vazia, não quebra", async () => {
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    await criarAluguel(alvo.db, base, contratoId, []);

    const r = await chamar(contratoId);

    expect(r.rentals[0].bikeUnitIds).toEqual([]);
    expect(r.rentals[0].bikeUnitNumeros).toEqual([]);
  });

  it("ordem das unidades é estável (a versão N+1 devolvia o que o banco quisesse)", async () => {
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    // Inseridas fora de ordem de propósito.
    await criarAluguel(alvo.db, base, contratoId, [base.unitIds[2], base.unitIds[0], base.unitIds[1]]);

    const r = await chamar(contratoId);

    expect(r.rentals[0].bikeUnitIds).toEqual([base.unitIds[0], base.unitIds[1], base.unitIds[2]]);
  });
});

describe("contracts.getById — unidades de acessório em lote", () => {
  async function semearAcessorio(db: any, variantes: Array<string | null>) {
    const [acc] = await db.insert(schema.accessories)
      .values({ name: "Capacete", replacementValue: "80.00" })
      .returning({ id: schema.accessories.id });
    const unidades: number[] = [];
    for (let i = 0; i < variantes.length; i++) {
      const [u] = await db.insert(schema.accessoryUnits).values({
        accessoryId: acc.id,
        serialNumber: `CAP-00${i + 1}`,
        variante: variantes[i],
      }).returning({ id: schema.accessoryUnits.id });
      unidades.push(u.id);
    }
    return { accessoryId: acc.id, unidades };
  }

  it("cada linha recebe a série e a variante da SUA unidade", async () => {
    // O erro clássico do agrupamento: as duas linhas saírem com a mesma unidade.
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    const { accessoryId, unidades } = await semearAcessorio(alvo.db, ["M", "G"]);
    for (const unitId of unidades) {
      await alvo.db.insert(schema.contractAccessories)
        .values({ contractId: contratoId, accessoryId, qty: 1, unitId });
    }

    const r = await chamar(contratoId);
    const porUnidade = new Map(r.accessories.map((a: any) => [a.unitId, a]));

    expect(r.accessories).toHaveLength(2);
    expect(porUnidade.get(unidades[0])).toMatchObject({ serialNumber: "CAP-001", variante: "M" });
    expect(porUnidade.get(unidades[1])).toMatchObject({ serialNumber: "CAP-002", variante: "G" });
  });

  it("linha SEM unidade vinculada devolve série e variante nulas", async () => {
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    const { accessoryId } = await semearAcessorio(alvo.db, ["M"]);
    await alvo.db.insert(schema.contractAccessories)
      .values({ contractId: contratoId, accessoryId, qty: 2, unitId: null });

    const r = await chamar(contratoId);

    expect(r.accessories).toHaveLength(1);
    expect(r.accessories[0].serialNumber).toBeNull();
    expect(r.accessories[0].variante).toBeNull();
  });

  it("contrato SEM acessório nenhum não quebra (guarda de lista vazia)", async () => {
    const base = await seedBasics(alvo.db);
    const contratoId = await criarContrato(alvo.db, base.clientId);
    await criarAluguel(alvo.db, base, contratoId, [base.unitIds[0]]);

    const r = await chamar(contratoId);

    expect(r.accessories).toEqual([]);
    expect(r.rentals).toHaveLength(1);
  });
});
