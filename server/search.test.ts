/**
 * Q1 — Busca global Ctrl+K (PGlite).
 * Nome por ilike; CPF/telefone por dígitos (ignora máscara); contrato por
 * número ou nome do cliente; soft-deletados fora; < 2 chars = vazio.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";
import { globalSearch } from "./search";
import * as schema from "../drizzle/schema";

describe("globalSearch", () => {
  let db: any;
  let anaId: number;
  let contratoId: number;

  beforeAll(async () => {
    db = await createTestDb();
    await seedBasics(db); // "Cliente Teste" + bike "Modelo Teste" (SN-...)

    const [ana] = await db.insert(schema.clients).values({
      name: "Ana Beatriz Souza", cpf: "390.533.447-05", phone: "(48) 99999-0001",
    }).returning({ id: schema.clients.id });
    anaId = ana.id;

    await db.insert(schema.clients).values({
      name: "Cliente Apagado", cpf: "111.444.777-35", deletedAt: new Date(),
    });

    const [ct] = await db.insert(schema.contracts).values({
      clientId: anaId, status: "ativo",
    }).returning({ id: schema.contracts.id });
    contratoId = ct.id;

    await db.insert(schema.contracts).values({
      clientId: anaId, status: "ativo", deletedAt: new Date(),
    });
  });

  it("cliente por nome parcial, case-insensitive", async () => {
    const r = await globalSearch(db, "beatriz");
    expect(r.clients.map((c) => c.id)).toContain(anaId);
  });

  it("cliente por CPF em dígitos (ignora máscara)", async () => {
    const r = await globalSearch(db, "39053344");
    expect(r.clients.map((c) => c.id)).toContain(anaId);
  });

  it("cliente por telefone em dígitos", async () => {
    const r = await globalSearch(db, "999990001");
    expect(r.clients.map((c) => c.id)).toContain(anaId);
  });

  it("cliente soft-deletado não aparece", async () => {
    const r = await globalSearch(db, "Apagado");
    expect(r.clients).toEqual([]);
  });

  it("bike por modelo e por número de série", async () => {
    const porModelo = await globalSearch(db, "modelo tes");
    expect(porModelo.bikes.length).toBeGreaterThan(0);
    const sn = porModelo.bikes[0].serialNumber;
    const porSerie = await globalSearch(db, sn.slice(0, 6));
    expect(porSerie.bikes.map((b) => b.serialNumber)).toContain(sn);
  });

  it("contrato por número (#N) e por nome do cliente; deletado fora", async () => {
    const porNumero = await globalSearch(db, `#${contratoId}`);
    expect(porNumero.contracts.map((c) => c.id)).toContain(contratoId);
    const porNome = await globalSearch(db, "Ana Beatriz");
    expect(porNome.contracts.map((c) => c.id)).toContain(contratoId);
    // o contrato deletado da Ana não pode vir junto
    expect(porNome.contracts).toHaveLength(1);
    expect(porNome.contracts[0].clientName).toBe("Ana Beatriz Souza");
  });

  it("menos de 2 caracteres retorna vazio (sem query no banco)", async () => {
    const r = await globalSearch(db, "a");
    expect(r).toEqual({ clients: [], bikes: [], contracts: [] });
  });
});
