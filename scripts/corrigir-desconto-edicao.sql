-- ─── Desconto manual que não chegou à bike (2026-11-25) ──────────────────────
--
-- Até o commit desta data, editar um contrato JÁ ASSINADO (ativo ou
-- parcialmente devolvido) gravava o total novo de cada bike, mas não o
-- percentual de desconto dela. O valor ficava certo; o PDF, a página do cliente
-- e o e-mail leem o percentual da bike e não diziam que havia desconto. Caso
-- real: diária de R$ 220,00, desconto manual de ~9%, total de R$ 200,00, e o
-- contrato sem nenhuma menção ao desconto.
--
-- Regra, a mesma do sistema: o desconto MANUAL do contrato substitui o desconto
-- por dias em TODAS as bikes dele. Então, em contrato com desconto manual, toda
-- bike tem de carregar esse mesmo percentual.
--
-- Rodar no SQL Editor do Supabase DEPOIS do deploy do commit que corrige a
-- edição (senão uma edição entre os dois deixa outra bike sem o percentual).
-- É idempotente: rodar duas vezes não muda nada na segunda.
--
-- Não regera PDF: o arquivo de cada contrato corrigido só muda depois de
-- "Gerar PDF" na tela do contrato.
--
-- 1) CONFERIR ANTES (só leitura). Lista o que vai mudar.
--
--    SELECT c.id AS contrato, r.id AS aluguel,
--           c."descontoPercent" AS desconto_do_contrato,
--           r."discountPercent" AS desconto_na_bike,
--           r."dailyRate" AS diaria, r."totalAmount" AS total
--    FROM rentals r
--    JOIN contracts c ON c.id = r."contractId"
--    WHERE c."descontoPercent" IS NOT NULL
--      AND c."deletedAt" IS NULL
--      AND r."deletedAt" IS NULL
--      AND r."discountPercent" IS DISTINCT FROM c."descontoPercent"
--    ORDER BY c.id, r.id;
--
-- 2) CORRIGIR: rodar o bloco abaixo inteiro.

BEGIN;

UPDATE rentals r
SET "discountPercent" = c."descontoPercent",
    "updatedAt" = now()
FROM contracts c
WHERE c.id = r."contractId"
  AND c."descontoPercent" IS NOT NULL
  AND c."deletedAt" IS NULL
  AND r."deletedAt" IS NULL
  AND r."discountPercent" IS DISTINCT FROM c."descontoPercent";

COMMIT;
