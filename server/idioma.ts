// ─── Idioma do cliente ───────────────────────────────────────────────────────
// Decide a língua dos e-mails ao cliente, do PDF do contrato e da página de
// acompanhamento (pedido da dona, 2026-10-15: "tem como enviar pro cliente em
// inglês?"). Os e-mails para a LOJA continuam em português.
//
// Os mesmos três códigos do /reservar (`client/src/lib/i18n.ts`) e do PDF.

export type Idioma = "pt" | "en" | "es";

export const IDIOMAS = ["pt", "en", "es"] as const;

/**
 * Qualquer valor vira um idioma válido. Cadastro anterior à migração 0024, ou
 * valor estranho vindo do banco, cai em português: é o idioma de todo e-mail
 * que já saiu até aqui.
 */
export function normalizarIdioma(valor: unknown): Idioma {
  return valor === "en" || valor === "es" ? valor : "pt";
}
