/**
 * RECEITA DUPLICADA NO FINANCEIRO (relato do Matheus, 2026-08-24).
 *
 * *"O financeiro está registrando as receitas dos aluguéis de modo duplicado"*.
 *
 * A apuração achou DOIS mecanismos independentes, ambos reproduzidos aqui:
 *
 * **D1 · duas LINHAS para o mesmo contrato.** Editar um contrato ativo lançava
 * "Ajuste do Contrato #N (edição)" com a diferença de valor, mesmo em contrato
 * NÃO PAGO. Depois, ao receber, o `confirmPayment` lança o TOTAL. O ajuste é
 * dinheiro que nunca entrou sozinho: ele já está dentro do total.
 *
 * **D2 · o mesmo dinheiro contado DUAS VEZES nos totais.** O
 * `getFinancialReport` somava `rentals` pagos (KPI "Receita de aluguéis") E a
 * tabela `revenues` inteira (KPI "Receitas extras"), mas o pagamento do contrato
 * mora nas duas. O Lucro líquido (e o Dashboard) mostravam o dobro.
 *
 * ⚠️ Roda as PROCEDURES DE VERDADE contra PGlite.
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
    // ⚠️ `createRevenue` e `createAuditLog` moram DENTRO do `db.ts` e chamam a
    // referência LOCAL de `getDb`, que este mock não alcança. Sem reimplementar,
    // a gravação da receita cairia no banco real (ausente) e o erro seria
    // ENGOLIDO pelo try/catch do router — o teste veria zero receitas e diria
    // que está tudo bem.
    createRevenue: async (data: any) => {
      const [r] = await alvo.db.insert(s.revenues).values(data).returning({ id: s.revenues.id });
      return r.id;
    },
    // idem para o INSERT de aluguel (usado ao adicionar bike numa edição)
    createRental: async (data: any) => {
      const [r] = await alvo.db.insert(s.rentals).values(data).returning({ id: s.rentals.id });
      return r.id;
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

const { appRouter } = await import("./routers");
const { getFinancialReport } = await import("./db");

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

/**
 * ⚠️ DATAS RELATIVAS AO MÊS CORRENTE, nunca fixas.
 *
 * Estes testes nasceram com a janela cravada em agosto/2026 e passaram a falhar
 * sozinhos em 05/09/2026: o `confirmPayment` grava a receita com a data de HOJE,
 * que saiu da janela consultada. O código estava certo, os testes é que
 * dependiam do calendário. Tudo aqui passa a girar em torno do mês atual.
 */
const HOJE = new Date();
const iso = (d: Date) => d.toISOString().split("T")[0];
const DIA = (n: number) => iso(new Date(HOJE.getFullYear(), HOJE.getMonth(), n));
const MES_INI = iso(new Date(HOJE.getFullYear(), HOJE.getMonth(), 1));
const MES_FIM = iso(new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0));
/** Uma janela de mês que NÃO é a atual (para provar que o valor não vaza). */
const OUTRO_MES_INI = iso(new Date(HOJE.getFullYear(), HOJE.getMonth() + 5, 1));
const OUTRO_MES_FIM = iso(new Date(HOJE.getFullYear(), HOJE.getMonth() + 6, 0));

/** Categoria 1 = "Aluguéis": é a que o código usa fixa ao lançar receita. */
async function seedCategoria() {
  await alvo.db.insert(schema.revenueCategories).values({ name: "Aluguéis" });
}

/** Contrato ATIVO com 1 aluguel de R$ 200, ainda NÃO pago. */
async function contratoAtivoNaoPago() {
  const base = await seedBasics(alvo.db);
  const [c] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "200.00", status: "ativo" })
    .returning({ id: schema.contracts.id });
  const [r] = await alvo.db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-08-10", endDate: "2026-08-12",
    dailyRate: "100.00", totalAmount: "200.00",
    status: "active", paymentStatus: "pending", contractId: c.id,
  }).returning({ id: schema.rentals.id });
  return { ...base, contractId: c.id, rentalId: r.id };
}

async function receitas() {
  return alvo.db.select({
    descricao: schema.revenues.description,
    valor: schema.revenues.amount,
  }).from(schema.revenues);
}

beforeEach(async () => {
  alvo.db = await createTestDb();
  await seedCategoria();
});

