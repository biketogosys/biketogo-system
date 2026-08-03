// Testes dos DOIS e-mails do ciclo do contrato (reserva e recibo), contra as
// migrações reais no PGlite. O que se prova aqui é o que o CLIENTE recebe:
// dados certos, dinheiro batendo e nada de e-mail duplicado.
import { describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import {
  ACAO_RECIBO_ENVIADO, buildReceiptEmail, buildReservationEmail,
  carregarDadosContrato, formatarData, sendReceiptEmail,
} from "./email-contract";
import { EMPRESA_VAZIA } from "./email-layout";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";

// Cada teste sobe o seu PGlite e aplica as migrações reais. Isolado o arquivo
// roda em ~1,2s por teste, mas com a suíte inteira em paralelo o default de 5s
// do vitest estoura. Timeout local em vez de global: quem é lento é este tipo
// de teste, não a suíte toda.
vi.setConfig({ testTimeout: 30_000 });

const CLAUSULAS = {
  objeto: "Locação de bicicletas.\nO locatário declara ciência.",
  termos: "1. Devolver no prazo.\n2. Zelar pelo equipamento.",
};

/** Contrato completo: cliente com e-mail, 1 bike de 5 diárias e 1 acessório. */
async function seedContrato(db: any, opts: {
  pago?: boolean;
  email?: string | null;
  hospedagem?: string | null;
  status?: string;
} = {}) {
  const base = await seedBasics(db);
  const { eq } = await import("drizzle-orm");
  await db.update(schema.clients).set({
    name: "Ana Souza",
    email: opts.email === undefined ? "ana@exemplo.com" : opts.email,
    accommodation: opts.hospedagem === undefined ? "Pousada do Mar" : opts.hospedagem,
    neighborhood: "Lagoa", city: "Florianópolis",
  }).where(eq(schema.clients.id, base.clientId));

  await db.update(schema.bikes).set({ brand: "Caloi", model: "Urbana Comfort", category: "speed", color: "Grafite" })
    .where(eq(schema.bikes.id, base.bikeId));

  const [contract] = await db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "450.00", status: (opts.status ?? "ativo") as any })
    .returning({ id: schema.contracts.id });

  const [rental] = await db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-08-10", endDate: "2026-08-15",
    dailyRate: "100.00", discountPercent: "10.00", totalAmount: "450.00",
    status: "active", contractId: contract.id,
    paymentStatus: opts.pago ? "paid" : "pending",
    paymentMethod: opts.pago ? "pix" : null,
  }).returning({ id: schema.rentals.id });

  await db.insert(schema.rentalBikeUnits).values({ rentalId: rental.id, bikeUnitId: base.unitIds[0] });

  const [acc] = await db.insert(schema.accessories)
    .values({ name: "Capacete", category: "CAPACETE" })
    .returning({ id: schema.accessories.id });
  // 1 linha por unidade — é assim que o createManual grava
  await db.insert(schema.contractAccessories).values([
    { contractId: contract.id, accessoryId: acc.id, qty: 1, status: "ok" },
    { contractId: contract.id, accessoryId: acc.id, qty: 1, status: "ok" },
  ]);

  if (opts.pago) {
    await db.insert(schema.revenues).values({
      categoryId: 1, description: `Pagamento presencial · Contrato #${contract.id}`,
      amount: "450.00", date: "2026-08-15",
      meta: {
        kind: "contract_payment", contractId: contract.id,
        breakdown: [{ method: "pix", amount: "300.00" }, { method: "cash", amount: "150.00" }],
      },
    });
  }

  return { ...base, contractId: contract.id, rentalId: rental.id };
}

