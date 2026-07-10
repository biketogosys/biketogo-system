import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFileSync } from "fs";
import path from "path";
import * as schema from "../../drizzle/schema";

const DRIZZLE_DIR = path.resolve(import.meta.dirname, "../../drizzle");

/**
 * Cria um Postgres em memória (PGlite) e aplica as MIGRAÇÕES REAIS do repo,
 * na ordem do _journal.json (não por nome de arquivo — há tags duplicadas).
 * Retorna um db drizzle pronto para injeção via dbOverride.
 */
export async function createTestDb() {
  const client = new PGlite(); // em memória, isolado por teste
  const db = drizzle(client, { schema });

  const journal = JSON.parse(
    readFileSync(path.join(DRIZZLE_DIR, "meta/_journal.json"), "utf8"),
  );
  for (const entry of journal.entries) {
    const sql = readFileSync(path.join(DRIZZLE_DIR, `${entry.tag}.sql`), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s: string) => s.trim())
      .filter(Boolean);
    for (const st of statements) {
      await client.exec(st);
    }
  }
  return db;
}

type SeedOpts = { unitStatuses?: string[] };

/**
 * Semeia o mínimo: 1 client, 1 bike, 1 bike_size ("M") e N bike_units.
 * Por padrão 4 unidades "disponivel" (numeroSistema 001..004).
 * unitStatuses permite customizar o status de cada unidade.
 */
export async function seedBasics(db: any, opts: SeedOpts = {}) {
  const statuses = opts.unitStatuses ?? ["disponivel", "disponivel", "disponivel", "disponivel"];

  const [client] = await db
    .insert(schema.clients)
    .values({ name: "Cliente Teste" })
    .returning({ id: schema.clients.id });

  const [bike] = await db
    .insert(schema.bikes)
    .values({ serialNumber: `SN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, model: "Modelo Teste" })
    .returning({ id: schema.bikes.id });

  const [size] = await db
    .insert(schema.bikeSizes)
    .values({ bikeId: bike.id, tamanho: "M" })
    .returning({ id: schema.bikeSizes.id });

  const unitIds: number[] = [];
  for (let i = 0; i < statuses.length; i++) {
    const numero = String(i + 1).padStart(3, "0");
    const [u] = await db
      .insert(schema.bikeUnits)
      .values({ bikeSizeId: size.id, numeroSistema: numero, status: statuses[i] })
      .returning({ id: schema.bikeUnits.id });
    unitIds.push(u.id);
  }

  return { clientId: client.id, bikeId: bike.id, bikeSizeId: size.id, unitIds };
}

/** Insere um rental e retorna o id. */
export async function makeRental(
  db: any,
  r: {
    clientId: number;
    bikeId: number;
    bikeSizeId: number;
    quantity: number;
    startDate: string;
    endDate: string | null;
    status?: string;
    contractId?: number | null;
    deletedAt?: Date | null;
  },
) {
  const [rental] = await db
    .insert(schema.rentals)
    .values({
      clientId: r.clientId,
      bikeId: r.bikeId,
      bikeSizeId: r.bikeSizeId,
      quantity: r.quantity,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status ?? "active",
      contractId: r.contractId ?? null,
      deletedAt: r.deletedAt ?? null,
    })
    .returning({ id: schema.rentals.id });
  return rental.id;
}
