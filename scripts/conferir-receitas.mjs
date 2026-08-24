// ─────────────────────────────────────────────────────────────────────────────
// conferir-receitas.mjs
//
// LEITURA PURA. Não altera nada, nunca — nem com flag. É a medição que precede
// a troca da régua dos cards do Financeiro (2026-08-24).
//
// O problema: os cards e a lista de lançamentos respondem perguntas diferentes.
// A lista mostra o que ENTROU no caixa (data do recebimento); o card "Receita de
// aluguéis" mostra quanto valem os aluguéis que COMEÇARAM no período (data de
// início). Por isso a lista pode somar R$ 1.305 e o card dizer R$ 740, sem que
// nenhum dos dois esteja "quebrado".
//
// A correção é fazer os cards lerem a mesma fonte da lista. Antes disso, este
// script responde as três perguntas que decidem se isso é seguro:
//
//   A) LIXO — lançamentos "Ajuste do Contrato #N (edição)" de contrato que
//      NUNCA foi pago. É dinheiro que não entrou, gravado por um bug corrigido
//      em 2026-08-24. Hoje aparece na lista mas não soma nos cards; DEPOIS da
//      troca passaria a somar. Tem que ser limpo ANTES, senão a tela fica
//      coerente e errada.
//
//   B) BURACO — aluguel marcado como pago que nunca gerou lançamento. É o único
//      caso em que o número da loja CAIRIA com a troca de régua: hoje ele conta
//      pelo lado dos aluguéis e depois não teria linha nenhuma para contar.
//
//   C) CATEGORIA — os pagamentos de contrato entram com `categoryId` fixo = 1.
//      Se não existir categoria de receita com esse id, a tela mostra "—", o CSV
//      do contador sai como "Sem categoria" e o filtro por categoria não acha.
//
// Uso:
//   node scripts/conferir-receitas.mjs            # produção (lê DATABASE_URL)
//   node scripts/conferir-receitas.mjs --pglite   # dev local (servidor PARADO)
// ─────────────────────────────────────────────────────────────────────────────
import path from "path";
import { fileURLToPath } from "url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USE_PGLITE = process.argv.includes("--pglite");

let q, close;
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
    console.error("  → No Railway:  railway run node scripts/conferir-receitas.mjs");
    console.error("  → Teste local: node scripts/conferir-receitas.mjs --pglite");
    process.exit(1);
  }
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { ssl: "require", prepare: false, max: 3 });
  q = async (text, params = []) => await sql.unsafe(text, params);
  close = () => sql.end();
}

