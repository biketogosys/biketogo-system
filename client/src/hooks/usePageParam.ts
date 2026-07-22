import { useCallback, useEffect, useState } from "react";

// ─── Q13: paginação com estado na URL (?page=N) ──────────────────────────────
// Fonte da verdade da página é a query string. Refresh mantém a página e o
// voltar/avançar do browser funciona (popstate).
//
// Usa history.pushState DIRETO (não o navigate do wouter) de propósito: trocar
// de página é troca de dados na MESMA tela, não navegação de rota — não deve
// disparar a View Transition (que faria a tela inteira piscar a cada página).
// Rotas do wouter casam só pelo pathname, então mexer na query aqui não afeta
// o roteamento. Drop-in para `useState(1)`: retorna [page, setPage].
export function usePageParam(key = "page"): [number, (page: number) => void] {
  const read = useCallback(() => {
    if (typeof window === "undefined") return 1;
    const raw = new URLSearchParams(window.location.search).get(key);
    const n = parseInt(raw ?? "1", 10);
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }, [key]);

  const [page, setPageState] = useState(read);

  // voltar/avançar do browser reflete na tela
  useEffect(() => {
    const onPop = () => setPageState(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [read]);

  const setPage = useCallback(
    (p: number) => {
      const next = Math.max(1, Math.floor(p) || 1);
      const params = new URLSearchParams(window.location.search);
      if (next <= 1) params.delete(key); // página 1 = URL limpa
      else params.set(key, String(next));
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.pushState(null, "", url);
      setPageState(next);
    },
    [key],
  );

  return [page, setPage];
}
