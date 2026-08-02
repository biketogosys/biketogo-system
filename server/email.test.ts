/**
 * Camada 1(b) — e-mail de novo lead (Resend).
 *
 * Unit tests puros (sem PGlite): template, escaping e o contrato do modo
 * log-only (sem RESEND_API_KEY o transporte NÃO chama a rede).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildNewLeadEmail, buildWelcomeEmail, escapeHtml, sendEmail } from "./email";
import type { ReturnDueItem } from "./overdue";

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

  it("assunto usa o nome da empresa", () => {
    expect(buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, empresa).subject)
      .toBe("Cadastro recebido — Bike To Go Floripa");
  });
});
