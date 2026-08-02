// ─── Layout único dos e-mails da Bike To Go ──────────────────────────────────
// Um esqueleto, vários conteúdos: aviso de lead, resumo do dia e, na sequência,
// os e-mails de reserva e recibo para o CLIENTE. Se cada um tivesse HTML
// próprio, a marca ia divergir em três lugares diferentes.
//
// ⚠️ Regras de HTML de e-mail (não são preciosismo, é o que quebra na prática):
// - Layout em TABELA. Outlook usa o motor do Word e ignora flex/grid.
// - Estilo INLINE. Gmail corta <style> em boa parte dos casos.
// - Cor em HEX. `oklch()` dos tokens do app não existe em cliente de e-mail,
//   então aqui a paleta é a mesma do PDF (que já vive com essa limitação).
// - Imagem por URL ABSOLUTA e pública. A logo fica em `/storage/...`, que é
//   caminho relativo: sem o APP_URL na frente, o cliente de e-mail não acha.
// - Largura máxima 600px, o consenso que atravessa todos os clientes.
import { ENV } from "./_core/env";
import { getSetting } from "./db";

/** Escapa texto do usuário no HTML. Vive aqui porque o layout é quem monta o
 *  HTML; o `email.ts` reexporta para quem já importava de lá. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Mesma paleta do PDF do contrato (server/pdf.ts).
export const CORES = {
  dark: "#1A1A1A",
  gold: "#C8920A",
  ink: "#2A2A2A",
  muted: "#7C7C7C",
  line: "#E6E1D5",
  alt: "#FAF7EF",
  white: "#FFFFFF",
  fundo: "#F4F1EA",
};

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type DadosEmpresa = {
  nome: string; cnpj: string; endereco: string; cidade: string;
  telefone: string; email: string; logoUrl: string | null;
};

/** Empresa "vazia": o e-mail sai sem logo e sem rodapé, mas sai. */
export const EMPRESA_VAZIA: DadosEmpresa = {
  nome: "", cnpj: "", endereco: "", cidade: "", telefone: "", email: "", logoUrl: null,
};

/** Dados da empresa para o rodapé, das Configurações (mesma fonte do PDF). */
export async function carregarEmpresa(): Promise<DadosEmpresa> {
  const [nome, cnpj, endereco, cidade, telefone, email, logo] = await Promise.all([
    getSetting("company_name"), getSetting("company_cnpj"), getSetting("company_address"),
    getSetting("company_city"), getSetting("company_phone"), getSetting("company_email"),
    getSetting("company_logo_url"),
  ]);
  return {
    nome: nome ?? "", cnpj: cnpj ?? "", endereco: endereco ?? "", cidade: cidade ?? "",
    telefone: telefone ?? "", email: email ?? "", logoUrl: logo ?? null,
  };
}

/** `/storage/x.png` vira `https://app.../storage/x.png`. URL já absoluta passa. */
export function urlAbsoluta(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (ENV.appUrl ?? "").replace(/\/+$/, "");
  return base ? `${base}${url.startsWith("/") ? "" : "/"}${url}` : null;
}

/** Botão em tabela: <a> com padding some no Outlook. */
export function botao(texto: string, href: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0">
  <tr><td align="center" bgcolor="${CORES.gold}" style="border-radius:8px">
    <a href="${href}" style="display:inline-block;padding:12px 24px;font-family:${FONTE};font-size:14px;font-weight:700;color:${CORES.white};text-decoration:none;border-radius:8px">${escapeHtml(texto)}</a>
  </td></tr>
</table>`.trim();
}

/** Linha rótulo + valor. Some sozinha quando o valor é vazio. */
export function linha(rotulo: string, valor: string | null | undefined): string {
  if (!valor || !String(valor).trim()) return "";
  return `
<tr>
  <td style="padding:6px 16px 6px 0;font-family:${FONTE};font-size:13px;color:${CORES.muted};white-space:nowrap;vertical-align:top">${escapeHtml(rotulo)}</td>
  <td style="padding:6px 0;font-family:${FONTE};font-size:14px;color:${CORES.ink};font-weight:600">${escapeHtml(String(valor))}</td>
</tr>`.trim();
}

/** Bloco branco com título opcional, onde o conteúdo de cada e-mail entra. */
export function cartao(titulo: string | null, conteudoHtml: string): string {
  const cabecalho = titulo
    ? `<p style="margin:0 0 12px;font-family:${FONTE};font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${CORES.gold}">${escapeHtml(titulo)}</p>`
    : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${CORES.white};border:1px solid ${CORES.line};border-radius:12px">
  <tr><td style="padding:20px">${cabecalho}${conteudoHtml}</td></tr>
</table>`.trim();
}

/**
 * Monta o e-mail completo: faixa escura com logo e título, corpo em cartões e
 * rodapé com os dados da empresa.
 *
 * `preheader` é a linha que o Gmail mostra ao lado do assunto na lista. Sem
 * ela, o cliente de e-mail pega o primeiro texto que achar (que costuma ser
 * lixo tipo "BIKE TO GO · NOVO LEAD").
 */
export function montarEmail(opts: {
  titulo: string;
  preheader?: string;
  corpoHtml: string;
  empresa: DadosEmpresa;
}): string {
  const { titulo, preheader, corpoHtml, empresa } = opts;
  const logo = urlAbsoluta(empresa.logoUrl);

  const rodapeLinhas = [empresa.nome, empresa.cnpj, empresa.endereco, empresa.cidade, empresa.telefone]
    .filter((l) => l && l.trim())
    .map((l) => `<p style="margin:0 0 2px;font-family:${FONTE};font-size:11px;line-height:1.6;color:#9A9A9A">${escapeHtml(l)}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${CORES.fundo};-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CORES.fundo}">
  <tr><td align="center" style="padding:24px 12px">

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">

      <!-- Faixa da marca: logo à esquerda, título do e-mail à direita -->
      <tr><td style="background:${CORES.dark};border-radius:12px 12px 0 0;padding:20px 24px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle">
              ${logo
                ? `<img src="${logo}" alt="${escapeHtml(empresa.nome || "Bike To Go")}" width="132" style="display:block;width:132px;max-width:132px;height:auto;border:0">`
                : `<span style="font-family:${FONTE};font-size:18px;font-weight:700;color:${CORES.gold}">${escapeHtml(empresa.nome || "Bike To Go")}</span>`}
            </td>
            <td align="right" style="vertical-align:middle;font-family:${FONTE};font-size:15px;color:#D8D2C4;padding-left:12px">
              ${escapeHtml(titulo)}
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Filete âmbar da identidade -->
      <tr><td style="height:3px;background:${CORES.gold};font-size:0;line-height:0">&nbsp;</td></tr>

      <!-- Corpo -->
      <tr><td style="background:${CORES.alt};padding:24px">
        ${corpoHtml}
      </td></tr>

      <!-- Rodapé -->
      <tr><td style="background:${CORES.dark};border-radius:0 0 12px 12px;padding:20px 24px;text-align:center">
        ${rodapeLinhas}
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}
