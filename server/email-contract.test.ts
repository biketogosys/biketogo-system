// Testes dos DOIS e-mails do ciclo do contrato (reserva e recibo), contra as
// migrações reais no PGlite. O que se prova aqui é o que o CLIENTE recebe:
// dados certos, dinheiro batendo e nada de e-mail duplicado.
import { describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import {
  ACAO_RECIBO_ENVIADO, buildReceiptEmail, buildReservationEmail, enviarEmailDeContrato,
  carregarDadosContrato, formatarData, quitacao, resumoValores, sendReceiptEmail,
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

describe("enviarEmailDeContrato — reenvio manual", () => {
  it("recusa o recibo de contrato não pago, com motivo legível", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: false, status: "encerrado" });
    const r = await enviarEmailDeContrato(db, contractId, "recibo", "tok", { ignorarGuardaRecibo: true });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/pagamento/i);
  });

  it("explica quando o cliente não tem e-mail no cadastro", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { email: null });
    const r = await enviarEmailDeContrato(db, contractId, "reserva", "tok");
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/não tem e-mail/i);
  });

  it("contrato inexistente devolve motivo em vez de estourar", async () => {
    const db = await createTestDb();
    const r = await enviarEmailDeContrato(db, 99999, "reserva", "tok");
    expect(r).toMatchObject({ ok: false, motivo: "Contrato não encontrado." });
  });

  it("a guarda de duplicação vale no automático e NÃO no reenvio", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    await db.insert(schema.auditLogs).values({
      acao: ACAO_RECIBO_ENVIADO, tabela: "contracts", registroId: contractId,
      dadosDepois: { para: "ana@exemplo.com", pago: true },
    });

    // automático: barrado pela guarda
    const auto = await enviarEmailDeContrato(db, contractId, "recibo", "tok");
    expect(auto).toMatchObject({ ok: false, motivo: "O recibo deste contrato já foi enviado." });

    // reenvio manual: passa da guarda e chega no transporte (que, sem
    // RESEND_API_KEY no teste, falha por configuração — não pela guarda)
    const manual = await enviarEmailDeContrato(db, contractId, "recibo", "tok", { ignorarGuardaRecibo: true });
    expect(manual.motivo).not.toMatch(/já foi enviado/i);
    expect(manual.destinatario).toBe("ana@exemplo.com");
  });
});

// ─── Lote de pedidos da dona (WhatsApp, 2026-08-11) ──────────────────────────
// Os quatro vieram por print, com o texto que ela mesma redigiu. São mudanças
// de TEXTO, que é justamente o que passa despercebido numa refatoração.

/** Empresa com cidade preenchida: o fecho "Florianópolis, <data>" depende dela. */
const EMPRESA_TESTE = {
  ...EMPRESA_VAZIA,
  nome: "Bike To Go Floripa C M Baptistotti Esportes LTDA",
  cnpj: "43.247.917/0001-06",
  cidade: "Florianópolis",
  telefone: "(48) 98863-1669",
};

