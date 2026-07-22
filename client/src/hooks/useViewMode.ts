import { useCallback, useState } from "react";

// ─── Q14: modo de visualização das listas (grade / compacto / lista) ─────────
// É preferência do usuário → persiste em localStorage (não na URL). Cada tela
// passa uma `key` própria pra ter seu próprio modo lembrado. Drop-in [modo, set].
export type ViewMode = "grid" | "compact" | "list";

const isViewMode = (v: unknown): v is ViewMode =>
  v === "grid" || v === "compact" || v === "list";

export function useViewMode(
  key: string,
  initial: ViewMode = "grid",
): [ViewMode, (mode: ViewMode) => void] {
  const storageKey = `viewmode:${key}`;

  const [mode, setModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return initial;
    const saved = window.localStorage.getItem(storageKey);
    return isViewMode(saved) ? saved : initial;
  });

  const setMode = useCallback(
    (m: ViewMode) => {
      setModeState(m);
      try {
        window.localStorage.setItem(storageKey, m);
      } catch {
        // localStorage indisponível (modo privado/quota) — só não persiste
      }
    },
    [storageKey],
  );

  return [mode, setMode];
}
