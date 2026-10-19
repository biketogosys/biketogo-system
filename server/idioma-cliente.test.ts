/**
 * E-mails, PDF e página do contrato no IDIOMA DO CLIENTE (2026-10-15).
 *
 * Pedido da dona, com o caso real: *"O cliente fez o cadastro como brasileiro,
 * mas ele é estrangeiro, e o restante escolheu tudo em inglês. Ele vai receber
 * o contrato em português? [...] eu reenviei um agora (baixei a versão inglês)
 * mas o email foi tudo em português mesmo"*.
 *
 * O que este arquivo protege:
 * 1. **O idioma vem de onde o cliente preencheu**, não da nacionalidade.
 * 2. **Nada de português sobrando** no e-mail em inglês ou espanhol, inclusive
 *    nos TERMOS, que são o motivo de o e-mail de reserva existir.
 * 3. **O PDF do cliente não troca de idioma sozinho**: gerar uma cópia em outra
 *    língua no painel não substitui o arquivo que ele baixa.
 *
 * ⚠️ Roda as PROCEDURES DE VERDADE contra PGlite, e o e-mail é capturado no
 * `fetch` do Resend: é o HTML que sairia de fato, não o de um builder isolado.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  return { db: null as any };
});

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const s = await import("../drizzle/schema");
  const { eq: igual } = await import("drizzle-orm");
  return {
    ...real,
    getDb: async () => alvo.db,
    // ⚠️ Estas funções moram DENTRO do `db.ts` e chamam o `getDb` LOCAL, que o
    // mock acima não alcança. Sem reimplementar, os termos por idioma nunca
    // seriam lidos do banco de teste e o cadastro cairia no banco real (ausente).
    getSetting: async (key: string) => {
      const [r] = await alvo.db.select().from(s.systemSettings).where(igual(s.systemSettings.key, key)).limit(1);
      return r?.value ?? null;
    },
    createClient: async (data: any) => {
      const [r] = await alvo.db.insert(s.clients).values(data).returning({ id: s.clients.id });
      return r.id;
    },
    updateClient: async (id: number, data: any) => {
      await alvo.db.update(s.clients).set(data).where(igual(s.clients.id, id));
    },
    createAuditLog: async (data: any) => {
      await alvo.db.insert(s.auditLogs).values({
        adminId: data.adminId ?? null,
        acao: data.acao,
        tabela: data.tabela,
        registroId: data.registroId ?? null,
        dadosAntes: data.dadosAntes ?? null,
        dadosDepois: data.dadosDepois ?? null,
        ip: data.ip ?? null,
      });
    },
  };
});

const { appRouter } = await import("./routers");
const { signContractToken } = await import("./routers");
const { enviarEmailDeContrato } = await import("./email-contract");
const { buildWelcomeEmail } = await import("./email");
const { valorPorExtenso } = await import("./valor-extenso");
const { normalizarIdioma } = await import("./idioma");
const { ENV } = await import("./_core/env");

function contextoAdmin(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-teste", email: "admin@teste.local", name: "Admin Teste",
      loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  } as TrpcContext;
}
const comoAdmin = () => appRouter.createCaller(contextoAdmin());
const comoPublico = () => appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
  res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
} as TrpcContext);

// ─── Captura do que sairia pelo Resend ───────────────────────────────────────
let enviados: Array<{ to: string[]; subject: string; html: string; text: string }> = [];
const chaveOriginal = ENV.resendApiKey;
const appUrlOriginal = ENV.appUrl;

/** Banco novo por teste, só nos blocos que rodam procedures (PGlite custa ~1,5s). */
const comBanco = () => beforeEach(async () => { alvo.db = await createTestDb(); });

beforeEach(() => {
  enviados = [];
  ENV.resendApiKey = "re_teste";
  // Sem APP_URL o e-mail sai sem o botão do link (o caminho relativo não abre
  // de dentro da caixa de entrada), e o botão é parte do que se confere aqui.
  ENV.appUrl = "https://sistema.teste";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: any) => {
    enviados.push(JSON.parse(init.body));
    return { ok: true, text: async () => "" } as any;
  }));
});
afterEach(() => {
  ENV.resendApiKey = chaveOriginal;
  ENV.appUrl = appUrlOriginal;
  vi.unstubAllGlobals();
});

