// ─── Q12: auditoria legível ──────────────────────────────────────────────────
// A tela mostrava "Ação: Criou Contrato Manual · Registro ID: 68" e o que de
// fato aconteceu (valores, motivo, destinatário) ficava só no JSON do banco,
// invisível. Aqui cada ação vira UMA FRASE em português a partir do que foi
// gravado em `dadosDepois`.
//
// Ação sem tradução própria não some da tela: cai no rótulo genérico e o JSON
// continua disponível no detalhe. Assim uma ação nova nunca "some" da auditoria
// só porque ninguém lembrou de escrever a frase.

export type AuditLogItem = {
  id: number;
  acao: string;
  tabela: string;
  registroId: number | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
  criadoEm: string | Date;
  adminId?: number | null;
  adminNome?: string | null;
};

/** Rótulo curto da ação (o que aparece no selo e no filtro). */
export const ROTULO_ACAO: Record<string, string> = {
  arquivou_cliente: "Arquivou cliente",
  restaurou_cliente: "Restaurou cliente",
  arquivou_aluguel: "Arquivou aluguel",
  restaurou_aluguel: "Restaurou aluguel",
  criou_contrato_manual: "Criou contrato",
  editou_contrato_pendente: "Editou contrato (pendente)",
  editou_contrato_ativo: "Editou contrato (ativo)",
  confirmou_reserva: "Confirmou reserva",
  recusou_reserva: "Recusou reserva",
  confirmou_pagamento_presencial: "Confirmou pagamento",
  encerrou_contrato: "Encerrou contrato",
  cancelou_contrato: "Cancelou contrato",
  excluiu_contrato: "Excluiu contrato",
  restaurou_contrato: "Restaurou contrato",
  arquivou_contrato: "Arquivou contrato",
  devolveu_bike: "Devolveu bike",
  devolucao_rapida: "Devolução rápida",
  devolucao_antecipada_recalculada: "Devolução antecipada",
  renovou_aluguel: "Renovou aluguel",
  reenviou_email_contrato: "Reenviou e-mail",
  enviou_email_recibo: "Enviou recibo",
  editou_observacoes_contrato: "Editou observações",
  overdue_automatico: "Marcou atraso (automático)",
  atualizou_bike: "Atualizou bike",
};

export function rotuloAcao(acao: string): string {
  return ROTULO_ACAO[acao] ?? acao.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ROTULO_TABELA: Record<string, string> = {
  clients: "Clientes",
  rentals: "Aluguéis",
  contracts: "Contratos",
  bikes: "Bicicletas",
  accessories: "Acessórios",
  system_settings: "Configurações",
};

export function rotuloTabela(tabela: string): string {
  return ROTULO_TABELA[tabela] ?? tabela;
}

/** Nome do registro no SINGULAR: "Contrato #36", não "Contratos #36". */
const ROTULO_REGISTRO: Record<string, string> = {
  clients: "Cliente",
  rentals: "Aluguel",
  contracts: "Contrato",
  bikes: "Bicicleta",
  accessories: "Acessório",
  system_settings: "Configuração",
};

export function rotuloRegistro(tabela: string, registroId: number | null | undefined): string {
  const nome = ROTULO_REGISTRO[tabela] ?? rotuloTabela(tabela);
  return registroId != null ? `${nome} #${registroId}` : nome;
}

/** Família da ação, para a cor do selo (mesmo padrão de status da casa). */
export function familiaAcao(acao: string): "positiva" | "destrutiva" | "dinheiro" | "aviso" | "neutra" {
  if (/excluiu|arquivou|cancelou|recusou/.test(acao)) return "destrutiva";
  if (/restaurou|confirmou_reserva|criou/.test(acao)) return "positiva";
  if (/pagamento|antecipada|renovou/.test(acao)) return "dinheiro";
  if (/email|overdue/.test(acao)) return "aviso";
  return "neutra";
}

const brl = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? `R$ ${n.toFixed(2).replace(".", ",")}` : String(v ?? "");
};

const dataBr = (v: unknown) => {
  const s = String(v ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

const FORMAS: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito",
  cash: "Dinheiro", other: "Outra forma",
};

/**
 * Frase legível do que aconteceu. Devolve "" quando a ação não tem detalhe
 * gravado — aí a tela mostra só o rótulo, que já basta ("Arquivou cliente").
 */
export function descreverAuditoria(log: AuditLogItem): string {
  const d = (log.dadosDepois ?? {}) as Record<string, any>;
  const alvo = log.registroId != null ? `#${log.registroId}` : "";

  switch (log.acao) {
    case "criou_contrato_manual": {
      const partes = [
        d.bikes != null ? plural(Number(d.bikes), "bike", "bikes") : null,
        d.accessories ? plural(Number(d.accessories), "acessório", "acessórios") : null,
        d.descontoPercent ? `desconto de ${parseFloat(d.descontoPercent)}%` : null,
        d.descontoMotivo ? `motivo: ${d.descontoMotivo}` : null,
      ].filter(Boolean);
      return `Contrato ${alvo} criado com ${partes.join(", ")}.`;
    }

    case "editou_contrato_pendente":
      return `Contrato ${alvo} reescrito: ${plural(Number(d.bikes ?? 0), "bike", "bikes")}`
        + `${d.accessories ? `, ${plural(Number(d.accessories), "acessório", "acessórios")}` : ""}.`
        + " Os aluguéis anteriores foram substituídos.";

    case "editou_contrato_ativo": {
      const de = d.oldTotal != null ? brl(d.oldTotal) : null;
      const para = d.newTotal != null ? brl(d.newTotal) : null;
      const valor = de && para && de !== para ? ` Valor de ${de} para ${para}.` : "";
      return `Contrato ${alvo} editado com ${plural(Number(d.bikes ?? 0), "bike", "bikes")}.${valor}`;
    }

    case "confirmou_pagamento_presencial":
      return `Pagamento do contrato ${alvo} confirmado.`;

    case "devolucao_antecipada_recalculada":
      return `Devolvido em ${dataBr(d.devolucaoReal)} em vez de ${dataBr(d.devolucaoCombinada)}`
        + `${d.diasNaoUsados ? ` (${plural(Number(d.diasNaoUsados), "dia não usado", "dias não usados")})` : ""}: `
        + `${d.diariasAntes ?? "?"} para ${d.diariasDepois ?? "?"} diárias, `
        + `de ${brl(d.valorAnterior)} para ${brl(d.novoValor)}.`;

    case "renovou_aluguel":
      return `Prorrogado até ${dataBr(d.novaDevolucao)}: mais `
        + `${plural(Number(d.diasAdicionados ?? 0), "dia", "dias")}, `
        + `${brl(d.valorExtra)} a mais (total ${brl(d.novoTotal)}).`;

    case "devolveu_bike":
      return `Bike devolvida${d.condicao ? ` em condição "${d.condicao}"` : ""}`
        + `${d.recalculado ? ", com recálculo por devolução antecipada" : ""}.`;

    case "reenviou_email_contrato": {
      const tipo = d.tipo === "recibo" ? "recibo" : "reserva";
      const destino = d.destinatario ? ` para ${d.destinatario}` : "";
      return d.ok
        ? `E-mail de ${tipo} reenviado${destino}.`
        : `Falha ao reenviar o e-mail de ${tipo}${destino}${d.motivo ? `: ${d.motivo}` : "."}`;
    }

    case "enviou_email_recibo":
      return `Recibo enviado${d.para ? ` para ${d.para}` : ""}.`;

    default:
      return "";
  }
}
