/**
 * Aba Arquivados: busca pelo nome do cliente e mais recente primeiro.
 *
 * Pedido da dona (2026-11-10): "Se eu precisar pesquisar um contrato arquivado,
 * vc consegue criar um campo de pesquisa com nome do cliente? E ordenar pelo
 * contrato mais recente primeiro, melhor também".
 *
 * O que este arquivo protege, em ordem de importância:
 *  1. a busca olha TODOS os arquivados, não só a página aberta (a lista vem de 20
 *     em 20; filtrar na tela esconderia o contrato da página 2);
 *  2. quem digita sem acento acha o nome com acento, e o contrário. A loja atende
 *     muito cliente com nome em espanhol, e "joao" sem achar "João" pareceria
 *     contrato perdido;
 *  3. a aba Ativos continua como estava: o pedido foi sobre os arquivados.
 *
 * Roda a procedure de verdade: a condição de busca vive na query.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => ({ db: null as any }));

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  return { ...real, getDb: async () => alvo.db };
});

const { appRouter } = await import("./routers");

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

type Filtro = { view: "ativos" | "arquivados"; search?: string; page?: number; limit?: number };
const listar = (filtro: Filtro) => appRouter.createCaller(contextoAdmin()).contracts.list(filtro);
const ids = async (filtro: Filtro) => (await listar(filtro)).items.map((c) => c.id);
const buscar = (search: string) => ids({ view: "arquivados", search });

let base: { clientId: number; bikeId: number; bikeSizeId: number };

async function cliente(name: string): Promise<number> {
  const [c] = await alvo.db.insert(schema.clients).values({ name }).returning({ id: schema.clients.id });
  return c.id;
}

async function contrato(
  clientId: number,
  criadoEm: string,
  extra: { status?: "ativo" | "encerrado" | "cancelado"; pago?: boolean; excluido?: boolean } = {},
): Promise<number> {
  const status = extra.status ?? "encerrado";
  const [c] = await alvo.db.insert(schema.contracts).values({
    clientId, valorTotal: "450.00", status, criadoEm: new Date(criadoEm),
    deletedAt: extra.excluido ? new Date() : null,
  }).returning({ id: schema.contracts.id });
  await alvo.db.insert(schema.rentals).values({
    clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId, quantity: 1,
    startDate: "2026-08-10", endDate: "2026-08-15",
    status: status === "ativo" ? "active" : "returned",
    contractId: c.id, totalAmount: "450.00",
    paymentStatus: extra.pago === false ? "pending" : "paid",
  });
  return c.id;
}

describe("aba Arquivados: busca e ordem", () => {
  let joaoJaneiro: number;
  let joanaFevereiro: number;
  let mariaMarco: number;
  let empateA: number;
  let empateB: number;
  let joaoMaio: number;
  let ativoJunho: number;
  let aReceberJulho: number;

  beforeAll(async () => {
    alvo.db = await createTestDb();
    base = await seedBasics(alvo.db);

    const joao = await cliente("João Antônio Pereira");
    const joana = await cliente("Joana Ribeiro");
    const maria = await cliente("María José Fernández Núñez");
    const outro = await cliente("Bruno Lima");

    joaoJaneiro = await contrato(joao, "2026-01-10T12:00:00Z");
    joanaFevereiro = await contrato(joana, "2026-02-10T12:00:00Z", { status: "cancelado", pago: false });
    mariaMarco = await contrato(maria, "2026-03-10T12:00:00Z");
    empateA = await contrato(outro, "2026-04-10T12:00:00Z");
    empateB = await contrato(outro, "2026-04-10T12:00:00Z");
    joaoMaio = await contrato(joao, "2026-05-10T12:00:00Z");

    // Três contratos do João que NÃO podem aparecer em Arquivados.
    ativoJunho = await contrato(joao, "2026-06-10T12:00:00Z", { status: "ativo" });
    aReceberJulho = await contrato(joao, "2026-07-10T12:00:00Z", { pago: false });
    await contrato(joao, "2026-08-10T12:00:00Z", { excluido: true });
  });

  it("arquivados vêm do mais recente para o mais antigo", async () => {
    expect(await ids({ view: "arquivados" })).toEqual([
      joaoMaio, empateB, empateA, mariaMarco, joanaFevereiro, joaoJaneiro,
    ]);
  });

  it("a aba Ativos continua do mais antigo para o mais recente", async () => {
    expect(await ids({ view: "ativos" })).toEqual([ativoJunho, aReceberJulho]);
  });

  it("acha pelo pedaço do nome, sem diferença de maiúscula", async () => {
    expect(await buscar("PEREIRA")).toEqual([joaoMaio, joaoJaneiro]);
  });

  it("digitar sem acento acha o nome com acento", async () => {
    expect(await buscar("joao")).toEqual([joaoMaio, joaoJaneiro]);
    expect(await buscar("nunez")).toEqual([mariaMarco]);
  });

  it("digitar com acento acha o nome sem acento", async () => {
    expect(await buscar("Jõana")).toEqual([joanaFevereiro]);
    expect(await buscar("JOÃO")).toEqual([joaoMaio, joaoJaneiro]);
  });

  it("todas as letras acentuadas ficam alinhadas com a sem acento", async () => {
    const maiusculas = await contrato(await cliente("ÁÀÂÃÄÅ ÉÈÊË ÍÌÎÏ ÓÒÔÕÖ ÚÙÛÜ Ç Ñ Ý"), "2025-01-01T12:00:00Z");
    const minusculas = await contrato(await cliente("áàâãäå éèêë íìîï óòôõö úùûü ç ñ ýÿ"), "2025-01-02T12:00:00Z");
    expect(await buscar("aaaaaa eeee iiii ooooo uuuu")).toEqual([minusculas, maiusculas]);
    expect(await buscar("yy")).toEqual([minusculas]);
  });

  it("nome e sobrenome achados mesmo fora de ordem e sem as palavras do meio", async () => {
    expect(await buscar("maria nunez")).toEqual([mariaMarco]);
    expect(await buscar("nunez maria")).toEqual([mariaMarco]);
  });

  it("todas as palavras precisam estar no nome", async () => {
    expect(await buscar("joao ribeiro")).toEqual([]);
  });

  it("não traz contrato ativo, a receber nem excluído do mesmo cliente", async () => {
    const achados = await buscar("joao");
    expect(achados).not.toContain(ativoJunho);
    expect(achados).not.toContain(aReceberJulho);
    expect(achados).toHaveLength(2);
  });

  it("a contagem e as páginas são as do resultado, não as da lista inteira", async () => {
    const pagina2 = await listar({ view: "arquivados", search: "joao", limit: 1, page: 2 });
    expect(pagina2.items.map((c) => c.id)).toEqual([joaoJaneiro]);
    expect(pagina2.total).toBe(2);
    expect(pagina2.totalPages).toBe(2);
  });

  it("% e _ são letras comuns, não curinga", async () => {
    expect(await buscar("%")).toEqual([]);
    expect(await buscar("_")).toEqual([]);
    expect(await buscar("jo%o")).toEqual([]);
  });

  it("campo só com espaços não filtra", async () => {
    expect(await ids({ view: "arquivados", search: "   " })).toEqual(await ids({ view: "arquivados" }));
  });
});
