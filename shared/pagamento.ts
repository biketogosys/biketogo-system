/**
 * Parcelas do cartão de crédito no recebimento (2026-11-06).
 *
 * A dona perguntou se dava para colocar o crédito "em vezes". Quem parcela é a
 * maquininha; o sistema só guardava a forma, e o recibo e o Financeiro diziam
 * "Cartão de crédito" para uma venda em 3x.
 *
 * Só REGISTRA: o valor lançado continua sendo o total do contrato, na data do
 * recebimento. Se a maquininha cobra juros do cliente, eles não são receita da
 * loja, e a venda continua sendo o valor do contrato.
 */

export const MAX_PARCELAS = 12;

type Idioma = "pt" | "en" | "es";

/** O que vale gravar: só o crédito parcela, e 1x é à vista (não grava). */
export function parcelasDoCredito(method: string, parcelas?: number | null): number | undefined {
  if (method !== "credit_card" || !parcelas || !Number.isInteger(parcelas)) return undefined;
  return parcelas > 1 && parcelas <= MAX_PARCELAS ? parcelas : undefined;
}

/** "Cartão de crédito em 3x"; sem parcelas (ou à vista), só o rótulo. */
export function formaComParcelas(rotulo: string, parcelas?: number | null, idioma: Idioma = "pt"): string {
  if (!parcelas || parcelas < 2) return rotulo;
  const sufixo = idioma === "en" ? `in ${parcelas} installments`
    : idioma === "es" ? `en ${parcelas} cuotas`
    : `em ${parcelas}x`;
  return `${rotulo} ${sufixo}`;
}
