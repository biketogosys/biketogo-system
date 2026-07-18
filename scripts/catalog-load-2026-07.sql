-- ═════════════════════════════════════════════════════════════════════════
-- BikeTogo — Carga do catálogo (Shopify products_export.csv, 2026-07-17)
-- Camada 1(d). Gerado por script; TESTADO em PGlite com as migrações reais.
-- Regras: tamanhos pelo TÍTULO do produto; 1 unidade por tamanho/variante
-- (default combinado — ajustar depois pela tela de Bicicletas/Acessórios);
-- capacete obrigatório; replacementValue em branco (preencher na UI).
-- IDEMPOTENTE: pode rodar mais de uma vez sem duplicar nada.
-- Aplicar no Supabase: SQL Editor → colar tudo → Run.
-- ═════════════════════════════════════════════════════════════════════════

-- ─── BIKES (13 modelos, 30 tamanhos, 30 unidades) ────────────────────────

-- MTB Basic — OGGI Hacker HDS (Oggi) — R$160.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-HACKER','MTB Basic — OGGI Hacker HDS','Oggi','mtb','160.00','Quadro alumínio 6061 T6. Suspensão Oggi 100mm com trava no ombro. Freio a disco hidráulico Shimano BR-MT200. Câmbio traseiro Shimano Essa 8v. Cassete 11-45. Rodas aro 29. ~14,5kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'S', '15,5" — cores grisalho/verde' FROM "bikes" b WHERE b."serialNumber"='BTG-HACKER'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='S');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'HACKER-S-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-HACKER' AND bs."tamanho"='S'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='HACKER-S-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M', '17" — cores grisalho/verde' FROM "bikes" b WHERE b."serialNumber"='BTG-HACKER'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'HACKER-M-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-HACKER' AND bs."tamanho"='M'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='HACKER-M-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'L', '19" — cores grisalho/verde' FROM "bikes" b WHERE b."serialNumber"='BTG-HACKER'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'HACKER-L-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-HACKER' AND bs."tamanho"='L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='HACKER-L-001');

-- MTB Sport — Caloi 13,5 (Caloi) — R$200.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-CALOI135','MTB Sport — Caloi 13,5','Caloi','mtb','200.00','Quadro Caloi de alumínio. Suspensão Rockshox Judy TK 100mm com trava no guidão. Freio Shimano MT200. Câmbio Shimano Deore 2x10v. Cassete 11-42. Rodas aro 29. ~15,5kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'XS', '13,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-CALOI135'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XS');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'CALOI-XS-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-CALOI135' AND bs."tamanho"='XS'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='CALOI-XS-001');

-- MTB Sport — Trek Marlin 5 (Trek) — R$200.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-MARLIN5','MTB Sport — Trek Marlin 5','Trek','mtb','200.00','Trek Marlin 5 3ª geração. Quadro Alumínio Alpha Silver. Garfo SR Suntour XCT 30 100mm. Freio a disco hidráulico Shimano MT200. Câmbio Shimano Cues 9v. Cassete 11-46. Rodas aro 29. ~15,2kg. Limite total 136kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'S', '15,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-MARLIN5'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='S');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'MARLIN5-S-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-MARLIN5' AND bs."tamanho"='S'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='MARLIN5-S-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M', '17,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-MARLIN5'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'MARLIN5-M-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-MARLIN5' AND bs."tamanho"='M'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='MARLIN5-M-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M/L', '18,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-MARLIN5'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M/L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'MARLIN5-ML-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-MARLIN5' AND bs."tamanho"='M/L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='MARLIN5-ML-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'L', '19,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-MARLIN5'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'MARLIN5-L-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-MARLIN5' AND bs."tamanho"='L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='MARLIN5-L-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'XL', '21,5"' FROM "bikes" b WHERE b."serialNumber"='BTG-MARLIN5'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XL');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'MARLIN5-XL-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-MARLIN5' AND bs."tamanho"='XL'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='MARLIN5-XL-001');