describe("D1 · editar contrato não pago + receber = duas linhas de receita", () => {
  it("lança UMA receita por contrato, não uma por edição", async () => {
    const ct = await contratoAtivoNaoPago();

    // Ela edita o contrato ativo: estica um dia (R$ 200 → R$ 300).
    await comoAdmin().contracts.update({
      id: ct.contractId,
      clientId: ct.clientId,
      bikes: [{
        rentalId: ct.rentalId,
        bikeId: ct.bikeId,
        bikeSizeId: ct.bikeSizeId,
        startDate: "2026-08-10",
        endDate: "2026-08-13",
        startTime: "09:00",
        endTime: "09:00",
        quantity: 1,
        dailyRate: "100.00",
        totalAmount: "300.00",
      }],
    });

    // Depois recebe o dinheiro, uma vez só.
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "300.00" }],
    });

    const linhas = await receitas();
    const soma = linhas.reduce((s: number, l: any) => s + parseFloat(l.valor), 0);

    // Entraram R$ 300 no caixa. O Financeiro não pode dizer outra coisa.
    expect(soma).toBe(300);
    expect(linhas).toHaveLength(1);
  });

  it("edição em contrato JÁ PAGO continua lançando a diferença (é dinheiro novo)", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });

    // Já recebeu R$ 200; agora estica o contrato para R$ 300.
    await comoAdmin().contracts.update({
      id: ct.contractId,
      clientId: ct.clientId,
      bikes: [{
        rentalId: ct.rentalId, bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
        startDate: "2026-08-10", endDate: "2026-08-13",
        startTime: "09:00", endTime: "09:00",
        quantity: 1, dailyRate: "100.00", totalAmount: "300.00",
      }],
    });

    const linhas = await receitas();
    const soma = linhas.reduce((s: number, l: any) => s + parseFloat(l.valor), 0);
    expect(soma).toBe(300);
    expect(linhas).toHaveLength(2); // pagamento + ajuste da diferença
  });
});

describe("D2 · totais do Financeiro não podem contar o mesmo dinheiro duas vezes", () => {
  it("aluguel pago entra UMA vez no relatório", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });

    const rel = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    const total = parseFloat(rel.rentalRevenue) + parseFloat(rel.extraRevenue);

    expect(total).toBe(200);
  });

  it("receita manual (venda de camiseta) continua somando por fora", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "cash", amount: "200.00" }],
    });
    await comoAdmin().financial.createRevenue({
      categoryId: 1, description: "Venda de camiseta", amount: "80.00", date: DIA(15),
    });

    const rel = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(rel.rentalRevenue)).toBe(200);
    expect(parseFloat(rel.extraRevenue)).toBe(80);
  });
});

describe("D3 · reconhecer o que nasceu de contrato (inclusive o legado)", () => {
  /**
   * As linhas gravadas ANTES da correção não têm `meta.contractId`. Se o
   * relatório dependesse só do meta, todo o histórico dela voltaria a ser
   * contado duas vezes — por isso a descrição é a segunda via de
   * reconhecimento, e é ela que este teste protege.
   */
  it("linha ANTIGA de contrato (sem meta) não vira receita extra", async () => {
    await alvo.db.insert(schema.revenues).values([
      // legado: exatamente como o sistema gravava antes de 2026-08-24
      { categoryId: 1, description: "Pagamento presencial · Contrato #9", amount: "500.00", date: DIA(5) },
      { categoryId: 1, description: "Ajuste do Contrato #9 (edição)", amount: "50.00", date: DIA(6) },
      { categoryId: 1, description: "Estorno de devolução antecipada · Contrato #9 (2 dia(s) não usados)", amount: "-120.00", date: DIA(7) },
      // esta é receita extra de verdade
      { categoryId: 1, description: "Venda de camiseta", amount: "80.00", date: DIA(8) },
    ]);

    const rel = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(rel.extraRevenue)).toBe(80);
  });

  /**
   * O fluxo completo da devolução antecipada é coberto pelo
   * `rental-period.test.ts`; o que se prova AQUI é só a parte do relatório: o
   * estorno é espelho para o contador, e o abatimento já está no `totalAmount`
   * do aluguel. Somar os dois tiraria o desconto em dobro.
   */
  it("estorno de devolução antecipada não abate duas vezes", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });
    // aluguel encurtado + estorno, no formato que o `recalcEarlyReturn` grava
    await alvo.db.update(schema.rentals).set({ totalAmount: "100.00" });
    await alvo.db.insert(schema.revenues).values({
      categoryId: 1,
      description: `Estorno de devolução antecipada · Contrato #${ct.contractId} (1 dia(s) não usados)`,
      amount: "-100.00",
      date: DIA(11),
      meta: { kind: "early_return_refund", contractId: ct.contractId },
    });

    const rel = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(rel.rentalRevenue)).toBe(100);
    expect(parseFloat(rel.extraRevenue)).toBe(0);
  });
});

