/**
 * Código (nº de sistema) da unidade de acessório editável pela loja (2026-11-26).
 *
 * A dona viu no PDF a coluna "Nº sistema" (CAP-020, BOM-009...) e perguntou
 * se o sistema gerava sozinho e se dava para alterar. Gera: 3 letras do nome
 * e a sequência do acessório. Alterar não dava. Perguntada se preferia editar
 * por conta própria: *"Acho que é interessante"*.
 *
 * O que este arquivo protege:
 *  1. o código novo vale na hora em todo lugar que lê a unidade, inclusive na
 *     tela do contrato que já usa aquela unidade;
 *  2. dentro do MESMO acessório não pode repetir (maiúscula e espaço não
 *     contam): dois capacetes "CAP-020" no mesmo contrato tornariam a conferência
 *     da devolução impossível. Entre acessórios diferentes pode, porque o
 *     gerador já faz isso (Farol Dianteiro e Farol Traseiro saem os dois FAR);
 *  3. fica na Auditoria quem trocou, de quê para quê.
 *
 * ⚠️ Roda a procedure de verdade contra PGlite.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => ({ db: null as any }));

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const s = await import("../drizzle/schema");
  return {
    ...real,
    getDb: async () => alvo.db,
    // `createAuditLog` mora dentro do `db.ts` e usa o `getDb` de lá, que este
    // mock não alcança: sem reimplementar, o registro sumiria sem erro.
    createAuditLog: async (data: any) => {
      await alvo.db.insert(s.auditLogs).values({
        adminId: data.adminId ?? null,
        acao: data.acao,
        tabela: data.tabela,
        registroId: data.registroId ?? null,
        dadosAntes: data.dadosAntes ?? null,
        dadosDepois: data.dadosDepois ?? null,
      });
    },
  };
});

const { appRouter } = await import("./routers");

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

async function acessorio(name: string) {
  const [a] = await alvo.db.insert(schema.accessories)
    .values({ name, quantity: 2, quantidadeTotal: 2 })
    .returning({ id: schema.accessories.id });
  return a.id as number;
}

async function unidade(accessoryId: number, serialNumber: string) {
  const [u] = await alvo.db.insert(schema.accessoryUnits)
    .values({ accessoryId, serialNumber, status: "disponivel" })
    .returning({ id: schema.accessoryUnits.id });
  return u.id as number;
}

const codigo = async (unitId: number) =>
  (await alvo.db.select({ c: schema.accessoryUnits.serialNumber }).from(schema.accessoryUnits)
    .where(eq(schema.accessoryUnits.id, unitId)))[0].c;

let capacete: number;
let cap1: number;
let cap2: number;
let farolTraseiro: number;

beforeEach(async () => {
  alvo.db = await createTestDb();
  capacete = await acessorio("0003 - Capacete");
  cap1 = await unidade(capacete, "CAP-001");
  cap2 = await unidade(capacete, "CAP-002");
  farolTraseiro = await acessorio("0002 - Farol Traseiro");
  await unidade(farolTraseiro, "FAR-001");
});

describe("editar o código da unidade de acessório", () => {
  it("troca o código, sem os espaços das pontas", async () => {
    await comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: "  C-20  " });
    expect(await codigo(cap1)).toBe("C-20");
  });

  it("a tela do contrato que usa a unidade já mostra o código novo", async () => {
    const base = await seedBasics(alvo.db);
    const [c] = await alvo.db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "100.00", status: "ativo" })
      .returning({ id: schema.contracts.id });
    await alvo.db.insert(schema.contractAccessories)
      .values({ contractId: c.id, accessoryId: capacete, qty: 1, unitId: cap1 });

    await comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: "CAP-020" });

    const detalhe = await comoAdmin().contracts.getById({ id: c.id });
    expect(detalhe.accessories[0].serialNumber).toBe("CAP-020");
  });

  it("não repete código dentro do mesmo acessório, nem com maiúscula ou espaço diferente", async () => {
    await expect(comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: " cap-002 " }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect(await codigo(cap1)).toBe("CAP-001");
  });

  it("pode repetir o código de OUTRO acessório", async () => {
    await comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: "FAR-001" });
    expect(await codigo(cap1)).toBe("FAR-001");
  });

  it("salvar o mesmo código na própria unidade não é conflito", async () => {
    await comoAdmin().accessories.updateUnitCode({ unitId: cap2, serialNumber: "cap-002" });
    expect(await codigo(cap2)).toBe("cap-002");
  });

  it("código vazio é recusado", async () => {
    await expect(comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: "   " }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await codigo(cap1)).toBe("CAP-001");
  });

  it("unidade que não existe dá NOT_FOUND", async () => {
    await expect(comoAdmin().accessories.updateUnitCode({ unitId: 999_999, serialNumber: "X-1" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fica na Auditoria o código de antes e o de depois", async () => {
    await comoAdmin().accessories.updateUnitCode({ unitId: cap1, serialNumber: "CAP-020" });
    const [log] = await alvo.db.select().from(schema.auditLogs)
      .where(eq(schema.auditLogs.acao, "editou_codigo_acessorio"));
    // Registro é o ACESSÓRIO, como no "Renomeou variante": é o que a Auditoria
    // sabe nomear ("Acessório #N"). A unidade vai junto nos dados.
    expect(log).toMatchObject({
      tabela: "accessories",
      registroId: capacete,
      dadosAntes: { serialNumber: "CAP-001" },
      dadosDepois: { serialNumber: "CAP-020", unitId: cap1 },
    });
  });
});