-- Road Basic — Specialized Dolce (Specialized) — R$190.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-DOLCE','Road Basic — Specialized Dolce','Specialized','speed','190.00','Quadro Specialized de alumínio. Garfo de alumínio. Câmbio Shimano Claris 2x8v. Cassete 11-32. Pneus Specialized 700x25. ~11kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '48' FROM "bikes" b WHERE b."serialNumber"='BTG-DOLCE'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='48');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOLCE-48-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOLCE' AND bs."tamanho"='48'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOLCE-48-001');

-- Road Basic — OGGI Stimolla (Oggi) — R$190.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-STIMOLLA','Road Basic — OGGI Stimolla','Oggi','speed','190.00','Quadro Oggi de alumínio. Garfo de carbono. Câmbio Shimano Claris 2x8v. Cassete 11-32. Pneus Kenda 700x25. ~9,6kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'XS' FROM "bikes" b WHERE b."serialNumber"='BTG-STIMOLLA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XS');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'STIMOLLA-XS-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-STIMOLLA' AND bs."tamanho"='XS'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='STIMOLLA-XS-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'S' FROM "bikes" b WHERE b."serialNumber"='BTG-STIMOLLA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='S');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'STIMOLLA-S-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-STIMOLLA' AND bs."tamanho"='S'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='STIMOLLA-S-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'M' FROM "bikes" b WHERE b."serialNumber"='BTG-STIMOLLA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'STIMOLLA-M-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-STIMOLLA' AND bs."tamanho"='M'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='STIMOLLA-M-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'L' FROM "bikes" b WHERE b."serialNumber"='BTG-STIMOLLA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'STIMOLLA-L-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-STIMOLLA' AND bs."tamanho"='L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='STIMOLLA-L-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'XL' FROM "bikes" b WHERE b."serialNumber"='BTG-STIMOLLA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XL');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'STIMOLLA-XL-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-STIMOLLA' AND bs."tamanho"='XL'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='STIMOLLA-XL-001');

-- Road Basic — Groove Overdrive (Groove) — R$190.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-OVERDRIVE','Road Basic — Groove Overdrive','Groove','speed','190.00','Quadro Groove de alumínio. Garfo de alumínio. Câmbio Shimano Claris 2x8v. Cassete 11-30. Pneus Specialized 700x23. ~10,8kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '51' FROM "bikes" b WHERE b."serialNumber"='BTG-OVERDRIVE'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='51');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'OVERDRIVE-51-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-OVERDRIVE' AND bs."tamanho"='51'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='OVERDRIVE-51-001');

-- Road Sport — Trek Domane AL 2 4ª geração (Trek) — R$220.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-DOMANE4G','Road Sport — Trek Domane AL 2 4ª geração','Trek','speed','220.00','Quadro Alumínio Alpha Série 100. Garfo Domane AL Carbon. Câmbio Shimano Claris R2000 2x8v. Cassete 11-32. Pneus Bontrager R1 700x32. ~10,5kg. Limite total 125kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M', '52' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE4G'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE4G-M-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE4G' AND bs."tamanho"='M'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE4G-M-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M/L', '54' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE4G'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M/L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE4G-ML-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE4G' AND bs."tamanho"='M/L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE4G-ML-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'L', '56' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE4G'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE4G-L-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE4G' AND bs."tamanho"='L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE4G-L-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'XL', '58' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE4G'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XL');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE4G-XL-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE4G' AND bs."tamanho"='XL'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE4G-XL-001');

-- Road Race — Trek Émonda ALR 5 (Trek) — R$400.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-EMONDA','Road Race — Trek Émonda ALR 5','Trek','speed','400.00','Quadro Alumínio Alpha Série 300 ultraleve. Garfo Émonda ALR full carbon. Grupo Shimano 105 R7100 2x12v. Cassete 11-34. Pneus Bontrager R1 700x28. ~9,1kg. Limite total 125kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'M/L', '54' FROM "bikes" b WHERE b."serialNumber"='BTG-EMONDA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='M/L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'EMONDA-ML-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-EMONDA' AND bs."tamanho"='M/L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='EMONDA-ML-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho","observacao")
SELECT b.id, 'L', '56' FROM "bikes" b WHERE b."serialNumber"='BTG-EMONDA'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='L');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'EMONDA-L-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-EMONDA' AND bs."tamanho"='L'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='EMONDA-L-001');

