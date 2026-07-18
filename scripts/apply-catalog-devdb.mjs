// Aplica scripts/catalog-load-2026-07.sql no PGlite do dev:local e mostra as
// contagens (roda 2x para provar idempotência). Usar com o servidor PARADO
// (PGlite é conexão única). Uso:  node scripts/apply-catalog-devdb.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite(path.join(REPO, ".dev-db/pgdata"));
const sql = readFileSync(path.join(REPO, "scripts/catalog-load-2026-07.sql"), "utf8");

const counts = async () => {
  const q = async (t) => (await db.query(`SELECT count(*)::int AS n FROM "${t}"`)).rows[0].n;
  return {
    bikes: await q("bikes"),
    sizes: await q("bike_sizes"),
    bikeUnits: await q("bike_units"),
    accessories: await q("accessories"),
    accUnits: await q("accessory_units"),
  };
};

console.log("antes      :", JSON.stringify(await counts()));
await db.exec(sql);
console.log("após 1ª vez:", JSON.stringify(await counts()));
await db.exec(sql); // idempotência: nada deve mudar
console.log("após 2ª vez:", JSON.stringify(await counts()));

// Amostra: bikes carregadas com seus tamanhos/unidades
const sample = await db.query(`
  SELECT b.model, b."dailyRate", count(DISTINCT bs.id)::int AS tamanhos, count(u.id)::int AS unidades
  FROM bikes b
  LEFT JOIN bike_sizes bs ON bs."bikeId" = b.id
  LEFT JOIN bike_units u ON u."bikeSizeId" = bs.id
  WHERE b."serialNumber" LIKE 'BTG-%'
  GROUP BY b.id ORDER BY b.id`);
console.table(sample.rows);
await db.close();
