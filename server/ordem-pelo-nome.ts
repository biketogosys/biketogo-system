/**
 * Ordem dos acessórios pelo número do nome (2026-11-07).
 *
 * A dona numerou os acessórios no começo do nome ("Coloquei o número e depois
 * o nome") para eles aparecerem nessa ordem, e a lista ignorava: saía primeiro
 * o último cadastrado.
 *
 * A comparação é NUMÉRICA: em texto puro "10 Bomba" vem antes de "2 Cadeado".
 * Nome sem número vai depois dos numerados, em ordem alfabética, e acento ou
 * maiúscula não mudam a posição ("Água" fica junto do "A").
 */
const colacao = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

export function compararPeloNome(a: string, b: string): number {
  return colacao.compare(a.trim(), b.trim());
}