-- Gravel — OGGI Tribale (Oggi) — R$250.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-TRIBALE','Gravel — OGGI Tribale','Oggi','gravel','250.00','Quadro de alumínio Tribale gravel. Garfo carbono. Freio a disco hidráulico Shimano GRX. Câmbio Shimano GRX 12v. Cassete 10-51. Pneus Kenda 700x40C. Rodas Fulcrum Lite ER.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'XL' FROM "bikes" b WHERE b."serialNumber"='BTG-TRIBALE'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='XL');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'TRIBALE-XL-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-TRIBALE' AND bs."tamanho"='XL'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='TRIBALE-XL-001');

-- Gravel — Trek Checkpoint ALR 3 (Trek) — R$250.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-CHECKPOINT','Gravel — Trek Checkpoint ALR 3','Trek','gravel','250.00','Trek Checkpoint ALR 3 3ª geração. Quadro Alumínio Alpha Série 300. Garfo full carbon. Freio a disco mecânico Tektro C550. Câmbio Shimano Cues 10v. Cassete 11-48. Pneus Bontrager 700x42. ~10,4kg. Limite total 125kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, 'S' FROM "bikes" b WHERE b."serialNumber"='BTG-CHECKPOINT'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='S');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'CHECKPOINT-S-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-CHECKPOINT' AND bs."tamanho"='S'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='CHECKPOINT-S-001');

-- Road Basic — Sense Criterium Race (Sense) — R$190.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-CRITERIUM','Road Basic — Sense Criterium Race','Sense','speed','190.00','Quadro Sense de alumínio. Garfo de carbono. Câmbio Shimano Sora 2x9v. Cassete 11-32. Pneus Chaoyang 700x28. ~10,7kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '50' FROM "bikes" b WHERE b."serialNumber"='BTG-CRITERIUM'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='50');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'CRITERIUM-50-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-CRITERIUM' AND bs."tamanho"='50'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='CRITERIUM-50-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '53' FROM "bikes" b WHERE b."serialNumber"='BTG-CRITERIUM'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='53');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'CRITERIUM-53-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-CRITERIUM' AND bs."tamanho"='53'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='CRITERIUM-53-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '56' FROM "bikes" b WHERE b."serialNumber"='BTG-CRITERIUM'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='56');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'CRITERIUM-56-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-CRITERIUM' AND bs."tamanho"='56'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='CRITERIUM-56-001');

-- Road Basic — Trek Domane AL 2 2023 (Trek) — R$190.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-DOMANE23','Road Basic — Trek Domane AL 2 2023','Trek','speed','190.00','Trek Domane AL 2 2023. Quadro Trek de alumínio. Garfo de carbono. Câmbio Shimano Claris 2x8v. Cassete 11-32. Pneus Pirelli Tornado Alfa 700x25. ~10kg.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '56' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE23'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='56');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE23-56-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE23' AND bs."tamanho"='56'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE23-56-001');
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '58' FROM "bikes" b WHERE b."serialNumber"='BTG-DOMANE23'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='58');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DOMANE23-58-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DOMANE23' AND bs."tamanho"='58'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DOMANE23-58-001');

-- Gravel — Specialized Diverge Comp E5 (Specialized) — R$250.00/dia
INSERT INTO "bikes" ("serialNumber","model","brand","category","dailyRate","description")
VALUES ('BTG-DIVERGE','Gravel — Specialized Diverge Comp E5','Specialized','gravel','250.00','Specialized Diverge Comp E5.')
ON CONFLICT ("serialNumber") DO NOTHING;
INSERT INTO "bike_sizes" ("bikeId","tamanho")
SELECT b.id, '49' FROM "bikes" b WHERE b."serialNumber"='BTG-DIVERGE'
  AND NOT EXISTS (SELECT 1 FROM "bike_sizes" x WHERE x."bikeId"=b.id AND x."tamanho"='49');
