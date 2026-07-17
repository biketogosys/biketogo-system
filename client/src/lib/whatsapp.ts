// ─── WhatsApp (wa.me) — link de mensagem pronta ─────────────────────────────
// Canal de contato da loja é o WhatsApp (fechamento é humano — reserva online
// vetada). Estes helpers montam o link wa.me que a Cassiana clica pra abrir a
// conversa com a mensagem já escrita. Reutilizável (Devoluções, cobrança...).

/**
 * Normaliza um telefone BR para o formato do wa.me: só dígitos, com DDI 55.
 * Números nacionais (10–11 dígitos, DDD incluso) ganham o 55 na frente;
 * números já com DDI (12–13 dígitos começando em 55) são mantidos.
 * Retorna null quando não dá pra formar um número válido (campo vazio/curto).
 */
export function normalizeBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  // 10 (DDD + fixo 8) ou 11 (DDD + celular 9) = número nacional → prefixa DDI
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length !== 12 && d.length !== 13) return null;
  if (!d.startsWith("55")) return null;
  return d;
}

/** Monta a URL wa.me com a mensagem, ou null se o telefone for inválido. */
export function buildWhatsappUrl(phone: string | null | undefined, message: string): string | null {
  const n = normalizeBrazilPhone(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