/**
 * Português que não pode sobrar num e-mail em outra língua. Só palavras que
 * NÃO existem em espanhol ("Entrega" e "Reserva" existem, por isso ficam fora).
 */
const SO_PORTUGUES = [
  "Oi,", "Obrigado", "Detalhes da locação", "Itens da locação", "Equipamento",
  "diária", "Devolução prevista", "Visualizar", "Condições do contrato",
  "Condições gerais", "Recebemos", "Acessórios inclusos", "Desconto", "Tam. ",
  "Cartão", "Dinheiro", "Calculado para o", "Recibo de pagamento", "Chame a gente",
];
function semPortugues(html: string) {
  return SO_PORTUGUES.filter((p) => html.includes(p));
}

/** Contrato com 1 bike de 5 diárias (10% de desconto) e 1 capacete. */
async function seedContrato(opts: { idioma?: string; pago?: boolean; status?: string } = {}) {
  const base = await seedBasics(alvo.db);
  await alvo.db.update(schema.clients).set({
    name: "Ana Souza", email: "ana@exemplo.com", status: "verified",
    ...(opts.idioma ? { idioma: opts.idioma } : {}),
  }).where(eq(schema.clients.id, base.clientId));
  await alvo.db.update(schema.bikes).set({ brand: "Caloi", model: "Urbana Comfort", category: "speed" })
    .where(eq(schema.bikes.id, base.bikeId));

  const [contract] = await alvo.db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "450.00", status: (opts.status ?? "ativo") as any })
    .returning({ id: schema.contracts.id });
  await alvo.db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-10-10", endDate: "2026-10-15",
    dailyRate: "100.00", discountPercent: "10.00", totalAmount: "450.00",
    status: opts.status === "encerrado" ? "returned" : "active", contractId: contract.id,
    paymentStatus: opts.pago ? "paid" : "pending", paymentMethod: opts.pago ? "pix" : null,
  });
  const [acc] = await alvo.db.insert(schema.accessories)
    .values({ name: "Capacete", category: "CAPACETE" }).returning({ id: schema.accessories.id });
  await alvo.db.insert(schema.contractAccessories)
    .values({ contractId: contract.id, accessoryId: acc.id, qty: 1, status: "ok" });
  if (opts.pago) {
    await alvo.db.insert(schema.revenues).values({
      categoryId: 1, description: `Pagamento presencial · Contrato #${contract.id}`,
      amount: "450.00", date: "2026-10-15",
      meta: {
        kind: "contract_payment", contractId: contract.id,
        breakdown: [{ method: "pix", amount: "300.00" }, { method: "cash", amount: "150.00" }],
      },
    });
  }
  // Termos personalizados por idioma, como a loja salva em Configurações.
  await alvo.db.insert(schema.systemSettings).values([
    { key: "company_terms_pt", value: "1. Devolver a bicicleta no horário combinado (TERMO PT)." },
    { key: "company_terms_en", value: "1. Return the bicycle at the agreed time (TERM EN)." },
    { key: "company_terms_es", value: "1. Devolver la bicicleta en el horario acordado (TERM ES)." },
  ]);
  return { ...base, contractId: contract.id };
}

// ─── Puros ────────────────────────────────────────────────────────────────────

describe("normalizarIdioma", () => {
  it("cadastro antigo ou valor estranho cai em português", () => {
    expect(normalizarIdioma("en")).toBe("en");
    expect(normalizarIdioma("es")).toBe("es");
    expect(normalizarIdioma(null)).toBe("pt");
    expect(normalizarIdioma("fr")).toBe("pt");
  });
});