describe("carregarDadosContrato", () => {
  it("monta itens, acessórios agrupados e período do contrato", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    const dados = await carregarDadosContrato(db, contractId);

    expect(dados).not.toBeNull();
    expect(dados!.cliente.nome).toBe("Ana Souza");
    expect(dados!.periodo).toEqual({ inicio: "2026-08-10", fim: "2026-08-15" });
    expect(dados!.itens).toHaveLength(1);
    expect(dados!.itens[0].modelo).toBe("Caloi Urbana Comfort");
    expect(dados!.itens[0].tamanho).toBe("M");
    expect(dados!.itens[0].numerosSistema).toEqual(["001"]);
    // duas linhas do mesmo acessório viram "Capacete × 2"
    expect(dados!.acessorios).toEqual([{ nome: "Capacete", qty: 2 }]);
  });

  it("lê o pagamento dividido do meta da receita", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true });
    const dados = await carregarDadosContrato(db, contractId);

    expect(dados!.pago).toBe(true);
    expect(dados!.formasPagamento).toEqual([
      { method: "pix", amount: "300.00" },
      { method: "cash", amount: "150.00" },
    ]);
  });

  it("não confunde a receita de outro contrato", async () => {
    const db = await createTestDb();
    const a = await seedContrato(db, { pago: true });
    const b = await seedContrato(db, { pago: false });
    const dados = await carregarDadosContrato(db, b.contractId);
    expect(dados!.formasPagamento).toEqual([]);
    expect(a.contractId).not.toBe(b.contractId);
  });

  it("devolve null para contrato inexistente ou excluído", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    expect(await carregarDadosContrato(db, 99999)).toBeNull();

    const { eq } = await import("drizzle-orm");
    await db.update(schema.contracts).set({ deletedAt: new Date() }).where(eq(schema.contracts.id, contractId));
    expect(await carregarDadosContrato(db, contractId)).toBeNull();
  });
});

