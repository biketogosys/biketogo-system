-- ============================================================
-- Row Level Security (RLS) Policies — BikeToGo System
-- Supabase PostgreSQL
-- ============================================================
-- NOTA: O backend Node.js utiliza a service_role key do Supabase,
-- que bypassa RLS automaticamente. Estas policies protegem o
-- acesso direto via client SDK (anon key) e via Supabase Dashboard.
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ─── clients: somente admin acessa ─────────────────────────────────────
CREATE POLICY "admin_all_clients" ON clients FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── client_documents: admin e o próprio cliente ───────────────────────
CREATE POLICY "admin_all_client_documents" ON client_documents FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "client_own_documents" ON client_documents FOR SELECT USING (
  "clientId" = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
);

-- ─── rentals: admin vê tudo, cliente vê apenas os próprios ─────────────
CREATE POLICY "admin_all_rentals" ON rentals FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "client_own_rentals" ON rentals FOR SELECT USING (
  "clientId" = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
);

-- ─── system_settings: somente admin ────────────────────────────────────
CREATE POLICY "admin_all_settings" ON system_settings FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── admin_users: somente admin ────────────────────────────────────────
CREATE POLICY "admin_all_admin_users" ON admin_users FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── bikes: admin gerencia, leitura pública ────────────────────────────
CREATE POLICY "admin_all_bikes" ON bikes FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "public_read_bikes" ON bikes FOR SELECT USING (true);

-- ─── bike_discount_rules: admin gerencia, leitura pública ──────────────
CREATE POLICY "admin_all_bike_discount_rules" ON bike_discount_rules FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "public_read_bike_discount_rules" ON bike_discount_rules FOR SELECT USING (true);

-- ─── accessories: admin gerencia, leitura pública ──────────────────────
CREATE POLICY "admin_all_accessories" ON accessories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "public_read_accessories" ON accessories FOR SELECT USING (true);

-- ─── rental_accessories: somente admin ─────────────────────────────────
CREATE POLICY "admin_all_rental_accessories" ON rental_accessories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── expenses: somente admin ──────────────────────────────────────────
CREATE POLICY "admin_all_expenses" ON expenses FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── expense_categories: somente admin ────────────────────────────────
CREATE POLICY "admin_all_expense_categories" ON expense_categories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── revenues: somente admin ──────────────────────────────────────────
CREATE POLICY "admin_all_revenues" ON revenues FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── revenue_categories: somente admin ────────────────────────────────
CREATE POLICY "admin_all_revenue_categories" ON revenue_categories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── contracts: somente admin ────────────────────────────────────────
CREATE POLICY "admin_all_contracts" ON contracts FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── contract_accessories: somente admin ──────────────────────────────
CREATE POLICY "admin_all_contract_accessories" ON contract_accessories FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);

-- ─── users: admin vê tudo, user vê apenas o próprio ───────────────────
CREATE POLICY "admin_all_users" ON users FOR ALL USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'admin'
);
CREATE POLICY "user_own_record" ON users FOR SELECT USING (
  "openId" = current_setting('request.jwt.claims', true)::json->>'sub'
);
