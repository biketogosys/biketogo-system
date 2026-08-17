/**
 * Peças compartilhadas do changelog: usadas pela aba de leitura
 * (`pages/Updates.tsx`) e pela página de publicação (`pages/PublishUpdates.tsx`).
 *
 * Existe para as duas telas nunca divergirem em cor de categoria ou formato de
 * data — quem publica precisa ver exatamente o que a loja vai ver.
 */
export type Categoria = "novidade" | "melhoria" | "correcao";

export type UpdateItem = {
  id: number;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  criadoEm: string | Date;
  autorNome: string | null;
};

/** Rótulos e o que cada categoria significa (o texto de ajuda do formulário). */
export const CATEGORIAS: Array<{ valor: Categoria; label: string; ajuda: string }> = [
  { valor: "novidade", label: "Novidade", ajuda: "Algo novo, que não existia antes" },
  { valor: "melhoria", label: "Melhoria", ajuda: "Algo que já existia ficou melhor" },
  { valor: "correcao", label: "Correção", ajuda: "Consertamos um problema" },
];

// Padrão de status theme-adaptive da casa (nunca a paleta clara, que some no dark).
const CATEGORIA_CONFIG: Record<Categoria, { label: string; cls: string }> = {
  novidade: {
    label: "Novidade",
    cls: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  melhoria: {
    label: "Melhoria",
    cls: "bg-sky-500/20 text-sky-600 border-sky-500/30 dark:text-sky-400",
  },
  correcao: {
    label: "Correção",
    cls: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-400",
  },
};

export function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  const config = CATEGORIA_CONFIG[categoria];
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md border font-medium shrink-0 ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

/**
 * "17 ago 2026". Medido a 375px: por extenso ("17 de agosto de 2026") o par
 * badge + data pede 195px e só sobram 189 quando há botões de ação ao lado,
 * então a data caía para uma segunda linha e desalinhava o topo do card.
 */
export function formatarDataAtualizacao(data: string | Date) {
  const d = new Date(data);
  const mes = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(d.getDate()).padStart(2, "0")} ${mes} ${d.getFullYear()}`;
}