describe("buildReservationEmail", () => {
  it("leva período, equipamento e os TERMOS no corpo", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    const dados = await carregarDadosContrato(db, contractId);
    const { subject, html } = buildReservationEmail(dados!, CLAUSULAS, EMPRESA_VAZIA, "https://app/contrato/tok");

    expect(subject).toContain(`#${contractId}`);
    expect(html).toContain("Oi, Ana!");
    expect(html).toContain("10/08/2026");
    expect(html).toContain("15/08/2026");
    expect(html).toContain("5 diárias");
    expect(html).toContain("Caloi Urbana Comfort");
    // O pedido da Cassiana: os termos viajam DENTRO do e-mail de reserva.
    expect(html).toContain("Zelar pelo equipamento");
    expect(html).toContain("Locação de bicicletas");
    expect(html).toContain("https://app/contrato/tok");
  });

  it("NÃO fala em local de entrega (o antigo não falava, e a entrega é combinada no WhatsApp)", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    const { html } = buildReservationEmail((await carregarDadosContrato(db, contractId))!, CLAUSULAS, EMPRESA_VAZIA);

    expect(html).not.toContain("Local de entrega");
    expect(html).not.toContain("Pousada do Mar");
    expect(html).toContain("combinar a entrega");
  });

  it("segue o padrão da página pública: blocos, colunas e situação", async () => {
    const db = await createTestDb();
    // a reserva nasce pendente, que é o estado real quando este e-mail sai
    const { contractId } = await seedContrato(db, { status: "pendente" });
    const { html } = buildReservationEmail((await carregarDadosContrato(db, contractId))!, CLAUSULAS, EMPRESA_VAZIA);

    // mesmos títulos de bloco e colunas da PublicContract.tsx
    expect(html).toContain("Detalhes da locação");
    expect(html).toContain("Itens da locação");
    expect(html).toContain("Calculado para o seguinte período de uso");
    expect(html).toContain("Tempo contratado");
    expect(html).toContain("Equipamento");
    expect(html).toContain("Total =");
    // 3 colunas, não as 4 da página: a coluna "Unitário" separada estourava
    // 375px de largura. O valor da diária desce para a linha de detalhe.
    expect(html).not.toContain("Unitário");
    expect(html).toContain("R$ 100,00 por diária");
    expect(html).toContain(`Contrato #${contractId}`);
    // status traduzido como na página, não o valor cru do enum
    expect(html).toContain("Reserva registrada");
    expect(html).not.toContain(">pendente<");
    // acessório vira chip, como na página
    expect(html).toContain("Capacete 2×");
  });

  it("escapa texto do cliente (o nome entra no HTML)", async () => {
    const db = await createTestDb();
    const { contractId, clientId } = await seedContrato(db);
    const { eq } = await import("drizzle-orm");
    await db.update(schema.clients).set({ name: "<script>alert(1)</script>" })
      .where(eq(schema.clients.id, clientId));

    const dados = await carregarDadosContrato(db, contractId);
    const { html } = buildReservationEmail(dados!, CLAUSULAS, EMPRESA_VAZIA);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildReceiptEmail", () => {
  it("abre a tarifação, o desconto e o total", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    const dados = await carregarDadosContrato(db, contractId);
    const { subject, html } = buildReceiptEmail(dados!, EMPRESA_VAZIA, "https://app/contrato/tok");

    expect(subject).toContain("Recibo de pagamento");
    expect(html).toContain("5 diárias");
    expect(html).toContain("desconto de 10%");
    expect(html).toContain("R$ 450,00");
    expect(html).toContain("Encerrado");
  });

  it("mostra cada forma de pagamento e a quitação por extenso", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true });
    const dados = await carregarDadosContrato(db, contractId);
    const { html } = buildReceiptEmail(dados!, EMPRESA_VAZIA);

    expect(html).toContain("Pix");
    expect(html).toContain("R$ 300,00");
    expect(html).toContain("Dinheiro");
    expect(html).toContain("R$ 150,00");
    expect(html).toContain("(quatrocentos e cinquenta reais)");
  });

  it("explica a devolução antecipada, como o PDF faz", async () => {
    const db = await createTestDb();
    const { contractId, rentalId } = await seedContrato(db, { pago: true });
    await db.insert(schema.auditLogs).values({
      acao: "devolucao_antecipada_recalculada",
      tabela: "rentals", registroId: rentalId,
      dadosDepois: {
        valorAnterior: "450.00", novoValor: "360.00",
        diariasAntes: 5, diariasDepois: 4,
        devolucaoCombinada: "2026-08-15", devolucaoReal: "2026-08-14",
      },
    });
    const dados = await carregarDadosContrato(db, contractId);
    const { html } = buildReceiptEmail(dados!, EMPRESA_VAZIA);

    expect(dados!.ajustes).toHaveLength(1);
    expect(html).toContain("Devolução antecipada");
    expect(html).toContain("de 5 para 4 diárias");
    expect(html).toContain("R$ 360,00");
  });
});

describe("sendReceiptEmail", () => {
  it("não manda recibo de contrato que não foi pago", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: false });
    expect(await sendReceiptEmail(db, contractId, "tok")).toBe(false);
    // e não registra nada, para o envio ainda poder acontecer no pagamento
    const logs = await db.select().from(schema.auditLogs);
    expect(logs.filter((l: any) => l.acao === ACAO_RECIBO_ENVIADO)).toHaveLength(0);
  });

  it("não manda duas vezes (encerrar e pagar são ações separadas)", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true });
    await db.insert(schema.auditLogs).values({
      acao: ACAO_RECIBO_ENVIADO, tabela: "contracts", registroId: contractId,
      dadosDepois: { para: "ana@exemplo.com", pago: true },
    });
    expect(await sendReceiptEmail(db, contractId, "tok")).toBe(false);
  });

  it("fica quieto quando o cadastro não tem e-mail", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, email: null });
    expect(await sendReceiptEmail(db, contractId, "tok")).toBe(false);
  });
});

describe("formatarData", () => {
  it("formata a string sem passar por Date (fuso volta um dia)", () => {
    expect(formatarData("2026-07-20")).toBe("20/07/2026");
    expect(formatarData(null)).toBe("");
  });
});
