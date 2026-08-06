// ─── Papel do usuário logado (admin × operador) ──────────────────────────────
// O papel existia no banco e na tela de Usuários, mas NADA no app olhava para
// ele: o operador via Financeiro, Auditoria, Usuários e Configurações, e só
// descobria o limite ao tomar erro do servidor (2026-08-04).
//
// A régua da casa: **operador toca a operação, admin toca o dinheiro e a
// configuração.** Este hook é a fonte única dessa leitura no cliente; o servidor
// continua sendo quem de fato barra (`adminOnlyProcedure`), porque esconder menu
// não é segurança.
import { useAuth } from "@/_core/hooks/useAuth";

/** Áreas que só o administrador acessa. */
export const AREAS_RESTRITAS = ["/financeiro", "/auditoria", "/usuarios", "/configuracoes"] as const;

export function usePapel() {
  const { user, loading } = useAuth();
  const role = (user as { role?: string } | null)?.role ?? null;
  // Enquanto carrega, trata como NÃO-admin: melhor um menu que aparece um
  // instante depois do que um menu que pisca e some.
  const isAdmin = role === "admin";
  return {
    role,
    isAdmin,
    loading,
    /** O caminho é permitido para quem está logado? */
    podeVer: (path: string) => isAdmin || !AREAS_RESTRITAS.some((a) => path.startsWith(a)),
  };
}
