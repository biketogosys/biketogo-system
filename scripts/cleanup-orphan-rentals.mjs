// ─────────────────────────────────────────────────────────────────────────────
// cleanup-orphan-rentals.mjs
//
// Limpa os ALUGUÉIS ÓRFÃOS deixados pelo bug do createManual (que criava o
// rental SEM contractId). Esses aluguéis:
//   • têm contractId NULL, source='manual', status='pending', deletedAt NULL
//     — critério que casa EXATAMENTE com o bug (rental pendente sem contrato).
//     Aluguéis avulsos legítimos do fluxo antigo nasciam 'active', então NÃO
//     entram aqui. confirmPayment nunca alcança um órfão (age por contractId),
//     logo ele fica 'pending' pra sempre — por isso o filtro é seguro.
//   • ainda SEGURAM unidades físicas (rental_bike_units) → inflam o "X alugada"
//     no editor de tamanhos, mesmo o contrato aparecendo vazio.
//
// Ação: libera as unidades (apaga rental_bike_units) e arquiva o aluguel
// (deletedAt = agora). NÃO apaga contrato nenhum — os contratos que ficaram
// vazios são listados pra você decidir recriar/excluir.
//
// Uso:
//   node scripts/cleanup-orphan-rentals.mjs                 # produção, DRY-RUN (só mostra)
//   node scripts/cleanup-orphan-rentals.mjs --apply         # produção, APLICA
//   node scripts/cleanup-orphan-rentals.mjs --pglite        # dev local (.dev-db), DRY-RUN
//   node scripts/cleanup-orphan-rentals.mjs --pglite --apply# dev local, APLICA
//
// Produção lê DATABASE_URL do ambiente. --pglite exige o servidor dev PARADO
// (PGlite é conexão única). Idempotente: rodar 2x não faz nada na 2ª.
// ─────────────────────────────────────────────────────────────────────────────
import path from "path";
import { fileURLToPath } from "url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const USE_PGLITE = process.argv.includes("--pglite");

// ── Adaptador de conexão (postgres-js em prod, PGlite no dev) ─────────────────
let q;      // async (text, params?) => rows[]
let close;  // async () => void

if (USE_PGLITE) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(path.join(REPO, ".dev-db/pgdata"));
  q = async (text, params = []) => (await db.query(text, params)).rows;
  close = () => db.close();
} else {
  let url = (process.env.DATABASE_URL || "").replace(/^DATABASE_URL=/, "").replace(/^"|"$/g, "");
  if (!url) {
    console.error("✗ DATABASE_URL não definido. Rode com --pglite para testar no banco local.");
    process.exit(1);
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { ssl: "require", prepare: false, max: 3 });
  q = async (text, params = []) => await sql.unsafe(text, params);
  close = () => sql.end();
}

// date pode vir como string (postgres-js) ou Date (PGlite) — normaliza p/ YYYY-MM-DD
const fmtDate = (d) => {
  if (!d) return "?";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

try {
  // ── 1. Aluguéis órfãos ──────────────────────────────────────────────────────
  const orphans = await q(`
    SELECT r.id, r."clientId", c.name AS client_name, r."bikeId", b.model AS bike_model,
           r."startDate", r."endDate", r.status, r."createdAt"
    FROM rentals r
    LEFT JOIN clients c ON c.id = r."clientId"
    LEFT JOIN bikes  b ON b.id = r."bikeId"
    WHERE r."contractId" IS NULL
      AND r.source = 'manual'
      AND r.status = 'pending'
      AND r."deletedAt" IS NULL
    ORDER BY r.id
  `);

  console.log(`\n${APPLY ? "APLICANDO" : "DRY-RUN"} ${USE_PGLITE ? "(PGlite dev)" : "(produção)"}\n`);
  console.log(`Aluguéis órfãos encontrados: ${orphans.length}`);

  if (orphans.length > 0) {
    // unidades seguradas por esses aluguéis
    const ids = orphans.map((o) => o.id);
    const units = await q(
      `SELECT rbu."rentalId", bu."numeroSistema"
         FROM rental_bike_units rbu
         JOIN bike_units bu ON bu.id = rbu."bikeUnitId"
        WHERE rbu."rentalId" = ANY($1::int[])`,
      [ids],
    );
    const unitsByRental = new Map();
    for (const u of units) {
      const arr = unitsByRental.get(u.rentalId) ?? [];
      arr.push(u.numeroSistema);
      unitsByRental.set(u.rentalId, arr);
    }
    console.table(
      orphans.map((o) => ({
        rental: o.id,
        cliente: o.client_name ?? `#${o.clientId}`,
        bike: o.bike_model ?? `#${o.bikeId}`,
        periodo: `${fmtDate(o.startDate)} → ${fmtDate(o.endDate)}`,
        unidades: (unitsByRental.get(o.id) ?? []).join(", ") || "—",
      })),
    );

    if (APPLY) {
      let releasedUnits = 0;
      for (const o of orphans) {
        const del = await q(`DELETE FROM rental_bike_units WHERE "rentalId" = $1`, [o.id]);
        releasedUnits += (del?.count ?? del?.length ?? 0) || (unitsByRental.get(o.id)?.length ?? 0);
        await q(`UPDATE rentals SET "deletedAt" = now() WHERE id = $1`, [o.id]);
      }
      console.log(`\n✓ ${orphans.length} aluguel(is) arquivado(s); unidades liberadas.`);
    } else {
      console.log(`\n→ Nada alterado. Rode com --apply para liberar as unidades e arquivar.`);
    }
  }

  // ── 2. Contratos que ficaram SEM aluguéis (informativo) ─────────────────────
  const emptyContracts = await q(`
    SELECT ct.id, cl.name AS client_name, ct.status, ct."valorTotal", ct."criadoEm"
    FROM contracts ct
    LEFT JOIN clients cl ON cl.id = ct."clientId"
    WHERE ct."deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM rentals r
        WHERE r."contractId" = ct.id AND r."deletedAt" IS NULL
      )
    ORDER BY ct.id
  `);
  console.log(`\nContratos sem nenhuma bike vinculada: ${emptyContracts.length}`);
  if (emptyContracts.length > 0) {
    console.table(emptyContracts.map((c) => ({
      contrato: c.id,
      cliente: c.client_name ?? "—",
      status: c.status,
      total: c.valorTotal ?? "—",
    })));
    console.log("→ Estes contratos ficaram vazios (bug antigo). Recrie ou exclua pela tela.");
  }
} finally {
  await close();
}
