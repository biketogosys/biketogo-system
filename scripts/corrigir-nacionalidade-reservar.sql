-- ─── Correção dos cadastros do /reservar sem nacionalidade (2026-10-20) ─────
--
-- Até o commit desta data, o /reservar não gravava a nacionalidade e guardava
-- o PASSAPORTE na coluna `rg`. Em produção (consulta de 20/10/2026): 50
-- cadastros com source = 'site' e nacionalidade NULL, 8 deles sem CPF e com
-- o campo `rg` preenchido, que são os estrangeiros.
--
-- Regra, a mesma do formulário (que exige CPF de brasileiro e passaporte de
-- estrangeiro):
--   sem CPF e com `rg`  → estrangeiro, e o `rg` é o passaporte: vai para
--                          `numero_passaporte` e o `rg` fica vazio;
--   com CPF             → brasileiro.
-- Cadastro sem CPF e sem `rg` não é tocado (não há como saber).
--
-- Rodar no SQL Editor do Supabase DEPOIS do deploy do commit que corrige o
-- /reservar (senão um cadastro novo entre os dois nasce errado de novo).
-- É idempotente: rodar duas vezes não muda nada na segunda.
--
-- 1) CONFERIR ANTES (só leitura). Esperado: 8 em "vira_estrangeiro".
--
--    SELECT
--      count(*) FILTER (WHERE coalesce(trim(cpf), '') = '' AND coalesce(trim(rg), '') <> '') AS vira_estrangeiro,
--      count(*) FILTER (WHERE coalesce(trim(cpf), '') <> '') AS vira_brasileiro,
--      count(*) FILTER (WHERE coalesce(trim(cpf), '') = '' AND coalesce(trim(rg), '') = '') AS fica_sem
--    FROM clients
--    WHERE source = 'site' AND nacionalidade IS NULL;
--
-- 2) CORRIGIR: rodar o bloco abaixo inteiro.

BEGIN;

UPDATE clients
SET nacionalidade = 'estrangeiro',
    tipo_documento = 'passaporte',
    numero_passaporte = upper(trim(rg)),
    rg = NULL,
    "updatedAt" = now()
WHERE source = 'site'
  AND nacionalidade IS NULL
  AND coalesce(trim(cpf), '') = ''
  AND coalesce(trim(rg), '') <> ''
  AND numero_passaporte IS NULL;

UPDATE clients
SET nacionalidade = 'brasileiro',
    "updatedAt" = now()
WHERE source = 'site'
  AND nacionalidade IS NULL
  AND coalesce(trim(cpf), '') <> '';

COMMIT;

-- 3) CONFERIR DEPOIS. Esperado: nenhuma linha de 'site' com nacionalidade NULL
--    (a não ser os "fica_sem" do passo 1).
--
--    SELECT source, nacionalidade, count(*) FROM clients
--    WHERE "deletedAt" IS NULL GROUP BY source, nacionalidade ORDER BY 1, 2;
