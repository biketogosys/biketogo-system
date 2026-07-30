// ─────────────────────────────────────────────────────────────────────────────
// cleanup-accessory-alugado.mjs
//
// Devolve para "disponivel" as unidades de ACESSÓRIO presas em `alugado` sem
// contrato vivo segurando elas.
//
// Por quê: até 2026-07-23 reservar acessório marcava `accessory_units.status =
// 'alugado'`. Naquela data a ocupação virou derivada de DATA (overlap de
// contratos) e o status virou INERTE — mas nada voltou os registros antigos.
// Resultado que a Cassiana viu em 2026-07-29: "Pedal Clip Road Shimano 0 / 2"
// em julho por causa de reserva de setembro, e "não consigo ver onde ele ta
// alugado" (não estava alugado em contrato nenhum, era status fantasma).
//
// Critério (conservador): status = 'alugado' E nenhuma linha de
// contract_accessories ligando a unidade a um contrato com aluguel VIVO
// (pending/active/overdue, não deletado). Unidade realmente comprometida
// continua como está — a disponibilidade dela já é calculada por data.
// `manutencao`/`perdido`/`roubado` NÃO são tocados: são verdade absoluta.
//
// Uso:
//   node scripts/cleanup-accessory-alugado.mjs                  # produção, DRY-RUN
//   node scripts/cleanup-accessory-alugado.mjs --apply          # produção, APLICA
//   node scripts/cleanup-accessory-alugado.mjs --pglite         # dev local, DRY-RUN
//   node scripts/cleanup-accessory-alugado.mjs --pglite --apply # dev local, APLICA
//
// Produção lê DATABASE_URL do ambiente. --pglite exige o servidor dev PARADO
// (PGlite é conexão única). Idempotente: rodar 2x não faz nada na 2ª.
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config"; // lê o .env da raiz, igual o app faz no boot
import path from "path";
import { fileURLToPath } from "url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const USE_PGLITE = process.argv.includes("--pglite");

let q;
let close;

if (USE_PGLITE) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(path.join(REPO, ".dev-db/pgdata"));
  q = async (text, params = []) => (await db.query(text, params)).rows;
  close = () => db.close();
} else {
  let url = (process.env.DATABASE_URL || "").replace(/^DATABASE_URL=/, "").replace(/^"|"$/g, "");
  url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);
  if (!url) {
    console.error("✗ DATABASE_URL não definido no ambiente.");
    console.error("  → Local:       defina DATABASE_URL (Session pooler do Supabase) e rode de novo");
    console.error("  → Teste local: node scripts/cleanup-accessory-alugado.mjs --pglite");
    process.exit(1);
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { ssl: "require", prepare: false, max: 3 });
  q = async (text, params = []) => await sql.unsafe(text, params);
  close = () => sql.end();
}

const fmtDate = (d) => {
  if (!d) return "?";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

try {
  console.log(`\n${APPLY ? "APLICANDO" : "DRY-RUN"} ${USE_PGLITE ? "(PGlite dev)" : "(produção)"}\n`);

  // ── 1. Panorama: quantas unidades estão 'alugado' ───────────────────────────
  const marcadas = await q(`
    SELECT au.id, au."accessoryId", a.name AS acessorio, au.variante, au."serialNumber"
      FROM accessory_units au
      LEFT JOIN accessories a ON a.id = au."accessoryId"
     WHERE au.status = 'alugado'
     ORDER BY au."accessoryId", au.id
  `);
  console.log(`Unidades com status 'alugado': ${marcadas.length}`);

  if (marcadas.length === 0) {
    console.log("Nada a fazer.\n");
    await close();
    process.exit(0);
  }

  // ── 2. Quais delas estão MESMO presas a contrato vivo ───────────────────────
  const presas = await q(`
    SELECT DISTINCT ca."unitId" AS id, ca."contractId",
           MIN(r."startDate") AS inicio, MAX(r."endDate") AS fim
      FROM contract_accessories ca
      JOIN rentals r ON r."contractId" = ca."contractId"
     WHERE ca."unitId" IS NOT NULL
       AND r."deletedAt" IS NULL
       AND r.status IN ('pending','active','overdue')
     GROUP BY ca."unitId", ca."contractId"
  `);
  const presasPorUnidade = new Map();
  for (const p of presas) {
    const arr = presasPorUnidade.get(p.id) ?? [];
    arr.push(p);
    presasPorUnidade.set(p.id, arr);
  }

  const fantasmas = marcadas.filter((u) => !presasPorUnidade.has(u.id));
  const legitimas = marcadas.filter((u) => presasPorUnidade.has(u.id));

  console.log(`  • presas a contrato vivo (NÃO serão tocadas): ${legitimas.length}`);
  console.log(`  • status fantasma (serão liberadas): ${fantasmas.length}\n`);

  if (legitimas.length > 0) {
    console.table(
      legitimas.map((u) => {
        const c = presasPorUnidade.get(u.id)[0];
        return {
          unidade: u.id,
          acessorio: u.acessorio ?? `#${u.accessoryId}`,
          variante: u.variante ?? "padrão",
          contrato: c.contractId,
          periodo: `${fmtDate(c.inicio)} a ${fmtDate(c.fim)}`,
        };
      }),
    );
  }

  if (fantasmas.length === 0) {
    console.log("Nenhum status fantasma. Nada a fazer.\n");
    await close();
    process.exit(0);
  }

  console.table(
    fantasmas.map((u) => ({
      unidade: u.id,
      acessorio: u.acessorio ?? `#${u.accessoryId}`,
      variante: u.variante ?? "padrão",
      serie: u.serialNumber ?? "—",
    })),
  );

  if (!APPLY) {
    console.log(`\nDRY-RUN: nada foi alterado. Rode com --apply para liberar ${fantasmas.length} unidade(s).\n`);
    await close();
    process.exit(0);
  }

  const ids = fantasmas.map((u) => u.id);
  await q(`UPDATE accessory_units SET status = 'disponivel' WHERE id = ANY($1::int[])`, [ids]);
  console.log(`\n✓ ${ids.length} unidade(s) liberada(s) para 'disponivel'.\n`);

  await close();
} catch (err) {
  console.error("\n✗ Falhou:", err?.message ?? err);
  try { await close(); } catch {}
  process.exit(1);
}
