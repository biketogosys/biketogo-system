// Q12 — a auditoria tem que dizer O QUE aconteceu, não só o nome da ação.
// Estes testes são a régua das frases que a tela mostra.
import { describe, expect, it } from "vitest";
import { descreverAuditoria, familiaAcao, rotuloAcao, rotuloTabela, type AuditLogItem } from "./auditoria";

const log = (acao: string, dadosDepois?: unknown, registroId: number | null = 7): AuditLogItem => ({
  id: 1, acao, tabela: "contracts", registroId, dadosDepois, criadoEm: "2026-08-03T12:00:00Z",
});

describe("descreverAuditoria", () => {
  it("contrato criado: conta bikes, acessórios e o desconto com o motivo", () => {
    expect(descreverAuditoria(log("criou_contrato_manual", {
      clientId: 1, bikes: 2, accessories: 3,
      descontoPercent: "25.00", descontoMotivo: "cliente antigo",
    }))).toBe("Contrato #7 criado com 2 bikes, 3 acessórios, desconto de 25%, motivo: cliente antigo.");
  });

  it("singular e plural saem certos", () => {
    expect(descreverAuditoria(log("criou_contrato_manual", { bikes: 1, accessories: 1 })))
      .toBe("Contrato #7 criado com 1 bike, 1 acessório.");
  });

  it("contrato sem desconto não inventa a frase do desconto", () => {
    const frase = descreverAuditoria(log("criou_contrato_manual", { bikes: 1, accessories: 0 }));
    expect(frase).not.toMatch(/desconto/);
  });

  it("devolução antecipada mostra as datas, as diárias e os dois valores", () => {
    expect(descreverAuditoria(log("devolucao_antecipada_recalculada", {
      devolucaoCombinada: "2026-08-15", devolucaoReal: "2026-08-12", diasNaoUsados: 3,
      diariasAntes: 5, diariasDepois: 2, valorAnterior: "450.00", novoValor: "180.00",
    }))).toBe(
      "Devolvido em 12/08/2026 em vez de 15/08/2026 (3 dias não usados): "
      + "5 para 2 diárias, de R$ 450,00 para R$ 180,00.",
    );
  });

  it("renovação diz até quando e quanto entrou", () => {
    expect(descreverAuditoria(log("renovou_aluguel", {
      novaDevolucao: "2026-07-26", diasAdicionados: 3, valorExtra: "135.00", novoTotal: "585.00",
    }))).toBe("Prorrogado até 26/07/2026: mais 3 dias, R$ 135,00 a mais (total R$ 585,00).");
  });

  it("edição de contrato ativo mostra a mudança de valor, e omite quando não mudou", () => {
    expect(descreverAuditoria(log("editou_contrato_ativo", { bikes: 2, oldTotal: 300, newTotal: 450 })))
      .toContain("Valor de R$ 300,00 para R$ 450,00.");
    expect(descreverAuditoria(log("editou_contrato_ativo", { bikes: 2, oldTotal: 300, newTotal: 300 })))
      .not.toMatch(/Valor de/);
  });

  it("reenvio de e-mail distingue sucesso de falha e mostra o motivo", () => {
    expect(descreverAuditoria(log("reenviou_email_contrato", {
      tipo: "recibo", ok: true, destinatario: "ana@x.com",
    }))).toBe("E-mail de recibo reenviado para ana@x.com.");

    expect(descreverAuditoria(log("reenviou_email_contrato", {
      tipo: "reserva", ok: false, destinatario: "ana@x.com", motivo: "Resend recusou (403)",
    }))).toBe("Falha ao reenviar o e-mail de reserva para ana@x.com: Resend recusou (403)");
  });

  it("edição de contrato pendente avisa que os aluguéis foram substituídos", () => {
    // é o ramo que soft-deleta tudo e recria: quem lê a auditoria precisa saber
    expect(descreverAuditoria(log("editou_contrato_pendente", { bikes: 1 })))
      .toMatch(/substituídos/);
  });

  it("ação sem tradução devolve vazio (a tela cai no rótulo, não some)", () => {
    expect(descreverAuditoria(log("acao_que_ainda_nao_existe", { algo: 1 }))).toBe("");
    expect(descreverAuditoria(log("arquivou_cliente"))).toBe("");
  });

  it("não quebra com dadosDepois ausente", () => {
    expect(() => descreverAuditoria(log("criou_contrato_manual", undefined))).not.toThrow();
    expect(() => descreverAuditoria(log("renovou_aluguel", null))).not.toThrow();
  });
});

describe("rótulos e cores", () => {
  it("traduz as ações conhecidas e humaniza as desconhecidas", () => {
    expect(rotuloAcao("confirmou_pagamento_presencial")).toBe("Confirmou pagamento");
    expect(rotuloAcao("acao_nova_qualquer")).toBe("Acao Nova Qualquer");
  });

  it("traduz as tabelas", () => {
    expect(rotuloTabela("contracts")).toBe("Contratos");
    expect(rotuloTabela("tabela_nova")).toBe("tabela_nova");
  });

  it("separa as famílias que mudam a cor do selo", () => {
    expect(familiaAcao("excluiu_contrato")).toBe("destrutiva");
    expect(familiaAcao("restaurou_cliente")).toBe("positiva");
    expect(familiaAcao("confirmou_pagamento_presencial")).toBe("dinheiro");
    expect(familiaAcao("reenviou_email_contrato")).toBe("aviso");
    expect(familiaAcao("devolveu_bike")).toBe("neutra");
  });
});
