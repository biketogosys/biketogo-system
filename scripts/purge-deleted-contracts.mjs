// ─────────────────────────────────────────────────────────────────────────────
// purge-deleted-contracts.mjs
//
// Pedido da Cassiana (2026-08-14, WhatsApp): "consegue zerar os contratos até
// número 25 pra não bagunçar os valores?! Só o 26 que é novo" — os 25 primeiros
// contratos eram teste (1 mês de piloto ao vivo) e já foram excluídos pela tela
// (aba "Excluídos"). Ela quer que sumam de vez.
//
// O que este script faz — apaga PARA SEMPRE todo contrato com deletedAt
// preenchido (a aba "Excluídos" É esse filtro; #26 está ativo, então nunca é
// tocado):
//   1. rental_bike_units  das rentals do contrato (normalmente já vazio — o
//      releaseBikeUnits já rodou no soft-delete original; aqui é só garantia)
//   2. rentals            do contrato (já soft-deletadas; agora somem de vez)
//   3. contract_accessories do contrato (NUNCA foram soft-deletadas — o
//      soft-delete de contrato não toca nelas, ficam penduradas até hoje)
//   4. revenues cujo meta->>'contractId' aponta pra um desses contratos
//      ⚠️ É O PONTO QUE IMPORTA: revenues NÃO tem FK de verdade com contracts
//      (é só um campo dentro de um jsonb). Excluir o contrato pela tela NUNCA
//      tirou o dinheiro do Financeiro. Se algum desses 25 testes chegou a ser
//      marcado como pago, a receita dele CONTINUA nos relatórios até hoje —
//      é o "bagunçar os valores" mais provável de que a Cassiana está falando.
//   5. o contrato em si
//
// NÃO mexe em audit_logs (trilha de auditoria fica, é o normal) nem no arquivo
// PDF gravado no storage (custo de armazenamento é irrisório; limpar storage
// exigiria o módulo da aplicação compilado, fora do escopo de um script cru).
//
// NÃO renumera nada. O próximo contrato criado continua vindo do id seguinte
// (28, 29...), não volta pra 2. Isso é PROPOSITAL: o número do contrato é
// literalmente o id da linha no banco, e está embutido no link público que o
// cliente recebe por e-mail (signContractToken assina o id cru) e no nome do
// PDF salvo no storage. "Renumerar" trocaria o id de contratos que já podem
// ter sido enviados a clientes de verdade — o link dela quebraria sem aviso.
// Buraco no meio da sequência (26, 27, 28...) é cosmético e não afeta nada.
//
// Uso:
//   node scripts/purge-deleted-contracts.mjs                  # produção, DRY-RUN
//   node scripts/purge-deleted-contracts.mjs --apply          # produção, APAGA DE VEZ
//   node scripts/purge-deleted-contracts.mjs --pglite         # dev local, DRY-RUN
//   node scripts/purge-deleted-contracts.mjs --pglite --apply # dev local, APAGA
//
// Produção lê DATABASE_URL do ambiente. --pglite exige o servidor dev PARADO
// (PGlite é conexão única). Idempotente: rodar 2x não acha nada na 2ª.
// ⚠️ IRREVERSÍVEL: depois do --apply não tem "Restaurar" — a linha some do
// banco de verdade. Rode SEM --apply primeiro e confira a tabela com calma,
// principalmente a seção de receitas.
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
  url = url.replace(/:(?:\[)([^\]]+)(?:\])@/, (_, pass) => `:${encodeURIComponent(pass)}@`);
  if (!url) {
    console.error("✗ DATABASE_URL não definido no ambiente.");
    console.error("  → No Railway:  railway run node scripts/purge-deleted-contracts.mjs");
    console.error("  → Local:       defina DATABASE_URL (URL do Session pooler do Supabase) e rode de novo");
    console.error("  → Teste local: node scripts/purge-deleted-contracts.mjs --pglite");
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
const fmtBRL = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace(".", ",")}`;

try {
  // ── 1. Contratos já na lixeira (aba "Excluídos") ───────────────────────────
  const targets = await q(`
    SELECT ct.id, cl.name AS client_name, ct.status, ct."valorTotal",
           ct."criadoEm", ct."deletedAt"
    FROM contracts ct
    LEFT JOIN clients cl ON cl.id = ct."clientId"
    WHERE ct."deletedAt" IS NOT NULL
    ORDER BY ct.id
  `);

  console.log(`\n${APPLY ? "APLICANDO (apaga pra sempre)" : "DRY-RUN"} ${USE_PGLITE ? "(PGlite dev)" : "(produção)"}\n`);
  console.log(`Contratos já excluídos (na lixeira): ${targets.length}`);

  if (targets.length === 0) {
    console.log("→ Nada a fazer. A lixeira já está vazia.");
  } else {
    console.table(
      targets.map((c) => ({
        contrato: c.id,
        cliente: c.client_name ?? "—",
        status: c.status,
        total: fmtBRL(c.valorTotal),
        excluido_em: fmtDate(c.deletedAt),
      })),
    );

    const ids = targets.map((c) => c.id);

    // ── 2. Receitas fantasmas — o ponto que ela provavelmente quis dizer ─────
    const ghostRevenues = await q(
      `SELECT id, amount, date, (meta->>'contractId')::int AS contract_id
         FROM revenues
        WHERE (meta->>'contractId')::int = ANY($1::int[])`,
      [ids],
    );
    const ghostTotal = ghostRevenues.reduce((s, r) => s + Number(r.amount), 0);
    console.log(`\n⚠️  Receitas no Financeiro ligadas a esses contratos: ${ghostRevenues.length}`);
    if (ghostRevenues.length > 0) {
      console.table(ghostRevenues.map((r) => ({
        receita: r.id, contrato: r.contract_id, data: fmtDate(r.date), valor: fmtBRL(r.amount),
      })));
      console.log(`   Total que vai SAIR do Financeiro: ${fmtBRL(ghostTotal)}`);
      console.log("   (excluir o contrato pela tela nunca tirou esse dinheiro dos relatórios —");
      console.log("    revenues não tem ligação de verdade com contracts, só um campo solto)");
    } else {
      console.log("   Nenhuma. Os testes excluídos nunca chegaram a ser marcados como pagos.");
    }

    if (APPLY) {
      // ⚠️ Conta ANTES de apagar, com SELECT. O retorno de um DELETE não traz
      // linhas afetadas de forma igual nos dois adaptadores (postgres-js e
      // PGlite), e um contador mentindo aqui é grave: este relatório é a única
      // prova do que saiu do banco numa operação irreversível.
      let rentalsDeleted = 0, accessoriesDeleted = 0, revenuesDeleted = 0;
      for (const id of ids) {
        const rentalRows = await q(`SELECT id FROM rentals WHERE "contractId" = $1`, [id]);
        for (const r of rentalRows) {
          await q(`DELETE FROM rental_bike_units WHERE "rentalId" = $1`, [r.id]);
        }
        await q(`DELETE FROM rentals WHERE "contractId" = $1`, [id]);
        rentalsDeleted += rentalRows.length;

        const accRows = await q(`SELECT id FROM contract_accessories WHERE "contractId" = $1`, [id]);
        await q(`DELETE FROM contract_accessories WHERE "contractId" = $1`, [id]);
        accessoriesDeleted += accRows.length;

        const revRows = await q(
          `SELECT id FROM revenues WHERE (meta->>'contractId')::int = $1`, [id],
        );
        await q(`DELETE FROM revenues WHERE (meta->>'contractId')::int = $1`, [id]);
        revenuesDeleted += revRows.length;

        await q(`DELETE FROM contracts WHERE id = $1`, [id]);
      }
      console.log(`\n✓ ${ids.length} contrato(s) apagado(s) para sempre.`);
      console.log(`  ${rentalsDeleted} aluguel(is), ${accessoriesDeleted} vínculo(s) de acessório,`);
      console.log(`  ${revenuesDeleted} receita(s) fantasma removida(s).`);
      console.log("  Auditoria e arquivo de PDF no storage NÃO foram tocados (propositalmente).");
    } else {
      console.log(`\n→ Nada alterado. Rode com --apply para apagar de vez os ${ids.length} contratos`);
      console.log("  acima (e as receitas fantasmas, se houver). É IRREVERSÍVEL.");
    }
  }
} finally {
  await close();
}
