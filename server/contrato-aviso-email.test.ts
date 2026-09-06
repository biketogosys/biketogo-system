/**
 * AVISO DE E-MAIL NÃO ENVIADO na criação do contrato (2026-09-06).
 *
 * **O caso real:** um cliente foi cadastrado na loja **sem e-mail**. O contrato
 * dele foi criado normalmente, mas o e-mail de reserva (que leva os termos) foi
 * pulado **em silêncio** — o disparo automático usava um wrapper booleano e
 * jogava fora o motivo que o servidor já sabia dizer. Ela só descobriu dias
 * depois, pelo cliente, e a apuração precisou de três pessoas e do painel do
 * Resend para concluir o óbvio: nunca houve envio.
 *
 * O que este arquivo protege: **o motivo chega até a tela**. A camada de baixo
 * (`enviarEmailDeContrato` recusando por falta de e-mail) já tem teste próprio
 * no `email-contract.test.ts`; o que faltava era o ELO, que é justamente onde o
 * silêncio morava.
 *
 * ⚠️ Roda a PROCEDURE de verdade contra PGlite.
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
    // ⚠️ Estas moram DENTRO do `db.ts` e chamam a referência LOCAL de `getDb`,
    // que o mock não alcança — sem reimplementar, gravariam no banco ausente.
    createRental: async (data: any) => {
      const [r] = await alvo.db.insert(s.rentals).values(data).returning({ id: s.rentals.id });
      return r.id;
    },
    // idem: a checagem de disponibilidade também lê pelo `getDb` local.
    getSizeAvailability: async (bikeSizeId: number) => {
      const { eq, and } = await import("drizzle-orm");
      const linhas = await alvo.db.select({ id: s.bikeUnits.id })
        .from(s.bikeUnits)
        .where(and(eq(s.bikeUnits.bikeSizeId, bikeSizeId), eq(s.bikeUnits.status, "disponivel")));
      return linhas.length;
    },
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

/**
 * O transporte é mockado para o teste falar SÓ do que ele testa. Sem isto o
 * caso "cliente com e-mail" acusaria `RESEND_API_KEY não está configurada` —
 * o que, aliás, é o comportamento correto do sistema: **qualquer** motivo de
 * falha chega à tela, não só a falta de e-mail no cadastro.
 */
vi.mock("./email", async (importOriginal) => {
  const real = await importOriginal<typeof import("./email")>();
  return {
    ...real,
    sendEmailDetalhado: async () => ({ ok: true }),
    resolverReplyTo: async () => null,
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

/** Cliente + bike prontos; o e-mail do cliente é o que muda em cada caso. */
async function cenario(email: string | null) {
  const base = await seedBasics(alvo.db);
  const { eq } = await import("drizzle-orm");
  await alvo.db.update(schema.clients)
    .set({ name: "Daniel Cordeiro", email, status: "verified" })
    .where(eq(schema.clients.id, base.clientId));
  return base;
}

function payload(base: any) {
  return {
    clientId: base.clientId,
    bikes: [{
      bikeId: base.bikeId,
      bikeSizeId: base.bikeSizeId,
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      startTime: "09:00",
      endTime: "18:00",
      quantity: 1,
      dailyRate: "65.00",
      totalAmount: "130.00",
    }],
  };
}

beforeEach(async () => {
  alvo.db = await createTestDb();
});

describe("criação de contrato — a tela precisa saber quando o e-mail não saiu", () => {
  it("⭐ cliente SEM e-mail: o contrato é criado E o motivo volta para a tela", async () => {
    const base = await cenario(null);

    const res = await comoAdmin().contracts.createManual(payload(base) as any);

    // O contrato existe: o e-mail é não-fatal, e isso não muda.
    expect(res.id).toBeGreaterThan(0);
    const [ct] = await alvo.db.select().from(schema.contracts);
    expect(ct.id).toBe(res.id);

    // E o silêncio acabou: a frase vem pronta, escrita para humano.
    expect(res.avisoEmail).toMatch(/não tem e-mail/i);
  });

  it("cliente COM e-mail: nenhum aviso (a tela não pode gritar à toa)", async () => {
    const base = await cenario("daniel@exemplo.com");

    const res = await comoAdmin().contracts.createManual(payload(base) as any);

    expect(res.id).toBeGreaterThan(0);
    expect(res.avisoEmail).toBeNull();
  });

  it("e-mail em branco conta como sem e-mail (é o que o cadastro grava)", async () => {
    const base = await cenario("   ");

    const res = await comoAdmin().contracts.createManual(payload(base) as any);

    expect(res.avisoEmail).toMatch(/não tem e-mail/i);
  });

  /**
   * Não é só a falta de e-mail no cadastro: Resend fora do ar, domínio
   * suspenso, caixa inexistente — tudo isso vira a mesma pergunta dela ("o
   * cliente recebeu?") e agora tem a mesma resposta na hora.
   */
  it("falha do transporte também chega na tela, com o motivo do servidor", async () => {
    const email = await import("./email");
    const spy = vi.spyOn(email, "sendEmailDetalhado").mockResolvedValue({
      ok: false, motivo: "Resend recusou: domínio não verificado.",
    } as any);

    const base = await cenario("daniel@exemplo.com");
    const res = await comoAdmin().contracts.createManual(payload(base) as any);

    expect(res.id).toBeGreaterThan(0);
    expect(res.avisoEmail).toMatch(/domínio não verificado/i);
    spy.mockRestore();
  });
});