INSERT INTO "bike_units" ("bikeSizeId","numeroSistema")
SELECT bs.id, 'DIVERGE-49-001' FROM "bike_sizes" bs JOIN "bikes" b ON bs."bikeId"=b.id
WHERE b."serialNumber"='BTG-DIVERGE' AND bs."tamanho"='49'
  AND NOT EXISTS (SELECT 1 FROM "bike_units" u WHERE u."numeroSistema"='DIVERGE-49-001');

-- ─── ACESSÓRIOS (20 itens, 25 unidades) ─────────────────────────────

-- Capacete Dvorak Protone [Capacete] — OBRIGATÓRIO
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Capacete Dvorak Protone','Capacete',3,3,3,true,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Capacete Dvorak Protone');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'CAPD-001', 'cinza' FROM "accessories" acc WHERE acc."name"='Capacete Dvorak Protone'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CAPD-001');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'CAPD-002', 'vermelho' FROM "accessories" acc WHERE acc."name"='Capacete Dvorak Protone'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CAPD-002');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'CAPD-003', 'rosa' FROM "accessories" acc WHERE acc."name"='Capacete Dvorak Protone'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CAPD-003');

-- Cadeado Btwin espiral c/ 2 chaves [Cadeado]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Cadeado Btwin espiral c/ 2 chaves','Cadeado',2,2,2,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Cadeado Btwin espiral c/ 2 chaves');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'CADB-001', '150 cm' FROM "accessories" acc WHERE acc."name"='Cadeado Btwin espiral c/ 2 chaves'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CADB-001');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'CADB-002', '180 cm' FROM "accessories" acc WHERE acc."name"='Cadeado Btwin espiral c/ 2 chaves'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CADB-002');

-- Farol Dianteiro Rontek Eagle 600 Lumens [Farol]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Farol Dianteiro Rontek Eagle 600 Lumens','Farol',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Farol Dianteiro Rontek Eagle 600 Lumens');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'FDRO-001' FROM "accessories" acc WHERE acc."name"='Farol Dianteiro Rontek Eagle 600 Lumens'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='FDRO-001');

-- Farol Dianteiro Genérico (High One) [Farol]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Farol Dianteiro Genérico (High One)','Farol',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Farol Dianteiro Genérico (High One)');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'FDHO-001' FROM "accessories" acc WHERE acc."name"='Farol Dianteiro Genérico (High One)'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='FDHO-001');

-- Farol Traseiro Braswei [Farol]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Farol Traseiro Braswei','Farol',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Farol Traseiro Braswei');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'FTBR-001' FROM "accessories" acc WHERE acc."name"='Farol Traseiro Braswei'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='FTBR-001');

-- Farol Traseiro Giyo GL09 [Farol]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Farol Traseiro Giyo GL09','Farol',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Farol Traseiro Giyo GL09');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'FTGI-001' FROM "accessories" acc WHERE acc."name"='Farol Traseiro Giyo GL09'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='FTGI-001');

-- Bomba de Ar Sentec 120PSI [Bomba de ar]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Bomba de Ar Sentec 120PSI','Bomba de ar',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Bomba de Ar Sentec 120PSI');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'BASE-001' FROM "accessories" acc WHERE acc."name"='Bomba de Ar Sentec 120PSI'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='BASE-001');

-- Bomba de Ar HighOne 120PSI [Bomba de ar]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Bomba de Ar HighOne 120PSI','Bomba de ar',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Bomba de Ar HighOne 120PSI');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'BAHO-001' FROM "accessories" acc WHERE acc."name"='Bomba de Ar HighOne 120PSI'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='BAHO-001');

-- Bolsa de Selim Rockrider Easy [Bolsa]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Bolsa de Selim Rockrider Easy','Bolsa',2,2,2,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Bolsa de Selim Rockrider Easy');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'BSRO-001', '0,6 L' FROM "accessories" acc WHERE acc."name"='Bolsa de Selim Rockrider Easy'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='BSRO-001');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'BSRO-002', '1 L' FROM "accessories" acc WHERE acc."name"='Bolsa de Selim Rockrider Easy'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='BSRO-002');

