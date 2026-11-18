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

/**
 * A lista inteira nessa ordem (2026-11-17: os acessórios DENTRO do contrato,
 * que o S18 não cobriu). Sem nome vai para o fim. Nome igual mantém a ordem de
 * entrada, porque o `sort` é estável: quem chama entrega a lista por `id`.
 */
export function ordenarPeloNome<T>(itens: readonly T[], nome: (item: T) => string | null | undefined): T[] {
  return [...itens].sort((a, b) => {
    const na = nome(a);
    const nb = nome(b);
    if (!na || !nb) return (na ? 0 : 1) - (nb ? 0 : 1);
    return compararPeloNome(na, nb);
  });
}
