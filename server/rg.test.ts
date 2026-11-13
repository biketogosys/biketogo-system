/**
 * RG de qualquer estado (2026-11-06).
 *
 * A dona: *"tem RG que tem letras"*, com a foto de uma CNH de Minas, onde o RG
 * vem com "MG" na frente. A máscara apagava as letras e a validação só aceitava
 * o formato de SP. RG com mais de 9 dígitos (o do RS tem 10) perdia o último
 * dígito na máscara, sem aviso.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb } from "./test-helpers/pglite-db";
import type { TrpcContext } from "./_core/context";
import { mascararRG, rgValido } from "../shared/rg";

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
    createAuditLog: async () => {},
    encontrarClienteDuplicado: (dados: any, ignorarId?: number) =>
      real.encontrarClienteDuplicado(dados, ignorarId, alvo.db),
  };
});

const { appRouter } = await import("./routers");

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

describe("rgValido", () => {
  it.each([
    "MG-12.345.678", // Minas, com a sigla
    "MG12345678",
    "M-1.234.567", // Minas, modelo antigo
    "1234567890", // RS, 10 dígitos
  ])("aceita %s", (rg) => expect(rgValido(rg)).toBe(true));

  it.each(["1234567", "12.345.678", "12.345.678-9", "12.345.678-X", "12345678x"])(
    "continua aceitando o que já aceitava: %s",
    (rg) => expect(rgValido(rg)).toBe(true),
  );

  it.each([
    "12345", // curto
    "ABCDEFGH", // sem número
    "AB12345CD", // só 5 dígitos
    "123456789012345", // 15 caracteres
    "12.345.678-9!",
  ])("recusa %s", (rg) => expect(rgValido(rg)).toBe(false));
});

describe("mascararRG", () => {
  it.each([
    ["123456789", "12.345.678-9"], // SP, como sempre
    ["12345678x", "12.345.678-X"],
    ["mg-12.345.678", "MG-12.345.678"], // com letra: como foi digitado
    ["MG12345678", "MG12345678"],
    ["1234567890", "1234567890"], // RS: os 10 dígitos ficam
    ["12#34", "12.34"],
  ])("%s vira %s", (digitado, esperado) => {
    expect(mascararRG(digitado)).toBe(esperado);
  });
});

describe("o servidor aceita o RG com letra", () => {
  beforeEach(async () => { alvo.db = await createTestDb(); });

  const cliente = async (id: number) =>
    (await alvo.db.select().from(schema.clients).where(eq(schema.clients.id, id)))[0];

  it("cadastro pelo link com RG de Minas", async () => {
    const r = await appRouter.createCaller(contexto(false)).publicApi.submitPreRegistration({
      name: "Ana Souza", email: "ana@x.com", height: "1.70", weight: "60", lgpdConsent: true,
      nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "MG-12.345.678",
    });
    expect((await cliente(r.clientId)).rg).toBe("MG-12.345.678");
  });

  it("edição pela loja com RG de 10 dígitos", async () => {
    const [{ id }] = await alvo.db.insert(schema.clients)
      .values({ name: "Ana Souza", email: "ana@x.com", nacionalidade: "brasileiro", cpf: "529.982.247-25" })
      .returning({ id: schema.clients.id });
    await appRouter.createCaller(contexto(true)).clients.update({
      id, nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "1234567890",
    });
    expect((await cliente(id)).rg).toBe("1234567890");
  });

  it("RG sem sentido continua recusado, com mensagem que diz o formato", async () => {
    await expect(appRouter.createCaller(contexto(false)).publicApi.submitPreRegistration({
      name: "Ana Souza", email: "ana@x.com", height: "1.70", weight: "60", lgpdConsent: true,
      nacionalidade: "brasileiro", cpf: "529.982.247-25", rg: "AB12345CD",
    })).rejects.toThrow(/7 a 14 letras e números/);
  });
});