describe("valor por extenso no recibo do estrangeiro", () => {
  it.each([
    [1, "one real", "un real"],
    [21, "twenty-one reais", "veintiún reales"],
    [100, "one hundred reais", "cien reales"],
    [101, "one hundred one reais", "ciento un reales"],
    [220, "two hundred twenty reais", "doscientos veinte reales"],
    [220.5, "two hundred twenty reais and fifty cents", "doscientos veinte reales con cincuenta centavos"],
    [1500, "one thousand five hundred reais", "mil quinientos reales"],
    [21000, "twenty-one thousand reais", "veintiún mil reales"],
    [1_000_000, "one million reais", "un millón de reales"],
    [0.01, "one cent", "un centavo"],
  ])("%s → en e es", (valor, en, es) => {
    expect(valorPorExtenso(valor, "en")).toBe(en);
    expect(valorPorExtenso(valor, "es")).toBe(es);
  });

  it("o português continua o de sempre", () => {
    expect(valorPorExtenso(220)).toBe("duzentos e vinte reais");
    expect(valorPorExtenso(220, "pt")).toBe("duzentos e vinte reais");
  });

  it("acima do escopo devolve vazio em vez de inventar", () => {
    expect(valorPorExtenso(2_000_000_000, "es")).toBe("");
  });
});

describe("boas-vindas no idioma do cliente", () => {
  const empresa = {
    nome: "Bike To Go", cnpj: "", endereco: "", cidade: "Florianópolis", telefone: "",
    email: "", logoUrl: null, whatsappAtendimento: "48999990000",
  };

  it("inglês: saudação, botão, mensagem do WhatsApp e lang do HTML", () => {
    const { subject, html } = buildWelcomeEmail(
      { nome: "John Smith", email: "j@x.com", origem: "reservar", idioma: "en" }, empresa,
    );
    expect(subject).toBe("Registration received — Bike To Go");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Hi, John!");
    expect(html).toContain("Message us on WhatsApp");
    expect(html).toContain(encodeURIComponent("Hi! I'm John Smith and I have just registered."));
    expect(semPortugues(html)).toEqual([]);
  });

  it("espanhol, e sem nome a saudação não corta a expressão no meio", () => {
    const { html } = buildWelcomeEmail({ nome: "", email: "j@x.com", origem: "manual", idioma: "es" }, empresa);
    expect(html).toContain("¡Hola, qué tal!");
    expect(html).toContain("Escríbenos por WhatsApp");
  });

  it("sem idioma continua em português", () => {
    const { html } = buildWelcomeEmail({ nome: "Ana", email: "a@x.com", origem: "manual" }, empresa);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("Oi, Ana!");
  });
});

// ─── Procedures de verdade ────────────────────────────────────────────────────

describe("/reservar grava o idioma em que o cliente preencheu", () => {
  comBanco();

  const formulario = {
    name: "John Smith", height: "1.80", weight: "80", email: "john@exemplo.com", lgpdConsent: true,
  };

  it("o caso real: preencheu em inglês, recebe as boas-vindas em inglês", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({ ...formulario, idioma: "en" });
    const [cliente] = await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, r.clientId));
    expect(cliente.idioma).toBe("en");

    const boasVindas = enviados.find((e) => e.to[0] === "john@exemplo.com");
    expect(boasVindas?.subject).toMatch(/^Registration received/);
    expect(semPortugues(boasVindas!.html)).toEqual([]);
  });

  it("formulário antigo, sem o campo, continua em português", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({ ...formulario, email: "j2@exemplo.com" });
    const [cliente] = await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, r.clientId));
    expect(cliente.idioma).toBe("pt");
  });
});

describe("cadastro manual e edição", () => {
  comBanco();

  it("a loja escolhe o idioma e pode trocar depois", async () => {
    const { id } = await comoAdmin().clients.create({
      name: "Juan Pérez", email: "juan@exemplo.com", idioma: "es",
    });
    let [c] = await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, id));
    expect(c.idioma).toBe("es");
    expect(enviados.find((e) => e.to[0] === "juan@exemplo.com")?.subject).toMatch(/^Registro recibido/);

    await comoAdmin().clients.update({ id, idioma: "en" });
    [c] = await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, id));
    expect(c.idioma).toBe("en");
  });
});

