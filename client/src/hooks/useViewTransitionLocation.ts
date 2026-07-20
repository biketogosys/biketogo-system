// ─── M2: View Transitions API nas rotas ──────────────────────────────────────
// Location hook do wouter que embrulha a navegação em
// document.startViewTransition — o navegador tira um "antes/depois" do DOM e
// interpola. Cobre <Link> e navigate() programático (a busca Ctrl+K inclusive),
// porque no wouter tudo passa por este hook.
//
// Progressive enhancement: sem suporte (ou com reduced-motion) navega direto,
// e aí o fallback `.motion-fade` do DashboardLayout assume.
import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useBrowserLocation } from "wouter/use-browser-location";

export const supportsViewTransition = () =>
  typeof document !== "undefined" && typeof (document as any).startViewTransition === "function";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type NavigateFn = ReturnType<typeof useBrowserLocation>[1];

export function useViewTransitionLocation(
  ...args: Parameters<typeof useBrowserLocation>
): [string, NavigateFn] {
  const [location, navigate] = useBrowserLocation(...args);

  const navigateWithTransition = useCallback<NavigateFn>(
    (to: any, options?: any) => {
      if (!supportsViewTransition() || prefersReducedMotion()) {
        return navigate(to, options);
      }
      // flushSync é obrigatório: startViewTransition captura o DOM no fim do
      // callback, e sem ele o React ainda não teria pintado a rota nova.
      (document as any).startViewTransition(() => {
        flushSync(() => {
          navigate(to, options);
        });
      });
    },
    [navigate],
  );

  return [location, navigateWithTransition];
}
