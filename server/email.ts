// ─── E-mail (Resend) — canal de notificação do dono ─────────────────────────
// Substitui o notifyOwner do Manus (morto em produção). Sem RESEND_API_KEY o
// backend vira "log": imprime no console e não envia (modo dev:local). Envio
// NUNCA propaga erro — notificação não pode derrubar o fluxo que a disparou
// (mesmo princípio do upload não-fatal do /reservar).
import { ENV } from "./_core/env";
import { getSetting } from "./db";
import {
  CORES, EMPRESA_VAZIA, botao, cartao, carregarEmpresa, escapeHtml, linha,
  montarEmail, type DadosEmpresa,
} from "./email-layout";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8_000;
const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Reexportado: já era importado daqui por `routers.ts` antes do layout existir.
export { escapeHtml };

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  /**
   * Caixa que recebe a RESPOSTA do cliente. Sem isto a resposta vai para o
   * remetente (`EMAIL_FROM`), que é só identidade de envio: o MX do domínio da
   * loja aponta para o Shopify, então a mensagem se perde sem ninguém notar.
   */
  replyTo?: string | null;
};

export type ResultadoEnvio = { ok: boolean; motivo?: string };

/**
 * Para onde vai a resposta do cliente: o e-mail que a Cassiana lê de verdade,
 * configurado em Configurações → "E-mail que recebe os avisos da loja"
 * (`notification_email`), com o `company_email` como reserva.
 *
 * É o mesmo destino dos avisos da loja de propósito: se ela trocar de caixa,
 * troca num lugar só e vale para aviso e para resposta de cliente.
 */
export async function resolverReplyTo(): Promise<string | null> {
  try {
    const to = (await getSetting("notification_email")) || (await getSetting("company_email"));
    const limpo = (to ?? "").trim();
    return limpo.includes("@") ? limpo : null;
  } catch {
    return null;
  }
}

/**
 * Transporte cru, versão que DEVOLVE O MOTIVO da falha.
 *
 * O `sendEmail` engole o erro de propósito (notificação não pode derrubar o
 * cadastro que a disparou), e o efeito colateral é que sucesso e falha ficam
 * indistinguíveis para quem usa o sistema — foi exatamente o que travou o
 * Matheus em 2026-07-30. Quem quiser mostrar o erro na tela usa esta.
 */
export async function sendEmailDetalhado({ to, subject, html, replyTo }: EmailPayload): Promise<ResultadoEnvio> {
  if (!ENV.resendApiKey) {
    console.log(`[Email] (log-only, sem RESEND_API_KEY) para=${to} assunto="${subject}"${replyTo ? ` reply-to=${replyTo}` : ""}`);
    return { ok: false, motivo: "RESEND_API_KEY não está configurada no ambiente." };
  }
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ENV.emailFrom,
        to: [to],
        subject,
        html,
        // `reply_to` é o nome do campo na API do Resend.
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[Email] Falha no envio (${res.status})${detail ? `: ${detail}` : ""}`);
      return { ok: false, motivo: `Resend recusou (${res.status})${detail ? `: ${detail}` : ""}` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[Email] Erro ao enviar:", err);
    return { ok: false, motivo: `Erro de rede ao falar com o Resend: ${String(err)}` };
  }
}

/** Transporte cru. Retorna true só quando o Resend aceitou o envio. */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  return (await sendEmailDetalhado(payload)).ok;
}

/**
 * Envio de teste para a caixa configurada em Configurações. Devolve o motivo
 * quando falha, para a tela mostrar em vez de o erro morrer no log.
 */
export async function enviarEmailDeTeste(): Promise<ResultadoEnvio & { destinatario?: string }> {
  const to = (await getSetting("notification_email")) || (await getSetting("company_email"));
  if (!to || !to.trim()) {
    return { ok: false, motivo: "Nenhum e-mail configurado no campo acima. Preencha e salve antes de testar." };
  }
  const [empresa, replyTo] = await Promise.all([
    carregarEmpresa().catch(() => EMPRESA_VAZIA),
    resolverReplyTo(),
  ]);
  const html = montarEmail({
    titulo: "Teste de envio",
    preheader: "Se você recebeu isto, o envio de e-mail está funcionando.",
    empresa,
    corpoHtml: cartao(
      "Teste",
      `
<h1 style="margin:0 0 10px;font-family:${FONTE};font-size:22px;line-height:1.25;color:${CORES.dark};font-weight:700">Deu certo!</h1>
<p style="margin:0;font-family:${FONTE};font-size:14px;line-height:1.6;color:${CORES.ink}">
  Se esta mensagem chegou, o envio de e-mail do sistema está configurado e funcionando.
  É assim que os avisos da loja vão aparecer para você.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:14px">
  ${linha("Remetente", ENV.emailFrom)}
  ${linha("Enviado para", to.trim())}
  ${linha("Resposta do cliente vai para", replyTo ?? "ninguém (nenhum e-mail configurado)")}
</table>`.trim(),
    ),
  });
  const r = await sendEmailDetalhado({ to: to.trim(), subject: "Teste de envio — Bike To Go", html, replyTo });
  return { ...r, destinatario: to.trim() };
}

/**
 * E-mail para o dono: destinatário vem de Configurações → notification_email
 * (fallback company_email). Não-fatal de ponta a ponta.
 *
 * Sem `replyTo` de propósito: este e-mail JÁ vai para a caixa da loja, então
 * responder a ele seria responder a si mesma. O Reply-To existe para os
 * e-mails ao CLIENTE, que são os que recebem resposta.
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

export function buildNewLeadEmail(
  lead: NewLeadInfo,
  appUrl: string = ENV.appUrl,
  empresa: DadosEmpresa = EMPRESA_VAZIA,
): { subject: string; html: string } {
  const origem = lead.source === "shopify" ? "Site (Shopify)" : "Página de reserva";
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/clientes/${lead.clientId}` : "";

  const corpo = cartao(
    "Novo pré-cadastro",
    `
<h1 style="margin:0 0 14px;font-family:${FONTE};font-size:22px;line-height:1.25;color:${CORES.dark};font-weight:700">${escapeHtml(lead.name)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
  ${linha("Telefone", lead.phone)}
  ${linha("E-mail", lead.email)}
  ${linha("Cidade", lead.city)}
  ${linha("Origem", origem)}
</table>
${link
  ? botao("Abrir no painel", link)
  : `<p style="margin:20px 0 0;font-family:${FONTE};font-size:13px;color:${CORES.muted}">Abra o painel em <strong>/clientes</strong> para validar o cadastro.</p>`}
`.trim(),
  );

  return {
    subject: `Novo pré-cadastro: ${lead.name}`,
    html: montarEmail({
      titulo: "Novo lead",
      preheader: [lead.name, lead.city].filter(Boolean).join(" · "),
      corpoHtml: corpo,
      empresa,
    }),
  };
}

