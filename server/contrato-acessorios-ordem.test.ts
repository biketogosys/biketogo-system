/**
 * Acessórios DENTRO do contrato na ordem do número do nome (2026-11-17).
 *
 * A dona, com print da tela do contrato: *"ainda ta 'fora de ordem' no
 * contrato"*. O S18 (2026-11-07) ordenou só `accessories.list`, que é a tela
 * Acessórios e a etapa de escolha do novo contrato. Depois de escolhidos, os
 * acessórios do contrato eram lidos de `contract_accessories` sem ORDER BY em
 * quatro lugares, e cada um saía na ordem que o banco devolvesse:
 *
 *  1. a tela do contrato (`contracts.getById`), a do print;
 *  2. o PDF (`buildContractPdfData`);
 *  3. a página que o cliente abre pelo link (`contracts.contractByToken`);
 *  4. o e-mail do contrato (`carregarDadosContrato`).
 *
 * Os quatro são o mesmo contrato, então a ordem é a mesma nos quatro.
 *
 * ⚠️ O `db.ts` é o de verdade (DEV_PGLITE + `./dev-db` mockado), como em
 * `acessorios-ordem.test.ts`: a página pública lê configurações por ele.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  const antes = process.env.DEV_PGLITE;
  process.env.DEV_PGLITE = "1";
  return { db: null as any, antes };
});

vi.mock("./dev-db", () => ({ getDevDb: async () => alvo.db }));

const { appRouter, buildContractPdfData, signContractToken } = await import("./routers");
const { carregarDadosContrato } = await import("./email-contract");

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

/**
 * Escolhidos fora de ordem, como no contrato do print: uma linha POR UNIDADE,
 * então o que foi levado em dobro aparece duas vezes, e não juntas.
 */
const ESCOLHA = [
  "0003 - Capacete",
  "0010 - Suporte de ciclocomputador",
  "0003 - Capacete",
  "0001 - Farol Dianteiro",
  "Garrafinha",
  "0002 - Farol Traseiro",
  "0001 - Farol Dianteiro",
];
const NA_ORDEM = [
  "0001 - Farol Dianteiro",
  "0001 - Farol Dianteiro",
  "0002 - Farol Traseiro",
  "0003 - Capacete",
  "0003 - Capacete",
  "0010 - Suporte de ciclocomputador",
  "Garrafinha",
];

let contractId: number;

beforeAll(async () => {
  alvo.db = await createTestDb();
  const base = await seedBasics(alvo.db);
  const [c] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "450.00", status: "ativo" })
    .returning({ id: schema.contracts.id });
  contractId = c.id;

  const idDoAcessorio = new Map<string, number>();
  for (const name of ESCOLHA) {
    if (!idDoAcessorio.has(name)) {
      const [a] = await alvo.db.insert(schema.accessories)
        .values({ name, quantity: 2, quantidadeTotal: 2 })
        .returning({ id: schema.accessories.id });
      idDoAcessorio.set(name, a.id);
    }
    await alvo.db.insert(schema.contractAccessories)
      .values({ contractId, accessoryId: idDoAcessorio.get(name)!, qty: 1 });
  }
});

afterAll(() => {
  if (alvo.antes === undefined) delete process.env.DEV_PGLITE;
  else process.env.DEV_PGLITE = alvo.antes;
});

describe("acessórios do contrato na ordem do número", () => {
  it("tela do contrato", async () => {
    const r = await appRouter.createCaller(contextoAdmin()).contracts.getById({ id: contractId });
    expect(r.accessories.map((a) => a.accessoryName)).toEqual(NA_ORDEM);
  });

  it("o mesmo acessório fica na ordem em que foi escolhido (empate pelo id da linha)", async () => {
    const r = await appRouter.createCaller(contextoAdmin()).contracts.getById({ id: contractId });
    const capacetes = r.accessories.filter((a) => a.accessoryName === "0003 - Capacete").map((a) => a.id);
    expect(capacetes).toEqual([...capacetes].sort((a, b) => a - b));
  });

  it("PDF", async () => {
    const dados = await buildContractPdfData(alvo.db, contractId);
    expect(dados.accessories.map((a) => a.accessoryName)).toEqual(NA_ORDEM);
  });

  it("página que o cliente abre pelo link", async () => {
    const r = await appRouter.createCaller({ ...contextoAdmin(), user: null } as TrpcContext)
      .publicApi.contractByToken({ token: signContractToken(contractId) });
    expect(r.acessorios.map((a: { nome: string | null }) => a.nome)).toEqual(NA_ORDEM);
  });

  it("e-mail do contrato, que agrupa as unidades", async () => {
    const dados = await carregarDadosContrato(alvo.db, contractId);
    expect(dados?.acessorios).toEqual([
      { nome: "0001 - Farol Dianteiro", qty: 2 },
      { nome: "0002 - Farol Traseiro", qty: 1 },
      { nome: "0003 - Capacete", qty: 2 },
      { nome: "0010 - Suporte de ciclocomputador", qty: 1 },
      { nome: "Garrafinha", qty: 1 },
    ]);
  });
});
