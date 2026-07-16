/**
 * Camada 1(b) — e-mail de novo lead (Resend).
 *
 * Unit tests puros (sem PGlite): template, escaping e o contrato do modo
 * log-only (sem RESEND_API_KEY o transporte NÃO chama a rede).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { buildNewLeadEmail, escapeHtml, sendEmail } from "./email";

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

describe("sendEmail — modo log-only", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sem RESEND_API_KEY: retorna false e NÃO toca a rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ok = await sendEmail({ to: "dona@example.com", subject: "t", html: "<p>x</p>" });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