/** Dispara o e-mail de novo lead pro dono. Fire-safe: nunca lança. */
export async function sendNewLeadEmail(lead: NewLeadInfo): Promise<boolean> {
  const empresa = await carregarEmpresa().catch(() => EMPRESA_VAZIA);
  const { subject, html } = buildNewLeadEmail(lead, ENV.appUrl, empresa);
  return sendOwnerEmail(subject, html);
}

// ─── Template: boas-vindas para o CLIENTE (cadastro criado) ──────────────────
// Primeiro e-mail que o cliente recebe da loja. Vale para os dois caminhos de
// cadastro: o `/reservar` (ele mesmo preenche) e o cadastro manual da Cassiana.
// Não promete reserva confirmada: quem fecha o aluguel é ela, no WhatsApp
// (decisão de produto — reserva online é VETADA).
export type BoasVindasInfo = {
  nome: string;
  email: string;
  origem: "reservar" | "manual";
};

export function buildWelcomeEmail(
  info: BoasVindasInfo,
  empresa: DadosEmpresa = EMPRESA_VAZIA,
): { subject: string; html: string } {
  const primeiroNome = info.nome.trim().split(/\s+/)[0] || info.nome;
  const wa = (empresa.telefone || "").replace(/\D/g, "");
  const waUrl = wa.length >= 10
    ? `https://wa.me/${wa.length <= 11 ? `55${wa}` : wa}?text=${encodeURIComponent(`Oi! Sou ${info.nome} e acabei de fazer meu cadastro.`)}`
    : "";

  const corpo = cartao(
    "Cadastro recebido",
    `
<h1 style="margin:0 0 12px;font-family:${FONTE};font-size:22px;line-height:1.25;color:${CORES.dark};font-weight:700">Oi, ${escapeHtml(primeiroNome)}!</h1>
<p style="margin:0 0 10px;font-family:${FONTE};font-size:14px;line-height:1.6;color:${CORES.ink}">
  ${info.origem === "reservar"
    ? "Recebemos o seu cadastro. Obrigado por escolher a gente para o seu passeio."
    : "Seu cadastro foi criado aqui na loja. Obrigado por escolher a gente para o seu passeio."}
</p>
<p style="margin:0;font-family:${FONTE};font-size:14px;line-height:1.6;color:${CORES.ink}">
  <strong>O próximo passo é seu:</strong> chame a gente no WhatsApp para combinar
  <strong>a bike, as datas e a entrega</strong>. É por lá que a reserva é fechada.
</p>
${waUrl ? botao("Chamar no WhatsApp", waUrl) : ""}
`.trim(),
  );

  return {
    subject: `Cadastro recebido — ${empresa.nome || "Bike To Go Floripa"}`,
    html: montarEmail({
      titulo: "Cadastro recebido",
      preheader: `Oi ${primeiroNome}! Recebemos o seu cadastro. Chame a gente no WhatsApp para fechar a reserva.`,
      corpoHtml: corpo,
      empresa,
    }),
  };
}

/**
 * Manda as boas-vindas pro cliente. Fire-safe e silencioso quando não há
 * e-mail no cadastro (cadastro manual da Cassiana costuma vir sem).
 */
export async function sendWelcomeEmail(info: Partial<BoasVindasInfo>): Promise<boolean> {
  try {
    const email = (info.email ?? "").trim();
    if (!email || !email.includes("@")) return false;
    const [empresa, replyTo] = await Promise.all([
      carregarEmpresa().catch(() => EMPRESA_VAZIA),
      resolverReplyTo(),
    ]);
    const { subject, html } = buildWelcomeEmail(
      { nome: info.nome || "tudo bem", email, origem: info.origem ?? "manual" },
      empresa,
    );
    return await sendEmail({ to: email, subject, html, replyTo });
  } catch (err) {
    console.warn("[Email] Erro nas boas-vindas ao cliente:", err);
    return false;
  }
}
