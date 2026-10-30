/**
 * Endereço conforme o país (2026-10-26).
 *
 * Decisão da dona: *"O endereço é o do cliente mesmo, então tem que ser conforme
 * o país. O endereço da hospedagem não precisa ter"*. Antes o endereço era
 * brasileiro para todo mundo (CEP de 8 números com as letras apagadas, UF
 * obrigatória, país fixo "Brasil"): turista não conseguia informar o de casa.
 *
 * O que este arquivo protege:
 * 1. A tabela de formatos (`shared/enderecos.ts`), que o formulário público, o
 *    cadastro manual, o perfil e o PDF leem.
 * 2. O endereço BRASILEIRO no contrato continua idêntico ao de antes.
 * 3. O código postal estrangeiro chega ao banco com as letras e o país certo.
 * 4. A Agenda recebe o país (para não mostrar endereço do exterior como local
 *    de entrega).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, makeRental, seedBasics } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";
import { ehBrasil, enderecoEmLinha, formatoEndereco, paisDaOrigem } from "../shared/enderecos";

vi.setConfig({ testTimeout: 30_000 });

const alvo = vi.hoisted(() => {
  process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres-aqui";
  return { db: null as any };
});

vi.mock("./db", async (importOriginal) => {
  const real = await importOriginal<typeof import("./db")>();
  const s = await import("../drizzle/schema");
  return {
    ...real,
    getDb: async () => alvo.db,
    getSetting: async () => null,
    createClient: async (data: any) => {
      const [r] = await alvo.db.insert(s.clients).values(data).returning({ id: s.clients.id });
      return r.id;
    },
    encontrarClienteDuplicado: (dados: any, ignorarId?: number) =>
      real.encontrarClienteDuplicado(dados, ignorarId, alvo.db),
  };
});

const { appRouter } = await import("./routers");
const { getAgenda } = await import("./agenda");

const comoPublico = () => appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
  res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
} as TrpcContext);

// ─── Tabela de formatos ──────────────────────────────────────────────────────

describe("formatoEndereco", () => {
  it("Brasil, ou país vazio (cadastro antigo), é o formato brasileiro", () => {
    expect(formatoEndereco("Brasil").brasil).toBe(true);
    expect(formatoEndereco(null).brasil).toBe(true);
    expect(ehBrasil("")).toBe(true);
    expect(formatoEndereco("Brasil").codigo.pt).toBe("CEP");
  });

  it("EUA: ZIP code e estado, os dois obrigatórios", () => {
    const f = formatoEndereco("Estados Unidos");
    expect(f).toMatchObject({ brasil: false, exemploCodigo: "10001", codigoObrigatorio: true, regiaoObrigatoria: true });
    expect(f.codigo.en).toBe("ZIP code");
    expect(f.regiao?.en).toBe("State");
  });

  it("Itália: o código se chama CAP, com a sigla da província", () => {
    const f = formatoEndereco("Itália");
    expect(f.codigo.pt).toMatch(/^CAP/);
    expect(f.exemploRegiao).toBe("RM");
  });

  it("acento e maiúscula não importam", () => {
    expect(formatoEndereco("italia").codigo.pt).toMatch(/^CAP/);
    expect(formatoEndereco("ESTADOS UNIDOS").codigo.en).toBe("ZIP code");
  });

  it("França e Alemanha não usam estado no endereço", () => {
    expect(formatoEndereco("França").regiao).toBeNull();
    expect(formatoEndereco("Alemanha").regiao).toBeNull();
  });

  it("país sem regra própria cai no genérico, com código postal opcional", () => {
    const f = formatoEndereco("Islândia");
    expect(f.brasil).toBe(false);
    expect(f.codigoObrigatorio).toBe(false);
    expect(f.codigo.en).toBe("Postal code");
  });
});

describe("paisDaOrigem", () => {
  it("tira o país do valor do select de origem do documento", () => {
    expect(paisDaOrigem("Argentina (+54)")).toBe("Argentina");
    expect(paisDaOrigem("Estados Unidos (+1)")).toBe("Estados Unidos");
    expect(paisDaOrigem("Outro")).toBe("");
  });
});

describe("enderecoEmLinha (caixa do LOCATÁRIO no contrato)", () => {
  it("brasileiro: exatamente o formato de antes", () => {
    expect(enderecoEmLinha({
      street: "Rua das Flores", number: "123", complement: "Apto 4", neighborhood: "Centro",
      city: "Florianópolis", state: "SC", zipCode: "88010-000", country: "Brasil",
    })).toBe("Rua das Flores, 123 (Apto 4) · Centro · Florianópolis/SC · CEP 88010-000");
  });

  it("exterior: sem o rótulo CEP e com o país", () => {
    expect(enderecoEmLinha({
      street: "123 Main St", complement: "Apt 4B", city: "New York", state: "NY",
      zipCode: "10001", country: "Estados Unidos",
    })).toBe("123 Main St (Apt 4B) · New York · NY · 10001 · Estados Unidos");
  });

  it("sem nada preenchido devolve null", () => {
    expect(enderecoEmLinha({ country: "Brasil" })).toBeNull();
    expect(enderecoEmLinha(null)).toBeNull();
  });
});

// ─── Procedures, contra PGlite ───────────────────────────────────────────────

describe("/reservar com endereço do exterior", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  it("o código postal com letras chega inteiro, com o país, sem número nem bairro", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({
      name: "Oliver Smith", email: "oliver@x.com", height: "1.80", weight: "80", lgpdConsent: true,
      nacionalidade: "estrangeiro", passport: "UK123456",
      street: "10 Downing Street", complement: "Flat 2", city: "London",
      zipCode: "SW1A 2AA", country: "Reino Unido",
    });
    const [c] = await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, r.clientId));
    expect(c).toMatchObject({
      zipCode: "SW1A 2AA", country: "Reino Unido", city: "London",
      street: "10 Downing Street", complement: "Flat 2", number: null, neighborhood: null,
    });
    expect(c.accommodation).toBeNull();
  });
});

describe("Agenda recebe o país do cliente", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  it("para a tela não mostrar endereço do exterior como local de entrega", async () => {
    const seed = await seedBasics(alvo.db);
    await alvo.db.update(schema.clients)
      .set({ country: "Argentina", city: "Buenos Aires" })
      .where(eq(schema.clients.id, seed.clientId));
    await makeRental(alvo.db, {
      clientId: seed.clientId, bikeId: seed.bikeId, bikeSizeId: seed.bikeSizeId,
      quantity: 1, startDate: "2026-10-27", endDate: "2026-10-29", status: "active",
    });
    const agenda = await getAgenda(alvo.db, "2026-10-26", "2026-10-31", new Date("2026-10-26T12:00:00Z"));
    expect(agenda.deliveries[0]).toMatchObject({ country: "Argentina", city: "Buenos Aires" });
  });
});
