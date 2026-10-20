/**
 * Nacionalidade dos cadastros do /reservar (2026-10-20).
 *
 * Caso real: a dona tentou editar um cliente estrangeiro (para trocar o idioma)
 * e não conseguiu salvar: *"ta sem cpf.. e não salva sem cpf"*, *"acho que de
 * todos os estrangeiros ta nacionalidade 'brasileiro'"*. Em produção, os 50
 * cadastros vindos do link estavam sem nacionalidade, e os 8 estrangeiros com
 * o passaporte gravado na coluna do RG.
 *
 * O que este arquivo protege:
 * 1. O /reservar grava nacionalidade, e o passaporte no lugar dele.
 * 2. Passaporte repetido volta a ser detectado (a busca olha `numero_passaporte`).
 * 3. O script que corrige os cadastros antigos faz exatamente o combinado —
 *    rodado aqui de verdade, contra as migrações reais, antes de ir ao Supabase.
 * 4. O contrato imprime passaporte com o rótulo de passaporte.
 */
import { readFileSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb } from "./test-helpers/pglite-db";
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
    // Moram DENTRO do db.ts e usam o getDb LOCAL, que o mock não alcança.
    getSetting: async () => null,
    createClient: async (data: any) => {
      const [r] = await alvo.db.insert(s.clients).values(data).returning({ id: s.clients.id });
      return r.id;
    },
    updateClient: async (id: number, data: any) => {
      await alvo.db.update(s.clients).set(data).where(igual(s.clients.id, id));
    },
    // A busca de duplicado aceita o banco injetado: aponta para o de teste.
    encontrarClienteDuplicado: (dados: any, ignorarId?: number) =>
      real.encontrarClienteDuplicado(dados, ignorarId, alvo.db),
  };
});

const { appRouter } = await import("./routers");
const { documentosDoReservar, documentoDoContrato } = await import("./nacionalidade");

const contexto = (admin: boolean) => ({
  user: admin
    ? {
        id: 1, openId: "admin-teste", email: "admin@teste.local", name: "Admin Teste",
        loginMethod: "manus", role: "admin",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      }
    : null,
  req: { protocol: "https", headers: {}, cookies: {} } as unknown as TrpcContext["req"],
  res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
}) as TrpcContext;
const comoAdmin = () => appRouter.createCaller(contexto(true));
const comoPublico = () => appRouter.createCaller(contexto(false));

const cliente = async (id: number) =>
  (await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, id)))[0];

// ─── Puros ────────────────────────────────────────────────────────────────────

describe("documentosDoReservar", () => {
  it("estrangeiro: passaporte no campo de passaporte, em maiúsculas, e RG vazio", () => {
    expect(documentosDoReservar({ nacionalidade: "estrangeiro", passport: " ab123456 " })).toEqual({
      nacionalidade: "estrangeiro", cpf: null, rg: null,
      numeroPassaporte: "AB123456", tipoDocumento: "passaporte",
    });
  });

  it("brasileiro: CPF e RG, sem passaporte", () => {
    expect(documentosDoReservar({ nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "1234567" }))
      .toMatchObject({ nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "1234567", numeroPassaporte: null });
  });

  it("formulário antigo, sem o campo: a nacionalidade sai dos documentos", () => {
    expect(documentosDoReservar({ passport: "X9876543" }).nacionalidade).toBe("estrangeiro");
    expect(documentosDoReservar({ cpf: "529.982.247-25" }).nacionalidade).toBe("brasileiro");
    expect(documentosDoReservar({}).nacionalidade).toBeNull();
  });
});

describe("documentoDoContrato", () => {
  it("estrangeiro sai com o passaporte e o rótulo de passaporte", () => {
    expect(documentoDoContrato({ nacionalidade: "estrangeiro", rg: null, numeroPassaporte: "AB123456" }))
      .toEqual({ valor: "AB123456", tipo: "passaporte" });
  });

  it("brasileiro sai com o RG", () => {
    expect(documentoDoContrato({ nacionalidade: "brasileiro", rg: "1234567", numeroPassaporte: null }))
      .toEqual({ valor: "1234567", tipo: "rg" });
  });

  it("cadastro antigo com o passaporte no RG continua saindo (como RG) até a correção", () => {
    expect(documentoDoContrato({ nacionalidade: null, rg: "AB123456", numeroPassaporte: null }))
      .toEqual({ valor: "AB123456", tipo: "rg" });
  });
});

// ─── Procedures e script, contra PGlite ──────────────────────────────────────