const brl = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace(".", ",")}`;
const dia = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? "").slice(0, 10));

// Mesma condição do relatório (server/db.ts): as duas vias de reconhecimento,
// `meta.contractId` para o que foi gravado depois da correção e a descrição
// para o legado que não tem meta.
const DE_CONTRATO = `(v.meta->>'contractId' IS NOT NULL OR v.description LIKE '%Contrato #%')`;

try {
  console.log(`\nCONFERÊNCIA DE RECEITAS ${USE_PGLITE ? "(PGlite dev)" : "(PRODUÇÃO)"} — leitura pura, nada é alterado\n`);

  // ── Panorama ───────────────────────────────────────────────────────────────
  const [tot] = await q(`
    SELECT COUNT(*)::int AS linhas,
           COALESCE(SUM(v.amount::numeric), 0) AS soma,
           COALESCE(SUM(CASE WHEN ${DE_CONTRATO} THEN v.amount::numeric ELSE 0 END), 0) AS de_contrato,
           COALESCE(SUM(CASE WHEN ${DE_CONTRATO} THEN 0 ELSE v.amount::numeric END), 0) AS manuais
    FROM revenues v`);
  console.log("── PANORAMA (tabela de receitas inteira) ──");
  console.log(`   lançamentos: ${tot.linhas}   |   soma: ${brl(tot.soma)}`);
  console.log(`   de contrato: ${brl(tot.de_contrato)}   |   manuais (receita extra): ${brl(tot.manuais)}\n`);

  // ── A) LIXO: ajuste de contrato que nunca foi pago ─────────────────────────
  const lixo = await q(`
    SELECT v.id, v.date, v.description, v.amount,
           COALESCE(v.meta->>'contractId', substring(v.description from 'Contrato #([0-9]+)')) AS contrato
    FROM revenues v
    WHERE v.description LIKE 'Ajuste do Contrato #%'
      AND NOT EXISTS (
        SELECT 1 FROM rentals r
        WHERE r."contractId"::text = COALESCE(v.meta->>'contractId', substring(v.description from 'Contrato #([0-9]+)'))
          AND r."deletedAt" IS NULL
          AND r."paymentStatus" = 'paid'
      )
    ORDER BY v.date`);
  const somaLixo = lixo.reduce((s, l) => s + Number(l.amount), 0);
  console.log("── A) LIXO: ajuste de contrato que NUNCA foi pago ──");
  if (lixo.length === 0) {
    console.log("   nenhum. Nada a limpar antes da troca de régua.\n");
  } else {
    console.table(lixo.map((l) => ({
      lançamento: l.id, data: dia(l.date), contrato: l.contrato ?? "?",
      valor: brl(l.amount), descrição: l.description,
    })));
    console.log(`   ⚠️ ${lixo.length} linha(s), ${brl(somaLixo)} de dinheiro que NUNCA entrou.`);
    console.log(`   Hoje aparece na lista e no CSV do contador, mas não soma nos cards.`);
    console.log(`   Depois da troca de régua passaria a somar ⇒ limpar ANTES.\n`);
  }

  // ── B) BURACO: aluguel pago sem lançamento correspondente ──────────────────
  const buraco = await q(`
    SELECT r.id, r."contractId" AS contrato, r."startDate", r."totalAmount"
    FROM rentals r
    WHERE r."paymentStatus" = 'paid'
      AND r."deletedAt" IS NULL
      AND (
        r."contractId" IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM revenues v
          WHERE COALESCE(v.meta->>'contractId', substring(v.description from 'Contrato #([0-9]+)')) = r."contractId"::text
        )
      )
    ORDER BY r."startDate"`);
  const somaBuraco = buraco.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  console.log("── B) BURACO: aluguel PAGO que nunca virou lançamento ──");
  if (buraco.length === 0) {
    console.log("   nenhum. Todo aluguel pago tem lançamento ⇒ a troca de régua não derruba nenhum número.\n");
  } else {
    console.table(buraco.slice(0, 30).map((r) => ({
      aluguel: r.id, contrato: r.contrato ?? "(sem contrato)",
      início: dia(r.startDate), valor: brl(r.totalAmount),
    })));
    if (buraco.length > 30) console.log(`   ... e mais ${buraco.length - 30} linha(s).`);
    console.log(`   ⚠️ ${buraco.length} aluguel(éis), ${brl(somaBuraco)}.`);
    console.log(`   Esse valor conta HOJE no card "Receita de aluguéis" e SUMIRIA com a troca.`);
    console.log(`   Se for alto, decidir antes: gerar os lançamentos que faltam ou manter a régua atual.\n`);
  }

  // ── C) CATEGORIA dos pagamentos de contrato ────────────────────────────────
  const cats = await q(`SELECT id, name FROM revenue_categories ORDER BY id`);
  const [semCat] = await q(`
    SELECT COUNT(*)::int AS n FROM revenues v
    WHERE ${DE_CONTRATO}
      AND NOT EXISTS (SELECT 1 FROM revenue_categories c WHERE c.id = v."categoryId")`);
  console.log("── C) CATEGORIA (o código grava categoryId = 1 fixo ao registrar pagamento) ──");
  console.log(`   categorias de receita cadastradas: ${cats.length ? cats.map((c) => `${c.id}=${c.name}`).join(", ") : "NENHUMA"}`);
  if (semCat.n > 0) {
    console.log(`   ⚠️ ${semCat.n} lançamento(s) de contrato apontam para categoria INEXISTENTE.`);
    console.log(`   Efeito: "—" na tela, "Sem categoria" no CSV do contador e some do filtro por categoria.\n`);
  } else {
    console.log(`   todos os lançamentos de contrato têm categoria válida.\n`);
  }

  // ── Simulação: como os cards ficariam no mês corrente ──────────────────────
  const hoje = new Date();
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [regraHoje] = await q(`
    SELECT COALESCE(SUM(r."totalAmount"::numeric), 0) AS v
    FROM rentals r
    WHERE r."paymentStatus" = 'paid' AND r."deletedAt" IS NULL
      AND r."startDate" BETWEEN $1 AND $2`, [ini, fim]);
  const [regraNova] = await q(`
    SELECT COALESCE(SUM(CASE WHEN ${DE_CONTRATO} THEN v.amount::numeric ELSE 0 END), 0) AS aluguel,
           COALESCE(SUM(CASE WHEN ${DE_CONTRATO} THEN 0 ELSE v.amount::numeric END), 0) AS extra
    FROM revenues v WHERE v.date BETWEEN $1 AND $2`, [ini, fim]);
  console.log(`── SIMULAÇÃO do mês corrente (${ini} a ${fim}) ──`);
  console.log(`   régua de HOJE  → Receita de aluguéis: ${brl(regraHoje.v)}`);
  console.log(`   régua NOVA     → Receita de aluguéis: ${brl(regraNova.aluguel)}   |   Receitas extras: ${brl(regraNova.extra)}`);
  console.log(`   (a régua nova soma exatamente o que a lista de lançamentos mostra)\n`);
} finally {
  await close();
}