describe("D4 · bike adicionada a contrato NÃO pago não vira receita antes da hora", () => {
  it("nasce pendente, e o relatório só conta depois do pagamento", async () => {
    const ct = await contratoAtivoNaoPago();

    // ela adiciona uma segunda bike ao contrato ativo (ainda não recebido)
    await comoAdmin().contracts.update({
      id: ct.contractId,
      clientId: ct.clientId,
      bikes: [
        { rentalId: ct.rentalId, bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
          startDate: "2026-08-10", endDate: "2026-08-12", startTime: "09:00", endTime: "09:00",
          quantity: 1, dailyRate: "100.00", totalAmount: "200.00" },
        { bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
          startDate: "2026-08-10", endDate: "2026-08-12", startTime: "09:00", endTime: "09:00",
          quantity: 1, dailyRate: "100.00", totalAmount: "200.00" },
      ],
    });

    const antes = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(antes.rentalRevenue)).toBe(0); // ninguém pagou nada ainda

    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "cash", amount: "400.00" }],
    });

    const depois = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(depois.rentalRevenue)).toBe(400);
    expect(parseFloat(depois.extraRevenue)).toBe(0);
  });

  it("em contrato JÁ pago a bike nova continua nascendo paga (senão o pagamento reabre e duplica)", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });

    await comoAdmin().contracts.update({
      id: ct.contractId,
      clientId: ct.clientId,
      bikes: [
        { rentalId: ct.rentalId, bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
          startDate: "2026-08-10", endDate: "2026-08-12", startTime: "09:00", endTime: "09:00",
          quantity: 1, dailyRate: "100.00", totalAmount: "200.00" },
        { bikeId: ct.bikeId, bikeSizeId: ct.bikeSizeId,
          startDate: "2026-08-10", endDate: "2026-08-12", startTime: "09:00", endTime: "09:00",
          quantity: 1, dailyRate: "100.00", totalAmount: "200.00" },
      ],
    });

    // o contrato segue pago por inteiro: confirmar de novo tem que ser recusado
    await expect(comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId, payments: [{ method: "pix", amount: "400.00" }],
    })).rejects.toThrow(/já teve o pagamento confirmado/);
  });
});

