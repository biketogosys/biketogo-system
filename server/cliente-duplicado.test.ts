// Pedido da dona (2026-08-04): "cada cadastro deve ser único". Ela encontrou
// vários cadastros repetidos com os mesmos dados. Estes testes são a régua do
// que conta como repetido.
import { describe, expect, it, vi } from "vitest";
import * as schema from "../drizzle/schema";
import { encontrarClienteDuplicado } from "./db";
import { createTestDb } from "./test-helpers/pglite-db";

vi.setConfig({ testTimeout: 30_000 });

async function seedClientes(db: any) {
  const [a] = await db.insert(schema.clients).values({
    name: "Ana Souza", cpf: "390.533.447-05", email: "ana@exemplo.com", phone: "48999990001",
  }).returning({ id: schema.clients.id });
  const [b] = await db.insert(schema.clients).values({
    name: "John Traveler", numeroPassaporte: "X1234567", email: "john@exemplo.com",
  }).returning({ id: schema.clients.id });
  return { anaId: a.id, johnId: b.id };
}

describe("encontrarClienteDuplicado", () => {
  it("pega o mesmo CPF mesmo digitado com outra máscara", async () => {
    const db = await createTestDb();
    const { anaId } = await seedClientes(db);
    // sem pontuação: era assim que o duplicado entrava
    const dup = await encontrarClienteDuplicado({ cpf: "39053344705" }, undefined, db);
    expect(dup).toMatchObject({ id: anaId, name: "Ana Souza", campo: "cpf" });
  });

  it("pega o mesmo e-mail com maiúsculas e espaço", async () => {
    const db = await createTestDb();
    const { anaId } = await seedClientes(db);
    const dup = await encontrarClienteDuplicado({ email: "  Ana@Exemplo.COM " }, undefined, db);
    expect(dup).toMatchObject({ id: anaId, campo: "email" });
  });

  it("pega o mesmo passaporte (estrangeiro não tem CPF)", async () => {
    const db = await createTestDb();
    const { johnId } = await seedClientes(db);
    const dup = await encontrarClienteDuplicado({ passaporte: "x1234567" }, undefined, db);
    expect(dup).toMatchObject({ id: johnId, campo: "passaporte" });
  });

  it("deixa passar quem é realmente outra pessoa", async () => {
    const db = await createTestDb();
    await seedClientes(db);
    expect(await encontrarClienteDuplicado(
      { cpf: "111.444.777-35", email: "outro@exemplo.com" }, undefined, db,
    )).toBeNull();
  });

  it("NÃO bloqueia por telefone (casal e família dividem número)", async () => {
    const db = await createTestDb();
    await seedClientes(db);
    // mesmo telefone da Ana, pessoa diferente: tem que passar
    const dup = await encontrarClienteDuplicado(
      { cpf: "111.444.777-35", email: "marido@exemplo.com" }, undefined, db,
    );
    expect(dup).toBeNull();
  });

  it("ignora cadastro arquivado (soft delete)", async () => {
    const db = await createTestDb();
    const { anaId } = await seedClientes(db);
    const { eq } = await import("drizzle-orm");
    await db.update(schema.clients).set({ deletedAt: new Date() }).where(eq(schema.clients.id, anaId));
    expect(await encontrarClienteDuplicado({ cpf: "39053344705" }, undefined, db)).toBeNull();
  });

  it("na edição, o próprio cadastro não conta como duplicado", async () => {
    const db = await createTestDb();
    const { anaId } = await seedClientes(db);
    expect(await encontrarClienteDuplicado({ cpf: "39053344705" }, anaId, db)).toBeNull();
  });

  it("cadastro sem CPF, e-mail ou passaporte não trava ninguém", async () => {
    const db = await createTestDb();
    await seedClientes(db);
    expect(await encontrarClienteDuplicado({}, undefined, db)).toBeNull();
    expect(await encontrarClienteDuplicado({ cpf: "", email: "" }, undefined, db)).toBeNull();
    // CPF incompleto (digitando ainda) não pode casar com ninguém
    expect(await encontrarClienteDuplicado({ cpf: "390" }, undefined, db)).toBeNull();
  });
});