-- Canivete Ferramentas Absolute 12 Funções [Ferramenta]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Canivete Ferramentas Absolute 12 Funções','Ferramenta',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Canivete Ferramentas Absolute 12 Funções');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'CF12-001' FROM "accessories" acc WHERE acc."name"='Canivete Ferramentas Absolute 12 Funções'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CF12-001');

-- Canivete Ferramentas Absolute Slim 8 Funções [Ferramenta]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Canivete Ferramentas Absolute Slim 8 Funções','Ferramenta',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Canivete Ferramentas Absolute Slim 8 Funções');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'CF08-001' FROM "accessories" acc WHERE acc."name"='Canivete Ferramentas Absolute Slim 8 Funções'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='CF08-001');

-- Espátula ParkTool TL-1.2 [Ferramenta]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Espátula ParkTool TL-1.2','Ferramenta',2,2,2,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Espátula ParkTool TL-1.2');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'EP12-001', 'Duo' FROM "accessories" acc WHERE acc."name"='Espátula ParkTool TL-1.2'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='EP12-001');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'EP12-002', 'Trio' FROM "accessories" acc WHERE acc."name"='Espátula ParkTool TL-1.2'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='EP12-002');

-- Espátula ParkTool TL-4.2 [Ferramenta]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Espátula ParkTool TL-4.2','Ferramenta',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Espátula ParkTool TL-4.2');
INSERT INTO "accessory_units" ("accessoryId","serialNumber","variante")
SELECT acc.id, 'EP42-001', 'Duo' FROM "accessories" acc WHERE acc."name"='Espátula ParkTool TL-4.2'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='EP42-001');

-- Suporte de Celular Genérico c/ Base Ciclocomputador [Suporte de celular]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Suporte de Celular Genérico c/ Base Ciclocomputador','Suporte de celular',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Suporte de Celular Genérico c/ Base Ciclocomputador');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'SCEL-001' FROM "accessories" acc WHERE acc."name"='Suporte de Celular Genérico c/ Base Ciclocomputador'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='SCEL-001');

-- Pedal Clip MTB GTA RXM520 [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip MTB GTA RXM520','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip MTB GTA RXM520');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCG1-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip MTB GTA RXM520'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCG1-001');

-- Pedal Clip MTB Shimano PD-M505 SPD [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip MTB Shimano PD-M505 SPD','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip MTB Shimano PD-M505 SPD');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCS1-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip MTB Shimano PD-M505 SPD'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCS1-001');

-- Pedal Clip Road Shimano SPD-SL PD-RS500 [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip Road Shimano SPD-SL PD-RS500','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip Road Shimano SPD-SL PD-RS500');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCS2-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip Road Shimano SPD-SL PD-RS500'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCS2-001');

-- Pedal Clip Road GTA RX RS500 SPD [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip Road GTA RX RS500 SPD','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip Road GTA RX RS500 SPD');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCG2-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip Road GTA RX RS500 SPD'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCG2-001');

-- Pedal Clip Road Look Keo Classic 3 [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip Road Look Keo Classic 3','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip Road Look Keo Classic 3');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCL1-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip Road Look Keo Classic 3'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCL1-001');

-- Pedal Clip Road Look Keo Max 2 [Pedal clip]
INSERT INTO "accessories" ("name","category","quantity","quantidadeTotal","quantidadeDisponivel","obrigatorio","dailyRate")
SELECT 'Pedal Clip Road Look Keo Max 2','Pedal clip',1,1,1,false,'0.00'
WHERE NOT EXISTS (SELECT 1 FROM "accessories" x WHERE x."name"='Pedal Clip Road Look Keo Max 2');
INSERT INTO "accessory_units" ("accessoryId","serialNumber")
SELECT acc.id, 'PCL2-001' FROM "accessories" acc WHERE acc."name"='Pedal Clip Road Look Keo Max 2'
  AND NOT EXISTS (SELECT 1 FROM "accessory_units" u WHERE u."accessoryId"=acc.id AND u."serialNumber"='PCL2-001');
