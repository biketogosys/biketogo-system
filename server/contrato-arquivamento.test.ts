// Pedido da dona (2026-08-04): "quando encerro o aluguel, o contrato vai para
// arquivados mesmo que eu não tenha cadastrado o pagamento. Tem como deixar ele
// em aberto até confirmar o pagamento?"
//
// A regra vive na query da listagem (`contracts.list`), então o teste roda a
// MESMA condição SQL contra o PGlite, em vez de reimplementá-la em JS.
import { describe, expect, it, vi } from "vitest";
import { and, isNull, sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";
import { createTestDb, seedBasics } from "./test-helpers/pglite-db";

vi.setConfig({ testTimeout: 30_000 });

/** Espelho da condição do `contracts.list` (view arquivados/ativos). */
function condicaoArquivado() {
  const naoPago = sql`EXISTS (
    SELECT 1 FROM ${schema.rentals} r
    WHERE r."contractId" = ${schema.contracts.id}
      AND r."deletedAt" IS NULL
      AND r."paymentStatus" <> 'paid'
  )`;
  return sql`(
    ${schema.contracts.status} = 'cancelado'
    OR (${schema.contracts.status} = 'encerrado' AND NOT ${naoPago})
  )`;
}

async function listar(db: any, view: "ativos" | "arquivados") {
  const arquivado = condicaoArquivado();
  const cond = view === "arquivados" ? arquivado : sql`NOT ${arquivado}`;
  const rows = await db
    .select({ id: schema.contracts.id, status: schema.contracts.status })
    .from(schema.contracts)
    .where(and(isNull(schema.contracts.deletedAt), cond));
  return rows.map((r: any) => r.id);
}

async function criarContrato(db: any, opts: { status: string; pago: boolean }) {
  const base = await seedBasics(db);
  const [c] = await db.insert(schema.contracts)
    .values({ clientId: base.clientId, valorTotal: "450.00", status: opts.status as any })
    .returning({ id: schema.contracts.id });
  await db.insert(schema.rentals).values({
    clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
    quantity: 1, startDate: "2026-08-10", endDate: "2026-08-15",
    status: opts.status === "encerrado" ? "returned" : "active",
    contractId: c.id, totalAmount: "450.00",
    paymentStatus: opts.pago ? "paid" : "pending",
  });
  return c.id;
}

describe("arquivamento do contrato depende do PAGAMENTO", () => {
  it("encerrado e NÃO pago continua em Ativos (é dinheiro a receber)", async () => {
    const db = await createTestDb();
    const id = await criarContrato(db, { status: "encerrado", pago: false });
    expect(await listar(db, "ativos")).toContain(id);
    expect(await listar(db, "arquivados")).not.toContain(id);
  });

  it("encerrado E pago vai para Arquivados", async () => {
    const db = await createTestDb();
    const id = await criarContrato(db, { status: "encerrado", pago: true });
    expect(await listar(db, "arquivados")).toContain(id);
    expect(await listar(db, "ativos")).not.toContain(id);
  });

  it("confirmar o pagamento move o contrato de Ativos para Arquivados", async () => {
    const db = await createTestDb();
    const id = await criarContrato(db, { status: "encerrado", pago: false });
    expect(await listar(db, "ativos")).toContain(id);

    const { eq } = await import("drizzle-orm");
    await db.update(schema.rentals).set({ paymentStatus: "paid" })
      .where(eq(schema.rentals.contractId, id));

    expect(await listar(db, "arquivados")).toContain(id);
    expect(await listar(db, "ativos")).not.toContain(id);
  });

  it("cancelado arquiva na hora, pago ou não (não há o que receber)", async () => {
    const db = await createTestDb();
    const id = await criarContrato(db, { status: "cancelado", pago: false });
    expect(await listar(db, "arquivados")).toContain(id);
  });

  it("contrato ativo não é afetado pela regra", async () => {
    const db = await createTestDb();
    const id = await criarContrato(db, { status: "ativo", pago: false });
    expect(await listar(db, "ativos")).toContain(id);
  });

  it("com vários aluguéis, UM não pago já segura o contrato em Ativos", async () => {
    const db = await createTestDb();
    const base = await seedBasics(db);
    const [c] = await db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "900.00", status: "encerrado" })
      .returning({ id: schema.contracts.id });
    for (const pago of [true, false]) {
      await db.insert(schema.rentals).values({
        clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
        quantity: 1, startDate: "2026-08-10", endDate: "2026-08-15", status: "returned",
        contractId: c.id, totalAmount: "450.00", paymentStatus: pago ? "paid" : "pending",
      });
    }
    expect(await listar(db, "ativos")).toContain(c.id);
  });

  it("aluguel soft-deletado não segura o contrato", async () => {
    const db = await createTestDb();
    const base = await seedBasics(db);
    const [c] = await db.insert(schema.contracts)
      .values({ clientId: base.clientId, valorTotal: "450.00", status: "encerrado" })
      .returning({ id: schema.contracts.id });
    await db.insert(schema.rentals).values({
      clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
      quantity: 1, startDate: "2026-08-10", endDate: "2026-08-15", status: "returned",
      contractId: c.id, totalAmount: "450.00", paymentStatus: "paid",
    });
    await db.insert(schema.rentals).values({
      clientId: base.clientId, bikeId: base.bikeId, bikeSizeId: base.bikeSizeId,
      quantity: 1, startDate: "2026-08-10", endDate: "2026-08-15", status: "returned",
      contractId: c.id, totalAmount: "450.00", paymentStatus: "pending",
      deletedAt: new Date(),
    });
    expect(await listar(db, "arquivados")).toContain(c.id);
  });
});
