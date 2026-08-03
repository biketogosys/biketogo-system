// ─── Valor por extenso (pt-BR) ───────────────────────────────────────────────
// Exigência clássica de recibo: "recebemos a quantia de R$ 220,00 (duzentos e
// vinte reais)". O sistema antigo tinha isso, com bug de formatação — sai sem o
// "R$ 220,00" antes e com espaço sobrando dentro do parêntese.
//
// Escopo deliberado: até 999 bilhões, que é ordem de grandeza infinitamente
// acima de um aluguel de bicicleta. Acima disso devolve string vazia em vez de
// mentir, e quem chama decide o que fazer.

const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete",
  "dezoito", "dezenove",
];
const DEZENAS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
  "oitenta", "noventa",
];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/** Escreve 1..999 por extenso. Fora dessa faixa não é chamado. */
function ate999(n: number): string {
  if (n === 100) return "cem"; // "cento" só existe acompanhado (cento e um)
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

const ESCALAS: Array<{ divisor: number; singular: string; plural: string }> = [
  { divisor: 1_000_000_000, singular: "bilhão", plural: "bilhões" },
  { divisor: 1_000_000, singular: "milhão", plural: "milhões" },
  { divisor: 1_000, singular: "mil", plural: "mil" },
];

/** Parte inteira por extenso, sem a moeda. */
function inteiroPorExtenso(n: number): string {
  if (n === 0) return UNIDADES[0];
  const partes: string[] = [];
  let resto = n;
  for (const escala of ESCALAS) {
    const qtd = Math.floor(resto / escala.divisor);
    if (qtd > 0) {
      // "mil" não leva "um" na frente: 1.500 é "mil e quinhentos".
      const prefixo = escala.divisor === 1_000 && qtd === 1 ? "" : `${ate999(qtd)} `;
      partes.push(`${prefixo}${qtd === 1 ? escala.singular : escala.plural}`);
      resto %= escala.divisor;
    }
  }
  if (resto > 0) partes.push(ate999(resto));

  // Regra de ligação: "e" antes da última parcela quando ela é menor que cem ou
  // centena redonda (mil e duzentos), vírgula caso contrário (mil e duzentos e
  // trinta vira "mil, duzentos e trinta").
  if (partes.length === 1) return partes[0];
  const ultima = partes[partes.length - 1];
  const inicio = partes.slice(0, -1);
  const ligaComE = resto === 0 || resto < 100 || resto % 100 === 0;
  return ligaComE ? `${inicio.join(", ")} e ${ultima}` : `${inicio.join(", ")}, ${ultima}`;
}

/**
 * "220.00" → "duzentos e vinte reais". Aceita number ou string numérica
 * (os valores do banco são `numeric`, que o driver devolve como string).
 * Devolve "" quando o valor não é um número utilizável — quem chama omite a
 * frase em vez de imprimir "NaN reais".
 */
export function valorPorExtenso(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  if (n == null || !Number.isFinite(n)) return "";
  const negativo = n < 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return "";

  // Arredonda em centavos ANTES de separar: 0.615 vira 62 centavos, não 61.
  const centavosTotais = Math.round(abs * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;

  // "um milhão DE reais", mas "um milhão e quinhentos mil reais": a preposição
  // só entra quando o número termina exatamente na escala, sem resto.
  const terminaEmEscala = reais >= 1_000_000 && reais % 1_000_000 === 0;

  const partes: string[] = [];
  if (reais > 0) {
    partes.push(`${inteiroPorExtenso(reais)}${terminaEmEscala ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  if (partes.length === 0) partes.push("zero reais");

  return `${negativo ? "menos " : ""}${partes.join(" e ")}`;
}

/** "220.5" → "R$ 220,50". Formatação de dinheiro dos e-mails. */
export function formatarBRL(valor: number | string | null | undefined): string {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  if (n == null || !Number.isFinite(n)) return "R$ 0,00";
  return `R$ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
