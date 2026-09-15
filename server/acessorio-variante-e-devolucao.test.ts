/**
 * Dois pedidos da Cassiana de 2026-09-14, contra as PROCEDURES de verdade.
 *
 * 1. **Renomear variante de acessório.** *"esse nome não consigo alterar? eu vi
 *    essa semana que é 120cm, não 150cm"*. O que se protege: o nome muda nas
 *    unidades E continua ligado aos contratos que já reservaram essas unidades
 *    (é por isso que renomear é seguro e excluir não é).
 *
 * 2. **Nº da bike no detalhe do contrato.** O número já vinha do servidor, mas a
 *    devolução rápida da Agenda APAGAVA o vínculo com a unidade física — a bike
 *    devolvida por ali perdia o número para sempre. O que se protege: o número
 *    sobrevive à devolução, e a unidade continua livre para o próximo aluguel.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  return { db: null as any };
});

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const s = await import("../drizzle/schema");
  const { eq: eqM } = await import("drizzle-orm");
  return {
    ...real,
    getDb: async () => alvo.db,
    // ⚠️ Estas moram DENTRO do `db.ts` e usam o `getDb` LOCAL, que o mock não
    // alcança — sem reimplementar, leriam e gravariam num banco ausente.
    getRentalById: async (id: number) => {
      const [r] = await alvo.db.select().from(s.rentals).where(eqM(s.rentals.id, id));
      return r;
    },
    updateRental: async (id: number, data: any) => {
      await alvo.db.update(s.rentals).set(data).where(eqM(s.rentals.id, id));
    },
    createAuditLog: async (data: any) => {
      await alvo.db.insert(s.auditLogs).values({
        adminId: data.adminId ?? null, acao: data.acao, tabela: data.tabela,
        registroId: data.registroId ?? null, dadosAntes: data.dadosAntes ?? null,
        dadosDepois: data.dadosDepois ?? null, ip: data.ip ?? null,
      });
    },
  };
});

const { appRouter, findAvailableBikeUnits } = await import("./routers");

function contextoAdmin(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-teste", email: "admin@teste.local", name: "Admin Teste",
      loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}
const comoAdmin = () => appRouter.createCaller(contextoAdmin());

beforeEach(async () => {
  alvo.db = await createTestDb();
});

// ─── 1. Variante ─────────────────────────────────────────────────────────────

/** Acessório "Cadeirinha" com 3 unidades "Btwin - 150cm" e 2 "Btwin - 100cm". */
async function seedAcessorio() {
  const [acc] = await alvo.db.insert(schema.accessories)
    .values({ name: "Cadeirinha infantil" }).returning({ id: schema.accessories.id });
  const unidades = await alvo.db.insert(schema.accessoryUnits).values([
    { accessoryId: acc.id, serialNumber: "CAD-001", variante: "Btwin - 150cm" },
    { accessoryId: acc.id, serialNumber: "CAD-002", variante: "Btwin - 150cm" },
    { accessoryId: acc.id, serialNumber: "CAD-003", variante: "Btwin - 150cm" },
    { accessoryId: acc.id, serialNumber: "CAD-004", variante: "Btwin - 100cm" },
    { accessoryId: acc.id, serialNumber: "CAD-005", variante: "Btwin - 100cm" },
  ]).returning({ id: schema.accessoryUnits.id });
  return { accessoryId: acc.id, unidades: unidades.map((u: any) => u.id) };
}

async function variantes(accessoryId: number) {
  const rows = await alvo.db.select({ v: schema.accessoryUnits.variante })
    .from(schema.accessoryUnits).where(eq(schema.accessoryUnits.accessoryId, accessoryId));
  const cont: Record<string, number> = {};
  for (const r of rows) cont[r.v ?? "(padrão)"] = (cont[r.v ?? "(padrão)"] ?? 0) + 1;
  return cont;
}