describe("pedidos da dona — 2026-08-11", () => {
  it("1. o rótulo é ENTREGA, não retirada (a operação é 100% de entrega)", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    const dados = await carregarDadosContrato(db, contractId);

    // vale nos DOIS e-mails: o bloco de detalhes é compartilhado
    const reserva = buildReservationEmail(dados!, CLAUSULAS, EMPRESA_TESTE);
    const recibo = buildReceiptEmail(dados!, EMPRESA_TESTE);

    for (const { html } of [reserva, recibo]) {
      expect(html).toContain(">Entrega<");
      expect(html).not.toContain(">Retirada<");
    }
  });

  it("2. separa subtotal, desconto em REAIS e total", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    const dados = await carregarDadosContrato(db, contractId);

    // seed: R$ 100,00 × 5 diárias = R$ 500,00 bruto, 10% de desconto = R$ 50,00
    const resumo = resumoValores(dados!);
    expect(resumo.subtotal).toBeCloseTo(500, 2);
    expect(resumo.desconto).toBeCloseTo(50, 2);
    expect(resumo.percentual).toBe(10);

    const { html } = buildReceiptEmail(dados!, EMPRESA_TESTE);
    expect(html).toContain("Subtotal");
    expect(html).toContain("R$ 500,00");
    expect(html).toContain("Desconto 10%");
    expect(html).toContain("R$ 50,00"); // o quanto ela economizou, em reais
    expect(html).toContain("R$ 450,00"); // total, como antes
  });

  it("2b. contrato SEM desconto não ganha linha de subtotal repetindo o total", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    const { eq } = await import("drizzle-orm");
    // diária × dias = total: nada a descontar
    await db.update(schema.rentals)
      .set({ discountPercent: "0", totalAmount: "500.00" })
      .where(eq(schema.rentals.contractId, contractId));
    await db.update(schema.contracts).set({ valorTotal: "500.00" })
      .where(eq(schema.contracts.id, contractId));

    const dados = await carregarDadosContrato(db, contractId);
    expect(resumoValores(dados!).desconto).toBeCloseTo(0, 2);

    const { html } = buildReservationEmail(dados!, CLAUSULAS, EMPRESA_TESTE);
    expect(html).not.toContain("Subtotal");
    expect(html).toContain("Total =");
  });

  it("2c. descontos diferentes entre itens omitem o percentual (não dá para explicar num número só)", async () => {
    const db = await createTestDb();
    const { contractId, clientId, bikeId, bikeSizeId, unitIds } = await seedContrato(db);
    // segunda bike, faixa de desconto diferente
    await db.insert(schema.rentals).values({
      clientId, bikeId, bikeSizeId, quantity: 1,
      startDate: "2026-08-10", endDate: "2026-08-15",
      dailyRate: "100.00", discountPercent: "20.00", totalAmount: "400.00",
      status: "active", contractId,
    });
    const dados = await carregarDadosContrato(db, contractId);
    const resumo = resumoValores(dados!);

    expect(resumo.percentual).toBeNull();
    expect(resumo.desconto).toBeCloseTo(150, 2); // 1000 bruto − 850 líquido
    const { html } = buildReceiptEmail(dados!, EMPRESA_TESTE);
    expect(html).toContain("Desconto<"); // sem percentual grudado
    expect(unitIds.length).toBeGreaterThan(0);
  });

  it("3. a quitação diz DE QUEM, QUANDO e QUAL contrato", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    const dados = await carregarDadosContrato(db, contractId);

    // a data sai da receita (o seed lança em 2026-08-15)
    expect(dados!.dataPagamento).toBe("2026-08-15");

    const { html } = buildReceiptEmail(dados!, EMPRESA_TESTE);
    expect(html).toContain("Recebemos de <strong>Ana Souza</strong>");
    expect(html).toContain("no dia <strong>15/08/2026</strong>");
    expect(html).toContain(`contrato #${contractId}`);
    expect(html).toContain("(quatrocentos e cinquenta reais)");
    expect(html).toContain("no período de 10/08/2026 a 15/08/2026");
  });

  it("3b. sem data de pagamento a frase continua correta, só perde o trecho do dia", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true });
    const dados = await carregarDadosContrato(db, contractId);
    const semData = { ...dados!, dataPagamento: null };

    const frase = quitacao(semData, "10/08/2026 a 15/08/2026");
    expect(frase).toContain("Recebemos de <strong>Ana Souza</strong>");
    expect(frase).not.toContain("no dia");
    expect(frase).not.toContain(", ,");
  });

  it("4. o fecho do recibo perde o título e os dados da loja, e mantém cidade e data", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db, { pago: true, status: "encerrado" });
    const dados = await carregarDadosContrato(db, contractId);
    const { html } = buildReceiptEmail(dados!, EMPRESA_TESTE);

    expect(html).toContain("Este recibo refere-se exclusivamente aos equipamentos");
    expect(html).not.toContain("Termo de ciência");
    expect(html).not.toContain("TERMO DE CIÊNCIA");
    // Os dados da loja saem do CORPO e ficam só no rodapé escuro do e-mail:
    // antes o CNPJ aparecia 2× (bloco + rodapé), agora 1×.
    expect(html.split("43.247.917/0001-06").length - 1).toBe(1);
    expect(html).toContain("Florianópolis,");
  });

  it("4b. a RESERVA mantém o termo de ciência com os dados da loja", async () => {
    const db = await createTestDb();
    const { contractId } = await seedContrato(db);
    const dados = await carregarDadosContrato(db, contractId);
    const { html } = buildReservationEmail(dados!, CLAUSULAS, EMPRESA_TESTE);

    expect(html).toContain("Termo de ciência");
    // 2× de propósito: no termo de ciência do corpo e no rodapé escuro
    expect(html.split("43.247.917/0001-06").length - 1).toBe(2);
  });
});

describe("formatarData", () => {
  it("formata a string sem passar por Date (fuso volta um dia)", () => {
    expect(formatarData("2026-07-20")).toBe("20/07/2026");
    expect(formatarData(null)).toBe("");
  });
});