describe("e-mails do contrato no idioma do cadastro", () => {
  comBanco();

  it("reserva em inglês: tudo em inglês, inclusive os TERMOS em inglês da loja", async () => {
    const { contractId } = await seedContrato({ idioma: "en" });
    const r = await enviarEmailDeContrato(alvo.db, contractId, "reserva", signContractToken(contractId));
    expect(r).toMatchObject({ ok: true, idioma: "en" });

    const [email] = enviados;
    expect(email.subject).toBe(`Bicycle rental reservation: contract #${contractId}`);
    expect(email.html).toContain('<html lang="en">');
    expect(email.html).toContain("Hi, Ana!");
    expect(email.html).toContain("View reservation details");
    expect(email.html).toContain("5 days");
    expect(email.html).toContain("Return the bicycle at the agreed time (TERM EN)");
    expect(email.html).not.toContain("TERMO PT");
    expect(semPortugues(email.html)).toEqual([]);
    // a versão texto puro sai do mesmo HTML: também sem português
    expect(semPortugues(email.text)).toEqual([]);
  });

  it("recibo em espanhol: quitação, formas de pagamento e extenso em espanhol", async () => {
    const { contractId } = await seedContrato({ idioma: "es", pago: true, status: "encerrado" });
    const r = await enviarEmailDeContrato(alvo.db, contractId, "recibo", signContractToken(contractId));
    expect(r.ok).toBe(true);

    const [email] = enviados;
    expect(email.subject).toBe(`Recibo de pago del alquiler de bicicletas: contrato #${contractId}`);
    expect(email.html).toContain("Recibimos de <strong>Ana Souza</strong> el valor de <strong>R$ 450,00</strong> (cuatrocientos cincuenta reales)");
    expect(email.html).toContain("el día <strong>15/10/2026</strong>");
    expect(email.html).toContain("en el período del 10/10/2026 al 15/10/2026");
    expect(email.html).toContain("Efectivo");
    expect(semPortugues(email.html)).toEqual([]);
  });

  it("cliente em português continua recebendo o de sempre", async () => {
    const { contractId } = await seedContrato();
    await enviarEmailDeContrato(alvo.db, contractId, "reserva", signContractToken(contractId));
    const [email] = enviados;
    expect(email.html).toContain("Oi, Ana!");
    expect(email.html).toContain("TERMO PT");
  });

  it("o reenvio pode forçar outro idioma, e a Auditoria registra qual saiu", async () => {
    const { contractId } = await seedContrato({ idioma: "en" });
    await comoAdmin().contracts.resendEmail({ id: contractId, tipo: "reserva", idioma: "es" });

    const [email] = enviados;
    expect(email.html).toContain('<html lang="es">');
    expect(email.html).toContain("Devolver la bicicleta en el horario acordado (TERM ES)");
    expect(semPortugues(email.html)).toEqual([]);

    const [log] = await alvo.db.select().from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.acao, "reenviou_email_contrato"), eq(schema.auditLogs.registroId, contractId)));
    expect((log.dadosDepois as any).idioma).toBe("es");
  });

  it("sem escolher, o reenvio usa o idioma do cadastro", async () => {
    const { contractId } = await seedContrato({ idioma: "en" });
    await comoAdmin().contracts.resendEmail({ id: contractId, tipo: "reserva" });
    expect(enviados[0].html).toContain('<html lang="en">');
  });
});

describe("PDF e página do contrato", () => {
  comBanco();

  it("o PDF do cliente sai no idioma dele; cópia em outra língua NÃO o substitui", async () => {
    const { contractId } = await seedContrato({ idioma: "en" });

    const oficial = await comoAdmin().contracts.generatePdf({ contractId });
    expect(oficial).toMatchObject({ idioma: "en", oficial: true });
    let [c] = await alvo.db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
    expect(c.pdfUrl).toBe(oficial.pdfUrl);

    const copia = await comoAdmin().contracts.generatePdf({ contractId, language: "pt" });
    expect(copia).toMatchObject({ idioma: "pt", oficial: false });
    [c] = await alvo.db.select().from(schema.contracts).where(eq(schema.contracts.id, contractId));
    expect(c.pdfUrl).toBe(oficial.pdfUrl);
  });

  it("a página pública recebe o idioma do cliente para abrir nele", async () => {
    const { contractId } = await seedContrato({ idioma: "es" });
    const pagina = await comoPublico().publicApi.contractByToken({ token: signContractToken(contractId) });
    expect(pagina.idioma).toBe("es");
  });

  it("o detalhe do contrato expõe o idioma, para o painel marcar a opção do cliente", async () => {
    const { contractId } = await seedContrato({ idioma: "en" });
    const c = await comoAdmin().contracts.getById({ id: contractId });
    expect(c.clientIdioma).toBe("en");
  });
});
