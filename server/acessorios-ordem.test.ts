/**
 * Acessórios na ordem do número do nome (2026-11-07).
 *
 * A dona: *"Tem como presente eles pelo numero? (Eu numerei no nome)"* e
 * *"Coloquei o número e depois o nome"*. A lista saía com o último cadastrado
 * primeiro, e a numeração dela não mudava nada: nem na tela Acessórios, nem na
 * etapa de acessórios do novo contrato (as duas leem `accessories.list`).
 *
 * ⚠️ Aqui o `db.ts` é o de VERDADE. O `getDb` dele cai no PGlite pelo caminho
 * do dev local (DEV_PGLITE), e é o `./dev-db` que devolve o banco de teste.
 * Mockar o `./db`, como os outros testes fazem, pularia justamente o código
 * que ordena.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { compararPeloNome } from "./ordem-pelo-nome";
import { createTestDb } from "./test-helpers/pglite-db";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  const antes = process.env.DEV_PGLITE;
  process.env.DEV_PGLITE = "1";
  return { db: null as any, antes };
});

vi.mock("./dev-db", () => ({ getDevDb: async () => alvo.db }));

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

/** Cadastrados fora de ordem, como acontece na loja: o 10 entrou antes do 2. */
const CADASTRO = [
  "3 Cadeirinha infantil",
  "Suporte de celular",
  "10 Bomba de ar",
  "1 Capacete",
  "2 Cadeado",
];
const NA_ORDEM = [
  "1 Capacete",
  "2 Cadeado",
  "3 Cadeirinha infantil",
  "10 Bomba de ar",
  "Suporte de celular",
];

beforeAll(async () => {
  alvo.db = await createTestDb();
  for (const name of CADASTRO) {
    await alvo.db.insert(schema.accessories).values({ name, quantity: 1, quantidadeTotal: 1 });
  }
});

afterAll(() => {
  if (alvo.antes === undefined) delete process.env.DEV_PGLITE;
  else process.env.DEV_PGLITE = alvo.antes;
});

describe("lista de acessórios", () => {
  it("sai na ordem do número do nome, não na do cadastro", async () => {
    const r = await comoAdmin().accessories.list({ page: 1, limit: 100 });
    expect(r.data.map((a: any) => a.name)).toEqual(NA_ORDEM);
  });

  it("a página 2 continua a numeração (ordena antes de paginar)", async () => {
    const p1 = await comoAdmin().accessories.list({ page: 1, limit: 2 });
    const p2 = await comoAdmin().accessories.list({ page: 2, limit: 2 });
    expect(p1.data.map((a: any) => a.name)).toEqual(["1 Capacete", "2 Cadeado"]);
    expect(p2.data.map((a: any) => a.name)).toEqual(["3 Cadeirinha infantil", "10 Bomba de ar"]);
  });

  it("a busca mantém a ordem", async () => {
    const r = await comoAdmin().accessories.list({ search: "ca", page: 1, limit: 100 });
    expect(r.data.map((a: any) => a.name)).toEqual(["1 Capacete", "2 Cadeado", "3 Cadeirinha infantil"]);
  });
});

describe("compararPeloNome", () => {
  const ordenar = (nomes: string[]) => [...nomes].sort(compararPeloNome);

  it("compara o número como número: o 10 vem depois do 9", () => {
    expect(ordenar(["10 Bomba", "9 Luva", "2 Cadeado"])).toEqual(["2 Cadeado", "9 Luva", "10 Bomba"]);
  });

  it("aceita o número escrito de vários jeitos", () => {
    expect(ordenar(["3 - Garrafa", "02. Luva", "1 Capacete"])).toEqual(["1 Capacete", "02. Luva", "3 - Garrafa"]);
  });

  it("sem número vai para o fim, em ordem alfabética, sem ligar para acento", () => {
    expect(ordenar(["Suporte", "Água", "1 Capacete", "bolsa"])).toEqual(["1 Capacete", "Água", "bolsa", "Suporte"]);
  });
});
