// ─── WhatsApp (wa.me), link de mensagem pronta ───────────────────────────────
// Canal de contato da loja é o WhatsApp (fechamento é humano, reserva online
// vetada). Estes helpers montam o link wa.me que a Cassiana clica pra abrir a
// conversa com a mensagem já escrita. Reutilizável (Devoluções, cobrança...).

/**
 * Normaliza um telefone BR para o formato do wa.me: só dígitos, com DDI 55.
 * Números nacionais (10 a 11 dígitos, DDD incluso) ganham o 55 na frente;
 * números já com DDI (12 a 13 dígitos começando em 55) são mantidos.
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

/**
 * Normaliza qualquer telefone para o wa.me. O cadastro salva "+DDI número"
 * (cliente estrangeiro incluso), então quando o "+" está lá a gente confia nos
 * dígitos e não força DDI nenhum. Sem "+", cai na regra brasileira de sempre
 * (é o formato dos cadastros antigos).
 */
export function normalizePhoneForWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const d = trimmed.replace(/\D/g, "");
    // DDI (1 a 4) + assinante: menos que isso não é número discável.
    return d.length >= 8 && d.length <= 15 ? d : null;
  }
  return normalizeBrazilPhone(trimmed);
}

/** Monta a URL wa.me com a mensagem, ou null se o telefone for inválido. */
export function buildWhatsappUrl(phone: string | null | undefined, message: string): string | null {
  const n = normalizePhoneForWhatsapp(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
