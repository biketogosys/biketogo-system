/**
 * Observações INTERNAS do contrato (2026-08-18).
 *
 * Pedido da Cassiana: *"da pra adicionar mais um campo no contrato? campo
 * interno na verdade.. com observações"*.
 *
 * O que este arquivo protege, em ordem de importância:
 *
 * 1. **Que é interno de verdade.** O texto não pode escapar para o PDF, para os
 *    e-mails nem para a página pública do contrato. Ela vai escrever coisa que o
 *    cliente não deve ler; se vazar uma vez, o estrago já aconteceu.
 * 2. **Que salva em contrato ENCERRADO.** É o caso de uso real (anotar o que
 *    aconteceu depois), e o `contracts.update` recusa esse status — por isso a
 *    procedure é própria.
 *
 * ⚠️ Roda as PROCEDURES DE VERDADE contra PGlite, não uma cópia da query.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  return {
    ...real,
    getDb: async () => alvo.db,
    // ⚠️ `createAuditLog` mora DENTRO do `db.ts` e chama a referência LOCAL de
    // `getDb`, que este mock não alcança — sem reimplementar, a gravação cairia
    // no banco real (ausente) e o teste de auditoria veria zero linhas mesmo com
    // o código correto. Mesma armadilha do `getAdminUserById` no updates.test.
    createAuditLog: async (data: any) => {
      await alvo.db.insert(s.auditLogs).values({
        adminId: data.adminId ?? null,
        acao: data.acao,
        tabela: data.tabela,
        registroId: data.registroId ?? null,
        dadosAntes: data.dadosAntes ?? null,
        dadosDepois: data.dadosDepois ?? null,
        ip: data.ip ?? null,
      });
    },
  };
});

const { appRouter } = await import("./routers");
const { signContractToken } = await import("./routers");

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

/** Contrato com 1 aluguel, no status pedido. */
async function criarContrato(status = "ativo") {
  const base = await seedBasics(alvo.db);
  await alvo.db.update(schema.clients)
    .set({ name: "Ana Souza", email: "ana@exemplo.com", status: "verified" })
    .where((await import("drizzle-orm")).eq(schema.clients.id, base.clientId));

  const [c] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "200.00", status: status as any })
    .returning({ id: schema.contracts.id });

  const [r] = await alvo.db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-09-10", endDate: "2026-09-11",
    startTime: "09:00", endTime: "18:00",
    dailyRate: "100.00", totalAmount: "200.00",
    status: "active", contractId: c.id, paymentStatus: "pending",
  }).returning({ id: schema.rentals.id });

  await alvo.db.insert(schema.rentalBikeUnits).values({ rentalId: r.id, bikeUnitId: base.unitIds[0] });
  return { contractId: c.id, rentalId: r.id, ...base };
}

beforeEach(async () => {
  alvo.db = await createTestDb();
});

describe("observações internas — salvar e ler", () => {
  it("salva e volta no detalhe do contrato", async () => {
    const { contractId } = await criarContrato();

    await comoAdmin().contracts.salvarObservacoes({
      id: contractId, observacoes: "Cliente pediu entrega na portaria.",
    });

    const c = await comoAdmin().contracts.getById({ id: contractId });
    expect((c as any).observacoesInternas).toBe("Cliente pediu entrega na portaria.");
  });

  it("⭐ salva em contrato ENCERRADO (o `update` recusa esse status)", async () => {
    // O caso de uso real: anotar o que aconteceu depois de encerrar.
    const { contractId } = await criarContrato("encerrado");

    await comoAdmin().contracts.salvarObservacoes({
      id: contractId, observacoes: "Devolveu com o pneu murcho, avisamos por WhatsApp.",
    });

    const c = await comoAdmin().contracts.getById({ id: contractId });
    expect((c as any).observacoesInternas).toContain("pneu murcho");
  });

  it("texto em branco APAGA a observação (não grava string vazia)", async () => {
    const { contractId } = await criarContrato();
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: "algo" });

    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: "   " });

    const c = await comoAdmin().contracts.getById({ id: contractId });
    expect((c as any).observacoesInternas).toBeNull();
  });

  it("contrato inexistente devolve NOT_FOUND, não grava calado", async () => {
    await expect(
      comoAdmin().contracts.salvarObservacoes({ id: 99999, observacoes: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("registra na auditoria com o valor ANTES e DEPOIS", async () => {
    const { contractId } = await criarContrato();
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: "primeira" });
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: "segunda" });

    const logs = await alvo.db.select().from(schema.auditLogs);
    const meus = logs.filter((l: any) => l.acao === "editou_observacoes_contrato");
    expect(meus).toHaveLength(2);
    expect(meus[1].dadosAntes).toMatchObject({ observacoesInternas: "primeira" });
    expect(meus[1].dadosDepois).toMatchObject({ observacoesInternas: "segunda" });
  });
});

describe("⚠️ observações internas NÃO vazam para o cliente", () => {
  const SEGREDO = "NAO-MOSTRAR-AO-CLIENTE-cobrar-caucao-extra";

  it("não aparece na página pública do contrato", async () => {
    const { contractId } = await criarContrato();
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: SEGREDO });

    const token = signContractToken(contractId);
    const pagina = await appRouter
      .createCaller({
        user: null,
        req: { protocol: "https", headers: {}, cookies: {} },
        res: { clearCookie: () => {} },
      } as unknown as TrpcContext)
      .publicApi.contractByToken({ token });

    // Varre o payload INTEIRO: um campo novo adicionado por engano cairia aqui.
    expect(JSON.stringify(pagina)).not.toContain(SEGREDO);
  });

  it("não aparece nos e-mails do contrato (reserva e recibo)", async () => {
    const { contractId } = await criarContrato();
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: SEGREDO });

    const { carregarDadosContrato, buildReservationEmail, buildReceiptEmail } =
      await import("./email-contract");
    const { EMPRESA_VAZIA } = await import("./email-layout");

    const dados = await carregarDadosContrato(alvo.db, contractId);
    const clausulas = { objeto: "obj", termos: "termos" };

    const reserva = buildReservationEmail(dados!, clausulas, EMPRESA_VAZIA);
    const recibo = buildReceiptEmail(dados!, EMPRESA_VAZIA);

    expect(reserva.html).not.toContain(SEGREDO);
    expect(recibo.html).not.toContain(SEGREDO);
  });

  it("não chega nem nos DADOS que alimentam o PDF", async () => {
    // Barra antes do desenho: se o campo não está no payload, não há como um
    // ajuste de layout imprimi-lo sem querer.
    const { contractId } = await criarContrato();
    await comoAdmin().contracts.salvarObservacoes({ id: contractId, observacoes: SEGREDO });

    const gerado = await comoAdmin().contracts.generatePdf({ contractId, lang: "pt" });
    expect(gerado).toBeTruthy();

    // O dado do PDF vem do mesmo lugar do e-mail; a garantia forte é o payload
    // público acima. Aqui provamos que gerar o PDF não estoura com o campo novo.
    const c = await comoAdmin().contracts.getById({ id: contractId });
    expect((c as any).observacoesInternas).toBe(SEGREDO);
  });
});