describe("D5 · os cards têm que BATER com a lista de lançamentos", () => {
  /**
   * Queixa do Matheus (2026-08-24): *"pra quem olha as receitas não fica
   * confuso e desorganizado, tipo aquele tanto de entrada mas só dando 740?"*.
   *
   * Era a primeira correção pela metade: ela tirou a soma em dobro mas deixou
   * duas réguas na mesma tela (aluguel pela data de INÍCIO, lançamento pela
   * data do PAGAMENTO). O que se prova aqui é que agora existe UMA régua só.
   */
  it("Receita de aluguéis + Receitas extras = soma exata dos lançamentos do período", async () => {
    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });
    await comoAdmin().financial.createRevenue({
      categoryId: 1, description: "Venda de camiseta", amount: "80.00", date: DIA(15),
    });
    await comoAdmin().financial.createRevenue({
      categoryId: 1, description: "Taxa de entrega", amount: "25.00", date: DIA(16),
    });

    const linhas = await receitas();
    const somaDaLista = linhas.reduce((s: number, l: any) => s + parseFloat(l.valor), 0);

    const rel = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    const somaDosCards = parseFloat(rel.rentalRevenue) + parseFloat(rel.extraRevenue);

    expect(somaDaLista).toBe(305);
    expect(somaDosCards).toBe(somaDaLista);
    expect(parseFloat(rel.rentalRevenue)).toBe(200); // o que veio de contrato
    expect(parseFloat(rel.extraRevenue)).toBe(105);  // camiseta + taxa
  });

  /**
   * O motivo de a régua ser a data do RECEBIMENTO e não a do início do aluguel:
   * ela recebe hoje por um aluguel que só acontece na temporada que vem, e o
   * dinheiro tem que aparecer no mês em que entrou no caixa.
   */
  it("pagamento entra no mês em que foi RECEBIDO, não no mês em que o aluguel começa", async () => {
    const base = await seedBasics(alvo.db);
    const [c] = await alvo.db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "300.00", status: "ativo" })
      .returning({ id: schema.contracts.id });
    await alvo.db.insert(schema.rentals).values({
      clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
      quantity: 1,
      startDate: "2027-01-10", endDate: "2027-01-13", // aluguel do ano que vem
      dailyRate: "100.00", totalAmount: "300.00",
      status: "active", paymentStatus: "pending", contractId: c.id,
    });

    await comoAdmin().contracts.confirmPayment({
      contractId: c.id, payments: [{ method: "pix", amount: "300.00" }],
    });

    // recebido hoje (agosto): tem que aparecer em agosto
    const agora = await getFinancialReport(MES_INI, MES_FIM, alvo.db);
    expect(parseFloat(agora.rentalRevenue)).toBe(300);

    // e NÃO no mês em que a bike sai
    const outroMes = await getFinancialReport(OUTRO_MES_INI, OUTRO_MES_FIM, alvo.db);
    expect(parseFloat(outroMes.rentalRevenue)).toBe(0);
  });
});

describe("D6 · categoria do lançamento de contrato", () => {
  /**
   * Achado em PRODUÇÃO (2026-08-24, print do Matheus + conferência): o código
   * gravava `categoryId: 1` fixo, mas a categoria da loja é a de **id 2**
   * ("Aluguel"). Como a coluna não tem FK, o lançamento entrava apontando para
   * categoria inexistente: "—" na tela, "Sem categoria" no CSV do contador e
   * sumia do filtro por categoria.
   */
  it("usa a categoria da LOJA, mesmo que o id não seja 1 (cenário da produção)", async () => {
    // banco como o da produção: a única categoria de receita é a de id 2
    await alvo.db.delete(schema.revenueCategories);
    await alvo.db.insert(schema.revenueCategories).values({ id: 2, name: "Aluguel" });

    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "pix", amount: "200.00" }],
    });

    const [linha] = await alvo.db.select({ categoryId: schema.revenues.categoryId })
      .from(schema.revenues);
    expect(linha.categoryId).toBe(2);

    // e a linha aparece com o NOME da categoria no export do contador
    const { getFinancialEntries } = await import("./db");
    const linhas = await getFinancialEntries({ startDate: MES_INI, endDate: MES_FIM }, alvo.db);
    expect(linhas.find((l) => l.tipo === "receita")?.categoria).toBe("Aluguel");
  });

  it("cria a categoria se a loja não tiver nenhuma (em vez de gravar id inválido)", async () => {
    await alvo.db.delete(schema.revenueCategories);

    const ct = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({
      contractId: ct.contractId,
      payments: [{ method: "cash", amount: "200.00" }],
    });

    const cats = await alvo.db.select().from(schema.revenueCategories);
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe("Aluguel");

    const [linha] = await alvo.db.select({ categoryId: schema.revenues.categoryId })
      .from(schema.revenues);
    expect(linha.categoryId).toBe(cats[0].id);
  });

  it("não cria categoria duplicada quando já existe (dois pagamentos seguidos)", async () => {
    const a = await contratoAtivoNaoPago();
    const b = await contratoAtivoNaoPago();
    await comoAdmin().contracts.confirmPayment({ contractId: a.contractId, payments: [{ method: "pix", amount: "200.00" }] });
    await comoAdmin().contracts.confirmPayment({ contractId: b.contractId, payments: [{ method: "pix", amount: "200.00" }] });

    const cats = await alvo.db.select().from(schema.revenueCategories);
    expect(cats).toHaveLength(1); // a do seed ("Aluguéis"), reaproveitada
  });
});
