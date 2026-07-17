// ─── E-mail (Resend) — canal de notificação do dono ─────────────────────────
// Substitui o notifyOwner do Manus (morto em produção). Sem RESEND_API_KEY o
// backend vira "log": imprime no console e não envia (modo dev:local). Envio
// NUNCA propaga erro — notificação não pode derrubar o fluxo que a disparou
// (mesmo princípio do upload não-fatal do /reservar).
import { ENV } from "./_core/env";
import { getDb, getSetting, setSetting } from "./db";
import { getReturnsDue, todaySaoPaulo, type ReturnDueItem } from "./overdue";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8_000;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailPayload = { to: string; subject: string; html: string };

/** Transporte cru. Retorna true só quando o Resend aceitou o envio. */
export async function sendEmail({ to, subject, html }: EmailPayload): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.log(`[Email] (log-only, sem RESEND_API_KEY) para=${to} assunto="${subject}"`);
    return false;
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: ENV.emailFrom, to: [to], subject, html }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[Email] Falha no envio (${res.status})${detail ? `: ${detail}` : ""}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email] Erro ao enviar:", err);
    return false;
  }
}

/**
 * E-mail para o dono: destinatário vem de Configurações → notification_email
 * (fallback company_email). Não-fatal de ponta a ponta.
 */
export async function sendOwnerEmail(subject: string, html: string): Promise<boolean> {
  try {
    const to = (await getSetting("notification_email")) || (await getSetting("company_email"));
    if (!to || !to.trim()) {
      console.warn("[Email] Sem destinatário (Configurações → Contato & Notificações → notification_email).");
      return false;
    }
    return await sendEmail({ to: to.trim(), subject, html });
  } catch (err) {
    console.warn("[Email] Erro ao notificar o dono:", err);
    return false;
  }
}

// ─── Template: novo lead (pré-cadastro do /reservar ou Shopify) ──────────────
export type NewLeadInfo = {
  clientId: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  source: "site" | "shopify";
};

export function buildNewLeadEmail(lead: NewLeadInfo, appUrl: string = ENV.appUrl): { subject: string; html: string } {
  const row = (label: string, value: string | null | undefined) =>
    value && value.trim()
      ? `<tr><td style="padding:4px 12px 4px 0;color:#71717a;white-space:nowrap">${label}</td><td style="padding:4px 0;color:#18181b;font-weight:600">${escapeHtml(value)}</td></tr>`
      : "";
  const origem = lead.source === "shopify" ? "Site (Shopify)" : "Página de reserva";
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/clientes/${lead.clientId}` : "";
  return {
    subject: `Novo pré-cadastro: ${lead.name}`,
    html: `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b45309;margin:0 0 4px">Bike To Go — novo lead</p>
  <h1 style="font-size:20px;color:#18181b;margin:0 0 16px">${escapeHtml(lead.name)}</h1>
  <table style="border-collapse:collapse;font-size:14px">
    ${row("Telefone", lead.phone)}
    ${row("E-mail", lead.email)}
    ${row("Cidade", lead.city)}
    ${row("Origem", origem)}
  </table>
  ${link
    ? `<p style="margin:20px 0 0"><a href="${link}" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">Abrir no painel</a></p>`
    : `<p style="margin:20px 0 0;font-size:14px;color:#71717a">Abra o painel em <strong>/clientes</strong> para validar o cadastro.</p>`}
</div>`.trim(),
  };
}

/** Dispara o e-mail de novo lead pro dono. Fire-safe: nunca lança. */
export async function sendNewLeadEmail(lead: NewLeadInfo): Promise<boolean> {
  const { subject, html } = buildNewLeadEmail(lead);
  return sendOwnerEmail(subject, html);
}

// ─── Template: digest matinal (devoluções de hoje + atrasadas) ───────────────
const fmtDay = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "—");

export function buildDigestEmail(
  returns: { overdue: ReturnDueItem[]; dueToday: ReturnDueItem[] },
  appUrl: string = ENV.appUrl,
): { subject: string; html: string } {
  const { overdue, dueToday } = returns;
  const link = appUrl ? appUrl.replace(/\/$/, "") : "";
  const total = overdue.length + dueToday.length;

  const row = (x: ReturnDueItem, late: boolean) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#18181b;font-weight:600">${escapeHtml(x.clientName)}</td>
      <td style="padding:6px 12px 6px 0;color:#3f3f46">${escapeHtml(x.bikeModel)}${x.tamanho ? ` · ${escapeHtml(x.tamanho)}` : ""}</td>
      <td style="padding:6px 0;color:${late ? "#dc2626" : "#b45309"};white-space:nowrap;text-align:right">${late ? `${x.daysLate}d atraso` : "hoje"} · ${fmtDay(x.endDate)}</td>
    </tr>`;
  const section = (title: string, items: ReturnDueItem[], late: boolean) =>
    items.length === 0
      ? ""
      : `<h2 style="font-size:15px;color:#18181b;margin:18px 0 6px">${title} (${items.length})</h2>
         <table style="border-collapse:collapse;font-size:14px;width:100%">${items.map((x) => row(x, late)).join("")}</table>`;

  return {
    subject: `Devoluções de hoje — ${total} pendente(s)${overdue.length ? `, ${overdue.length} em atraso` : ""}`,
    html: `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#b45309;margin:0 0 4px">Bike To Go — resumo do dia</p>
  <h1 style="font-size:20px;color:#18181b;margin:0 0 4px">Devoluções pendentes</h1>
  <p style="font-size:14px;color:#71717a;margin:0">${total} no total${overdue.length ? ` · ${overdue.length} em atraso` : ""}.</p>
  ${section("Em atraso", overdue, true)}
  ${section("Previstas para hoje", dueToday, false)}
  ${link ? `<p style="margin:22px 0 0"><a href="${link}/" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">Abrir o painel</a></p>` : ""}
</div>`.trim(),
  };
}

/**
 * Digest matinal pro dono: devoluções de hoje + atrasadas. Fire-safe.
 * Guarda anti-duplicação por dia (setting `digest_last_sent` = data SP) — se
 * o servidor reiniciar no dia, não reenvia. Não manda e-mail quando não há
 * nada pendente. Marca o dia como processado mesmo em log-only.
 */
export async function sendMorningDigest(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const today = todaySaoPaulo();
    if ((await getSetting("digest_last_sent")) === today) {
      console.log("[Digest] Já processado hoje, pulando.");
      return false;
    }
    const returns = await getReturnsDue(db);
    if (returns.overdue.length + returns.dueToday.length === 0) {
      console.log("[Digest] Nada pendente hoje — nenhum e-mail enviado.");
      return false;
    }
    const { subject, html } = buildDigestEmail(returns);
    const sent = await sendOwnerEmail(subject, html);
    await setSetting("digest_last_sent", today); // dia processado (mesmo log-only)
    return sent;
  } catch (err) {
    console.warn("[Digest] Erro:", err);
    return false;
  }
}