describe("accessories.renameVariante", () => {
  it("⭐ o caso dela: 150cm vira 120cm em TODAS as unidades do grupo", async () => {
    const { accessoryId } = await seedAcessorio();

    const r = await comoAdmin().accessories.renameVariante({
      accessoryId, de: "Btwin - 150cm", para: "Btwin - 120cm",
    });

    expect(r.renomeadas).toBe(3);
    expect(await variantes(accessoryId)).toEqual({ "Btwin - 120cm": 3, "Btwin - 100cm": 2 });
  });

  it("contrato que já reservou a unidade passa a mostrar o nome NOVO (o vínculo é pelo unitId)", async () => {
    const { accessoryId, unidades } = await seedAcessorio();
    const base = await seedBasics(alvo.db);
    const [ct] = await alvo.db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "100.00", status: "ativo" })
      .returning({ id: schema.contracts.id });
    await alvo.db.insert(schema.contractAccessories)
      .values({ contractId: ct.id, accessoryId, qty: 1, unitId: unidades[0], status: "ok" });

    await comoAdmin().accessories.renameVariante({ accessoryId, de: "Btwin - 150cm", para: "Btwin - 120cm" });

    const [linha] = await alvo.db
      .select({ variante: schema.accessoryUnits.variante })
      .from(schema.contractAccessories)
      .innerJoin(schema.accessoryUnits, eq(schema.accessoryUnits.id, schema.contractAccessories.unitId))
      .where(eq(schema.contractAccessories.contractId, ct.id));
    expect(linha.variante).toBe("Btwin - 120cm");
  });

  it("nome já usado por OUTRA variante: recusa sem mexer em nada", async () => {
    const { accessoryId } = await seedAcessorio();

    await expect(comoAdmin().accessories.renameVariante({
      accessoryId, de: "Btwin - 150cm", para: "Btwin - 100cm",
    })).rejects.toThrow(/já existe a variante/i);

    expect(await variantes(accessoryId)).toEqual({ "Btwin - 150cm": 3, "Btwin - 100cm": 2 });
  });

  it("com confirmação explícita, junta as unidades no grupo existente", async () => {
    const { accessoryId } = await seedAcessorio();

    await comoAdmin().accessories.renameVariante({
      accessoryId, de: "Btwin - 150cm", para: "Btwin - 100cm", juntar: true,
    });

    expect(await variantes(accessoryId)).toEqual({ "Btwin - 100cm": 5 });
  });

  it("dá nome ao grupo Padrão (unidades sem variante)", async () => {
    const [acc] = await alvo.db.insert(schema.accessories)
      .values({ name: "Cadeado" }).returning({ id: schema.accessories.id });
    await alvo.db.insert(schema.accessoryUnits).values([
      { accessoryId: acc.id, serialNumber: "CAD-1" },
      { accessoryId: acc.id, serialNumber: "CAD-2" },
    ]);

    await comoAdmin().accessories.renameVariante({ accessoryId: acc.id, de: null, para: "Com chave" });

    expect(await variantes(acc.id)).toEqual({ "Com chave": 2 });
  });

  it("não aceita nome em branco", async () => {
    const { accessoryId } = await seedAcessorio();
    await expect(comoAdmin().accessories.renameVariante({
      accessoryId, de: "Btwin - 150cm", para: "   ",
    })).rejects.toThrow(/novo nome/i);
  });

  it("não mexe nas variantes de OUTRO acessório com o mesmo nome", async () => {
    const a = await seedAcessorio();
    const b = await seedAcessorio(); // outro acessório, mesmos nomes de variante

    await comoAdmin().accessories.renameVariante({ accessoryId: a.accessoryId, de: "Btwin - 150cm", para: "Btwin - 120cm" });

    expect(await variantes(b.accessoryId)).toEqual({ "Btwin - 150cm": 3, "Btwin - 100cm": 2 });
  });

  it("fica registrado na Auditoria com o nome antigo e o novo", async () => {
    const { accessoryId } = await seedAcessorio();
    await comoAdmin().accessories.renameVariante({ accessoryId, de: "Btwin - 150cm", para: "Btwin - 120cm" });

    const [log] = await alvo.db.select().from(schema.auditLogs)
      .where(eq(schema.auditLogs.acao, "renomeou_variante_acessorio"));
    expect(log.dadosAntes).toMatchObject({ variante: "Btwin - 150cm" });
    expect(log.dadosDepois).toMatchObject({ variante: "Btwin - 120cm", unidades: 3 });
  });
});

// ─── 2. Nº da bike depois da devolução rápida ────────────────────────────────

describe("dashboard.markReturned — o nº da bike sobrevive à devolução", () => {
  async function contratoComUnidade() {
    const base = await seedBasics(alvo.db);
    await alvo.db.update(schema.bikeUnits).set({ numeroSistema: "RD-BSC-253" })
      .where(eq(schema.bikeUnits.id, base.unitIds[0]));
    const [ct] = await alvo.db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "396.00", status: "ativo" })
      .returning({ id: schema.contracts.id });
    const [r] = await alvo.db.insert(schema.rentals).values({
      clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId, quantity: 1,
      startDate: "2026-09-11", endDate: "2026-09-13", status: "active", contractId: ct.id,
      totalAmount: "396.00",
    }).returning({ id: schema.rentals.id });
    await alvo.db.insert(schema.rentalBikeUnits).values({ rentalId: r.id, bikeUnitId: base.unitIds[0] });
    return { ...base, contractId: ct.id, rentalId: r.id };
  }

  it("⭐ depois do 'Devolvida' da Agenda, o contrato ainda sabe qual bike foi", async () => {
    const ct = await contratoComUnidade();

    await comoAdmin().dashboard.markReturned({ rentalId: ct.rentalId });

    const detalhe = await comoAdmin().contracts.getById({ id: ct.contractId });
    const aluguel = (detalhe as any).rentals.find((r: any) => r.id === ct.rentalId);
    expect(aluguel.status).toBe("returned");
    expect(aluguel.bikeUnitNumeros).toEqual(["RD-BSC-253"]);
  });

  it("e a unidade continua LIVRE para outro aluguel no mesmo período (manter o vínculo não prende)", async () => {
    const ct = await contratoComUnidade();

    await comoAdmin().dashboard.markReturned({ rentalId: ct.rentalId });

    const livres = await findAvailableBikeUnits(alvo.db, {
      bikeSizeId: ct.bikeSizeId, startDate: "2026-09-12", endDate: "2026-09-14",
    });
    expect(livres.map((u) => u.id)).toContain(ct.unitIds[0]);
  });

  it("antes de devolver, a mesma unidade está OCUPADA naquele período (o teste acima não é trivial)", async () => {
    const ct = await contratoComUnidade();

    const livres = await findAvailableBikeUnits(alvo.db, {
      bikeSizeId: ct.bikeSizeId, startDate: "2026-09-12", endDate: "2026-09-14",
    });
    expect(livres.map((u) => u.id)).not.toContain(ct.unitIds[0]);
  });
});
