// Q6 — export do Financeiro linha a linha (o que o contador precisa lançar).
// O export antigo mandava só 5 linhas de totais; o que se prova aqui é que cada
// lançamento sai com data, categoria, descrição e valor, dentro do período.
import { describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import { getFinancialEntries } from "./db";
import { createTestDb } from "./test-helpers/pglite-db";

vi.setConfig({ testTimeout: 30_000 });

async function seedFinanceiro(db: any) {
  const [catRec] = await db.insert(schema.revenueCategories)
    .values({ name: "Aluguéis" }).returning({ id: schema.revenueCategories.id });
  const [catDesp] = await db.insert(schema.expenseCategories)
    .values({ name: "Manutenção" }).returning({ id: schema.expenseCategories.id });

  await db.insert(schema.revenues).values([
    {
      categoryId: catRec.id, description: "Pagamento presencial · Contrato #5",
      amount: "225.00", date: "2026-08-10",
      meta: {
        kind: "contract_payment", contractId: 5,
        breakdown: [{ method: "pix", amount: "90.00" }, { method: "cash", amount: "135.00" }],
      },
    },
    { categoryId: catRec.id, description: "Venda de camiseta", amount: "80.00", date: "2026-08-12" },
    // fora da janela, não pode entrar
    { categoryId: catRec.id, description: "Fora do período", amount: "999.00", date: "2026-09-01" },
  ]);
  await db.insert(schema.expenses).values([
    { categoryId: catDesp.id, description: "Troca de pneu", amount: "60.00", date: "2026-08-11" },
  ]);
  return { catRec: catRec.id, catDesp: catDesp.id };
}

describe("getFinancialEntries", () => {
  it("devolve receitas e despesas do período, linha a linha e em ordem de data", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);

    const linhas = await getFinancialEntries({ startDate: "2026-08-01", endDate: "2026-08-31" }, db);

    expect(linhas.map((l) => `${l.date} ${l.tipo} ${l.valor}`)).toEqual([
      "2026-08-10 receita 225.00",
      "2026-08-11 despesa 60.00",
      "2026-08-12 receita 80.00",
    ]);
  });

  it("traz o NOME da categoria, não o id", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);
    const linhas = await getFinancialEntries({ startDate: "2026-08-01", endDate: "2026-08-31" }, db);
    expect(linhas.find((l) => l.tipo === "despesa")?.categoria).toBe("Manutenção");
    expect(linhas.find((l) => l.tipo === "receita")?.categoria).toBe("Aluguéis");
  });

  it("abre o pagamento dividido (senão o contador não bate com o extrato)", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);
    const linhas = await getFinancialEntries({ startDate: "2026-08-01", endDate: "2026-08-31" }, db);
    const contrato = linhas.find((l) => l.descricao.includes("Contrato #5"));
    expect(contrato?.formas).toBe("pix:90.00 | cash:135.00");
    // lançamento comum não inventa forma de pagamento
    expect(linhas.find((l) => l.descricao === "Venda de camiseta")?.formas).toBeNull();
  });

  it("respeita a janela do período", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);
    const linhas = await getFinancialEntries({ startDate: "2026-08-01", endDate: "2026-08-31" }, db);
    expect(linhas.some((l) => l.descricao === "Fora do período")).toBe(false);

    const setembro = await getFinancialEntries({ startDate: "2026-09-01", endDate: "2026-09-30" }, db);
    expect(setembro).toHaveLength(1);
    expect(setembro[0].descricao).toBe("Fora do período");
  });

  it("período sem lançamento devolve lista vazia, não quebra", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);
    expect(await getFinancialEntries({ startDate: "2027-01-01", endDate: "2027-01-31" }, db)).toEqual([]);
  });

  it("lançamento sem categoria não some do relatório", async () => {
    const db = await createTestDb();
    await seedFinanceiro(db);
    // categoryId órfão (a categoria foi apagada depois do lançamento)
    await db.insert(schema.revenues).values({
      categoryId: 999, description: "Categoria apagada", amount: "10.00", date: "2026-08-15",
    });
    const linhas = await getFinancialEntries({ startDate: "2026-08-01", endDate: "2026-08-31" }, db);
    const orfa = linhas.find((l) => l.descricao === "Categoria apagada");
    expect(orfa).toBeDefined();
    expect(orfa?.categoria).toBe("Sem categoria");
  });
});
