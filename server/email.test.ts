/**
 * Camada 1(b) — e-mail de novo lead (Resend).
 *
 * Unit tests puros (sem PGlite): template, escaping e o contrato do modo
 * log-only (sem RESEND_API_KEY o transporte NÃO chama a rede).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { buildNewLeadEmail, buildWelcomeEmail, escapeHtml, sendEmail, sendEmailDetalhado, resolverReplyTo } from "./email";
import { ENV } from "./_core/env";
import { getSetting } from "./db";
import type { ReturnDueItem } from "./overdue";

// `resolverReplyTo` lê as Configurações; aqui só interessa o que ele faz com o
// valor, não o banco.
vi.mock("./db", () => ({ getSetting: vi.fn() }));

describe("escapeHtml", () => {
  it("escapa &, <, > e aspas", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; 'y'&lt;/script&gt;",
    );
  });
});

describe("buildNewLeadEmail", () => {
  const lead = {
    clientId: 42,
    name: "Ana <b>Souza</b>",
    phone: "48 99999-0001",
    email: "ana@example.com",
    city: "Florianópolis",
    source: "site" as const,
  };

  it("escapa entrada do usuário no HTML (anti-injeção)", () => {
    const { html } = buildNewLeadEmail(lead, "");
    expect(html).toContain("Ana &lt;b&gt;Souza&lt;/b&gt;");
    expect(html).not.toContain("<b>Souza</b>");
  });

  it("com APP_URL: CTA aponta pro perfil do cliente (sem barra dupla)", () => {
    const { html } = buildNewLeadEmail(lead, "https://app.biketogo.com.br/");
    expect(html).toContain(`href="https://app.biketogo.com.br/clientes/42"`);
  });

  it("sem APP_URL: cai no texto de fallback (sem link quebrado)", () => {
    const { html } = buildNewLeadEmail(lead, "");
    expect(html).not.toContain("href=");
    expect(html).toContain("/clientes");
  });

  it("campos vazios não geram linha na tabela", () => {
    const { html } = buildNewLeadEmail({ ...lead, phone: null, city: "  " }, "");
    expect(html).not.toContain("Telefone");
    expect(html).not.toContain("Cidade");
    expect(html).toContain("E-mail");
  });

  it("origem shopify vira rótulo legível", () => {
    const { html } = buildNewLeadEmail({ ...lead, source: "shopify" }, "");
    expect(html).toContain("Site (Shopify)");
  });

  it("assunto carrega o nome do lead", () => {
    expect(buildNewLeadEmail(lead, "").subject).toBe("Novo pré-cadastro: Ana <b>Souza</b>");
  });
});

// ─── Boas-vindas ao CLIENTE (cadastro criado) ────────────────────────────────
describe("buildWelcomeEmail", () => {
  const empresa = {
    nome: "Bike To Go Floripa", cnpj: "", endereco: "", cidade: "",
    telefone: "(48) 98863-1669", email: "", logoUrl: null,
    whatsappAtendimento: "",
  };

  it("cumprimenta pelo PRIMEIRO nome", () => {
    const { html } = buildWelcomeEmail({ nome: "Ana Paula Souza", email: "a@x.com", origem: "reservar" }, empresa);
    expect(html).toContain("Oi, Ana!");
  });

  it("escapa nome com HTML", () => {
    const { html } = buildWelcomeEmail({ nome: "<b>Ana</b>", email: "a@x.com", origem: "reservar" }, empresa);
    expect(html).not.toContain("<b>Ana</b>");
  });

  it("não promete reserva confirmada (fechamento é humano)", () => {
    const { html } = buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "reservar" }, empresa);
    expect(html).toContain("WhatsApp");
    expect(html.toLowerCase()).not.toContain("reserva confirmada");
  });

  it("botão de WhatsApp só quando a empresa tem telefone", () => {
    const semTel = { ...empresa, telefone: "" };
    expect(buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, semTel).html)
      .not.toContain("wa.me");
    expect(buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, empresa).html)
      .toContain("wa.me/5548988631669");
  });


  // A loja tem DOIS números: reservas (chatbot) e atendimento (humano). Quem
  // recebe e-mail já passou da reserva, então o botão é o de atendimento.
  it("usa o WhatsApp de ATENDIMENTO, não o telefone do rodapé", () => {
    const comAtendimento = { ...empresa, telefone: "(48) 3333-4444", whatsappAtendimento: "(48) 98863-1669" };
    const { html } = buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, comAtendimento);
    expect(html).toContain("wa.me/5548988631669");
    expect(html).not.toContain("4833334444");
  });

  it("sem atendimento configurado, cai no telefone da empresa (não fica sem botão)", () => {
    const { html } = buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, empresa);
    expect(html).toContain("wa.me/5548988631669");
  });

  it("assunto usa o nome da empresa", () => {
    expect(buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, empresa).subject)
      .toBe("Cadastro recebido — Bike To Go Floripa");
  });
});

// ─── Item 12: Reply-To ───────────────────────────────────────────────────────
// O MX do domínio da loja aponta para o Shopify e o remetente (EMAIL_FROM) é só
// identidade de envio: sem Reply-To, resposta de cliente cai no vazio.
describe("resolverReplyTo", () => {
  beforeEach(() => vi.mocked(getSetting).mockReset());

  it("usa o e-mail que recebe os avisos da loja", async () => {
    vi.mocked(getSetting).mockImplementation(async (k: string) =>
      k === "notification_email" ? "loja@gmail.com" : "outro@x.com");
    expect(await resolverReplyTo()).toBe("loja@gmail.com");
  });

  it("cai no e-mail da empresa quando o de avisos está vazio", async () => {
    vi.mocked(getSetting).mockImplementation(async (k: string) =>
      k === "notification_email" ? "" : "contato@empresa.com");
    expect(await resolverReplyTo()).toBe("contato@empresa.com");
  });

  it("devolve null quando não há e-mail configurado ou o valor não é e-mail", async () => {
    vi.mocked(getSetting).mockResolvedValue("");
    expect(await resolverReplyTo()).toBeNull();
    vi.mocked(getSetting).mockResolvedValue("não é e-mail");
    expect(await resolverReplyTo()).toBeNull();
  });

  it("não derruba o envio se a leitura das Configurações falhar", async () => {
    vi.mocked(getSetting).mockImplementationOnce(() => Promise.reject(new Error("db fora")));
    await expect(resolverReplyTo()).resolves.toBeNull();
  });
});

describe("sendEmailDetalhado — reply_to no payload do Resend", () => {
  const keyOriginal = ENV.resendApiKey;
  let corpoEnviado: any = null;

  beforeEach(() => {
    corpoEnviado = null;
    ENV.resendApiKey = "re_teste";
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: any) => {
      corpoEnviado = JSON.parse(init.body);
      return { ok: true, text: async () => "" } as any;
    }));
  });
  afterEach(() => {
    ENV.resendApiKey = keyOriginal;
    vi.unstubAllGlobals();
  });

  it("manda reply_to quando há caixa configurada", async () => {
    const r = await sendEmailDetalhado({
      to: "cliente@x.com", subject: "Reserva", html: "<p>oi</p>", replyTo: "loja@gmail.com",
    });
    expect(r.ok).toBe(true);
    expect(corpoEnviado.reply_to).toBe("loja@gmail.com");
  });

  it("omite o campo quando não há caixa (em vez de mandar vazio)", async () => {
    await sendEmailDetalhado({ to: "cliente@x.com", subject: "Reserva", html: "<p>oi</p>", replyTo: null });
    expect("reply_to" in corpoEnviado).toBe(false);

    await sendEmailDetalhado({ to: "cliente@x.com", subject: "Reserva", html: "<p>oi</p>" });
    expect("reply_to" in corpoEnviado).toBe(false);
  });

  it("o remetente continua sendo o EMAIL_FROM do ambiente", async () => {
    await sendEmailDetalhado({ to: "c@x.com", subject: "s", html: "h", replyTo: "loja@gmail.com" });
    expect(corpoEnviado.from).toBe(ENV.emailFrom);
    expect(corpoEnviado.to).toEqual(["c@x.com"]);
  });
});