describe("/reservar grava nacionalidade e documento no lugar certo", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  const formulario = { height: "1.80", weight: "80", lgpdConsent: true };

  it("o caso real: estrangeiro com passaporte", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "John Smith", email: "john@x.com",
      nacionalidade: "estrangeiro", passport: "ab123456", idioma: "en",
    });
    const c = await cliente(r.clientId);
    expect(c.nacionalidade).toBe("estrangeiro");
    expect(c.numeroPassaporte).toBe("AB123456");
    expect(c.tipoDocumento).toBe("passaporte");
    expect(c.rg).toBeNull();
    expect(c.cpf).toBeNull();
  });

  it("brasileiro com CPF", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "Ana Souza", email: "ana@x.com",
      nacionalidade: "brasileiro", cpf: "529.982.247-25",
    });
    const c = await cliente(r.clientId);
    expect(c.nacionalidade).toBe("brasileiro");
    expect(c.cpf).toBe("529.982.247-25");
    expect(c.numeroPassaporte).toBeNull();
  });

  it("aba antiga, sem o campo: deduz pelo documento em vez de deixar vazio", async () => {
    const r = await comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "Juan Pérez", email: "juan@x.com", passport: "ZZ998877",
    });
    expect((await cliente(r.clientId)).nacionalidade).toBe("estrangeiro");
  });

  it("estrangeiro sem passaporte é recusado pelo servidor", async () => {
    await expect(comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "Sem Doc", email: "sem@x.com", nacionalidade: "estrangeiro",
    })).rejects.toThrow(/passaporte/i);
  });

  it("passaporte repetido volta a ser detectado", async () => {
    await comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "John Smith", email: "john@x.com", nacionalidade: "estrangeiro", passport: "AB123456",
    });
    await expect(comoPublico().publicApi.submitPreRegistration({
      ...formulario, name: "John S.", email: "outro@x.com", nacionalidade: "estrangeiro", passport: "ab123456",
    })).rejects.toThrow(/documento/i);
  });
});

describe("edição do cliente estrangeiro", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  it("salva sem CPF quando marcado estrangeiro com passaporte, e limpa o RG duplicado", async () => {
    // Como o /reservar gravava antes: sem nacionalidade, passaporte no RG.
    const [{ id }] = await alvo.db.insert(schema.clients)
      .values({ name: "John Smith", email: "john@x.com", source: "site", rg: "AB123456" })
      .returning({ id: schema.clients.id });

    await comoAdmin().clients.update({
      id, nacionalidade: "estrangeiro", tipoDocumento: "passaporte",
      numeroPassaporte: "AB123456", rg: "", idioma: "en",
    });
    const c = await cliente(id);
    expect(c.nacionalidade).toBe("estrangeiro");
    expect(c.numeroPassaporte).toBe("AB123456");
    expect(c.rg).toBeNull();
    expect(c.idioma).toBe("en");
  });
});

describe("scripts/corrigir-nacionalidade-reservar.sql", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  const SCRIPT = readFileSync(
    path.resolve(import.meta.dirname, "../scripts/corrigir-nacionalidade-reservar.sql"), "utf8",
  );
  const rodar = () => (alvo.db as any).$client.exec(SCRIPT);

  async function semear() {
    const ins = async (v: any) =>
      (await alvo.db.insert(schema.clients).values({ name: "x", ...v }).returning({ id: schema.clients.id }))[0].id;
    return {
      estrangeiro: await ins({ source: "site", rg: " ab123456 " }),
      brasileiro: await ins({ source: "site", cpf: "529.982.247-25", rg: "1234567" }),
      semDocumento: await ins({ source: "site" }),
      manual: await ins({ source: "manual", nacionalidade: "brasileiro", cpf: "111.444.777-35" }),
      jaCorrigido: await ins({ source: "site", nacionalidade: "estrangeiro", numeroPassaporte: "QQ111222" }),
    };
  }

  it("estrangeiro: passaporte sai do RG; brasileiro: só ganha a nacionalidade", async () => {
    const ids = await semear();
    await rodar();

    const e = await cliente(ids.estrangeiro);
    expect(e).toMatchObject({ nacionalidade: "estrangeiro", numeroPassaporte: "AB123456", rg: null, tipoDocumento: "passaporte" });

    const b = await cliente(ids.brasileiro);
    expect(b).toMatchObject({ nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "1234567", numeroPassaporte: null });
  });

  it("não toca no que não tem como saber nem no que já estava certo", async () => {
    const ids = await semear();
    await rodar();
    expect((await cliente(ids.semDocumento)).nacionalidade).toBeNull();
    expect(await cliente(ids.manual)).toMatchObject({ nacionalidade: "brasileiro", cpf: "111.444.777-35" });
    expect((await cliente(ids.jaCorrigido)).numeroPassaporte).toBe("QQ111222");
  });

  it("é idempotente: a segunda rodada não muda nada", async () => {
    const ids = await semear();
    await rodar();
    const antes = await alvo.db.select().from(schema.clients);
    await rodar();
    const depois = await alvo.db.select().from(schema.clients);
    const sem = (l: any[]) => l.map(({ updatedAt, ...resto }) => resto);
    expect(sem(depois)).toEqual(sem(antes));
    expect(ids).toBeTruthy();
  });
});
