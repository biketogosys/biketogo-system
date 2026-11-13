/**
 * Parcelas do cartão de crédito no recebimento (2026-11-06).
 *
 * A dona perguntou: *"Na opção de crédito, tem como colocar em vezes?"*. Quem
 * parcela é a maquininha; o sistema guardava só "Cartão de crédito", e o
 * Financeiro e o recibo não diziam que a venda tinha sido em 3x.
 *
 * O que se prova: as parcelas entram no `meta.breakdown` da receita só no
 * crédito parcelado, saem no recibo no idioma do cliente e na planilha do
 * Financeiro, e o valor lançado continua sendo o total do contrato.
 *
 * ⚠️ Roda as PROCEDURES DE VERDADE contra PGlite.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";
import { formaComParcelas, parcelasDoCredito } from "../shared/pagamento";

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
    // Moram DENTRO do db.ts e usam o getDb LOCAL, que o mock não alcança. Sem
    // isto a receita cairia no banco ausente e o try/catch do router engoliria.
    createRevenue: async (data: any) => {
      const [r] = await alvo.db.insert(s.revenues).values(data).returning({ id: s.revenues.id });
      return r.id;
    },
    createAuditLog: async () => {},
    getSetting: async () => null,
  };
});

const { appRouter } = await import("./routers");
const { getFinancialEntries } = await import("./db");
const { buildReceiptEmail, carregarDadosContrato } = await import("./email-contract");
const { EMPRESA_VAZIA } = await import("./email-layout");

const comoAdmin = () => appRouter.createCaller({
  user: {
    id: 1, openId: "admin-teste", email: "admin@teste.local", name: "Admin Teste",
    loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
  res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
} as TrpcContext);

/** Contrato ATIVO com 1 aluguel de R$ 300, ainda não pago. */
async function contrato() {
  await alvo.db.insert(schema.revenueCategories).values({ name: "Aluguéis" });
  const base = await seedBasics(alvo.db);
  const [c] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "300.00", status: "ativo" })
    .returning({ id: schema.contracts.id });
  await alvo.db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-11-01", endDate: "2026-11-04",
    dailyRate: "100.00", totalAmount: "300.00",
    status: "active", paymentStatus: "pending", contractId: c.id,
  });
  return c.id;
}

async function receita() {
  const [r] = await alvo.db.select().from(schema.revenues);
  return r;
}

describe("parcelasDoCredito e formaComParcelas", () => {
  it.each([
    ["credit_card", 3, 3],
    ["credit_card", 12, 12],
    ["credit_card", 1, undefined], // à vista não grava
    ["credit_card", 13, undefined],
    ["credit_card", 2.5, undefined],
    ["pix", 3, undefined], // só o crédito parcela
    ["debit_card", 2, undefined],
  ])("%s em %s vira %s", (forma, n, esperado) => {
    expect(parcelasDoCredito(forma, n)).toBe(esperado);
  });

  it.each([
    ["pt", "Cartão de crédito em 3x"],
    ["en", "Cartão de crédito in 3 installments"],
    ["es", "Cartão de crédito en 3 cuotas"],
  ] as const)("rótulo em %s", (idioma, esperado) => {
    expect(formaComParcelas("Cartão de crédito", 3, idioma)).toBe(esperado);
  });

  it("à vista ou sem registro fica só o rótulo", () => {
    expect(formaComParcelas("Cartão de crédito", 1)).toBe("Cartão de crédito");
    expect(formaComParcelas("Cartão de crédito", undefined)).toBe("Cartão de crédito");
  });
});

describe("confirmPayment grava as parcelas do crédito", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  it("crédito em 3x, forma única: o total do contrato com as parcelas", async () => {
    const id = await contrato();
    await comoAdmin().contracts.confirmPayment({ contractId: id, payments: [{ method: "credit_card", parcelas: 3 }] });
    const r = await receita();
    expect(r.amount).toBe("300.00");
    expect(r.meta.breakdown).toEqual([{ method: "credit_card", amount: "300.00", parcelas: 3 }]);
  });

  it("dividido: só a linha do crédito leva parcelas", async () => {
    const id = await contrato();
    await comoAdmin().contracts.confirmPayment({
      contractId: id,
      payments: [
        { method: "pix", amount: "100.00", parcelas: 3 },
        { method: "credit_card", amount: "200.00", parcelas: 4 },
      ],
    });
    expect((await receita()).meta.breakdown).toStrictEqual([
      { method: "pix", amount: "100.00" },
      { method: "credit_card", amount: "200.00", parcelas: 4 },
    ]);
  });

  it("à vista não grava parcelas", async () => {
    const id = await contrato();
    await comoAdmin().contracts.confirmPayment({ contractId: id, payments: [{ method: "credit_card", parcelas: 1 }] });
    expect((await receita()).meta.breakdown).toStrictEqual([{ method: "credit_card", amount: "300.00" }]);
  });

  it("mais de 12 vezes é recusado", async () => {
    const id = await contrato();
    await expect(comoAdmin().contracts.confirmPayment({
      contractId: id, payments: [{ method: "credit_card", parcelas: 13 }],
    })).rejects.toThrow();
  });

  it("o recibo diz em quantas vezes, no idioma do cliente", async () => {
    const id = await contrato();
    await comoAdmin().contracts.confirmPayment({ contractId: id, payments: [{ method: "credit_card", parcelas: 3 }] });
    const dados = await carregarDadosContrato(alvo.db, id);
    expect(buildReceiptEmail(dados!, EMPRESA_VAZIA, "", "pt").html).toContain("Cartão de crédito em 3x");
    expect(buildReceiptEmail(dados!, EMPRESA_VAZIA, "", "en").html).toContain("Credit card in 3 installments");
    expect(buildReceiptEmail(dados!, EMPRESA_VAZIA, "", "es").html).toContain("Tarjeta de crédito en 3 cuotas");
  });

  it("a planilha do Financeiro leva as parcelas", async () => {
    const id = await contrato();
    await comoAdmin().contracts.confirmPayment({ contractId: id, payments: [{ method: "credit_card", parcelas: 3 }] });
    const [linha] = await getFinancialEntries({}, alvo.db);
    expect(linha.formas).toBe("credit_card:300.00:3");
  });
});
