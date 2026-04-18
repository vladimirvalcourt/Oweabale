-- ============================================================
-- OWEBALE — CANONICAL SCHEMA v1
-- Source of truth. Applied via Supabase MCP migration.
-- ============================================================

-- 1. PROFILES — linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  email       TEXT UNIQUE,
  avatar      TEXT,
  theme       TEXT DEFAULT 'Dark',
  tax_state   TEXT,
  tax_rate    DECIMAL(5,2),
  phone       TEXT,
  timezone    TEXT,
  language    TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned   BOOLEAN NOT NULL DEFAULT FALSE,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  credit_score INTEGER,
  credit_last_updated TIMESTAMPTZ,
  completed_lessons TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"       ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
CREATE POLICY "Users can delete their own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- 2. BILLS
CREATE TABLE IF NOT EXISTS bills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  biller     TEXT NOT NULL,
  amount     DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category   TEXT,
  due_date   DATE NOT NULL,
  frequency  TEXT,
  status     TEXT CHECK (status IN ('upcoming', 'paid', 'overdue')),
  auto_pay   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own bills" ON bills;
CREATE POLICY "Users can manage their own bills" ON bills FOR ALL USING (auth.uid() = user_id);

-- 3. DEBTS
CREATE TABLE IF NOT EXISTS debts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  type              TEXT,
  apr               DECIMAL(5,2),
  remaining         DECIMAL(12,2) NOT NULL CHECK (remaining >= 0),
  min_payment       DECIMAL(12,2) CHECK (min_payment >= 0),
  paid              DECIMAL(12,2) DEFAULT 0,
  original_amount   DECIMAL(12,2),
  origination_date  DATE,
  term_months       INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own debts" ON debts;
CREATE POLICY "Users can manage their own debts" ON debts FOR ALL USING (auth.uid() = user_id);

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT,
  date       DATE NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  type       TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users manage own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. ASSETS
CREATE TABLE IF NOT EXISTS assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  value             DECIMAL(12,2) NOT NULL CHECK (value > 0),
  type              TEXT,
  appreciation_rate DECIMAL(8,4),
  purchase_price    DECIMAL(12,2),
  purchase_date     DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own assets" ON assets;
CREATE POLICY "Users can manage their own assets" ON assets FOR ALL USING (auth.uid() = user_id);

-- 6. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  frequency         TEXT,
  next_billing_date DATE,
  status            TEXT CHECK (status IN ('active', 'paused', 'cancelled')),
  price_history     JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON subscriptions;
CREATE POLICY "Users can manage their own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- 7. GOALS
CREATE TABLE IF NOT EXISTS goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  target_amount  DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline       DATE,
  type           TEXT CHECK (type IN ('debt', 'savings', 'emergency')),
  color          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- 8. INCOMES
CREATE TABLE IF NOT EXISTS incomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  frequency       TEXT,
  category        TEXT,
  next_date       DATE,
  status          TEXT CHECK (status IN ('active', 'paused')),
  is_tax_withheld BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own incomes" ON incomes;
CREATE POLICY "Users can manage their own incomes" ON incomes FOR ALL USING (auth.uid() = user_id);

-- 9. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category   TEXT NOT NULL,
  amount     DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  period     TEXT CHECK (period IN ('Monthly', 'Yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- 10. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT,
  type       TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- 11. CITATIONS
CREATE TABLE IF NOT EXISTS citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL,
  jurisdiction    TEXT,
  days_left       INT,
  amount          DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  penalty_fee     DECIMAL(12,2) CHECK (penalty_fee >= 0),
  date            DATE,
  citation_number TEXT,
  payment_url     TEXT,
  status          TEXT CHECK (status IN ('open', 'resolved')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own citations" ON citations;
CREATE POLICY "Users can manage their own citations" ON citations FOR ALL USING (auth.uid() = user_id);

-- 12. DEDUCTIONS
CREATE TABLE IF NOT EXISTS deductions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT,
  amount     DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date       DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own deductions" ON deductions;
CREATE POLICY "Users can manage their own deductions" ON deductions FOR ALL USING (auth.uid() = user_id);

-- 13. FREELANCE ENTRIES
CREATE TABLE IF NOT EXISTS freelance_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client             TEXT NOT NULL,
  amount             DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date               DATE NOT NULL,
  is_vaulted         BOOLEAN DEFAULT FALSE,
  scoured_write_offs DECIMAL(12,2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE freelance_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own freelance_entries" ON freelance_entries;
CREATE POLICY "Users can manage their own freelance_entries" ON freelance_entries FOR ALL USING (auth.uid() = user_id);

-- 14. PENDING INGESTIONS
CREATE TABLE IF NOT EXISTS pending_ingestions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type           TEXT NOT NULL,
  status         TEXT DEFAULT 'scanning',
  source         TEXT DEFAULT 'desktop',
  extracted_data JSONB DEFAULT '{}'::jsonb,
  original_file  JSONB DEFAULT '{}'::jsonb,
  storage_path   TEXT,
  storage_url    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pending_ingestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON pending_ingestions;
CREATE POLICY "Users can manage their own pending_ingestions" ON pending_ingestions FOR ALL USING (auth.uid() = user_id);

-- 15. CATEGORIZATION RULES
CREATE TABLE IF NOT EXISTS categorization_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_type  TEXT NOT NULL CHECK (match_type IN ('exact', 'contains', 'regex')),
  match_value TEXT NOT NULL,
  category    TEXT NOT NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own categorization_rules" ON categorization_rules;
CREATE POLICY "Users can manage their own categorization_rules" ON categorization_rules FOR ALL USING (auth.uid() = user_id);

-- 16. CREDIT FIXES
CREATE TABLE IF NOT EXISTS credit_fixes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item       TEXT NOT NULL,
  amount     DECIMAL(12,2) DEFAULT 0,
  status     TEXT DEFAULT 'todo',
  bureau     TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_fixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own credit_fixes" ON credit_fixes;
CREATE POLICY "Users can manage their own credit_fixes" ON credit_fixes FOR ALL USING (auth.uid() = user_id);

-- 17. NET WORTH SNAPSHOTS
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date      DATE NOT NULL,
  net_worth DECIMAL(12,2) NOT NULL,
  assets    DECIMAL(12,2) NOT NULL,
  debts     DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own net_worth_snapshots" ON net_worth_snapshots;
CREATE POLICY "Users can manage their own net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);

-- 18. USER FEEDBACK
CREATE TABLE IF NOT EXISTS user_feedback (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       TEXT NOT NULL,
  rating     INTEGER CHECK (rating >= 1 AND rating <= 5),
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit feedback" ON user_feedback;
CREATE POLICY "Users can submit feedback" ON user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own feedback" ON user_feedback;
CREATE POLICY "Users can view own feedback" ON user_feedback FOR SELECT USING (auth.uid() = user_id);

-- 19. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_number  TEXT NOT NULL,
  subject        TEXT NOT NULL,
  description    TEXT NOT NULL,
  department     TEXT NOT NULL DEFAULT 'General Support',
  priority       TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Urgent')),
  status         TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate human-readable ticket number (e.g. TKT-12345)
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ticket_number ON support_tickets;
CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tickets" ON support_tickets;
CREATE POLICY "Users manage own tickets" ON support_tickets FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all tickets" ON support_tickets;
CREATE POLICY "Admins view all tickets" ON support_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- 20. ADMIN BROADCASTS
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read broadcasts" ON admin_broadcasts;
CREATE POLICY "Authenticated users read broadcasts" ON admin_broadcasts FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Admins manage broadcasts" ON admin_broadcasts;
CREATE POLICY "Admins manage broadcasts" ON admin_broadcasts FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- 21. PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode      BOOLEAN NOT NULL DEFAULT FALSE,
  plaid_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  broadcast_message     TEXT NOT NULL DEFAULT '',
  tax_standard_deduction DECIMAL(12,2) NOT NULL DEFAULT 13850,
  tax_top_bracket       DECIMAL(5,2) NOT NULL DEFAULT 37,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single settings row
INSERT INTO platform_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users read platform_settings" ON platform_settings;
CREATE POLICY "Authenticated users read platform_settings" ON platform_settings FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "Admins manage platform_settings" ON platform_settings;
CREATE POLICY "Admins manage platform_settings" ON platform_settings FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- 22. CREDIT FACTORS
CREATE TABLE IF NOT EXISTS credit_factors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  impact      TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  status      TEXT NOT NULL CHECK (status IN ('excellent', 'good', 'fair', 'poor')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own factors" ON credit_factors;
CREATE POLICY "Users view own factors" ON credit_factors FOR SELECT USING (auth.uid() = user_id);

-- 23. DOCUMENT CAPTURE SESSIONS (Mobile Sync)
CREATE TABLE IF NOT EXISTS document_capture_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status            TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'completed', 'error')),
  uploaded_file_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capture_sessions_token ON document_capture_sessions (id, token);
ALTER TABLE document_capture_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON document_capture_sessions;
CREATE POLICY "Users manage own sessions" ON document_capture_sessions FOR ALL USING (auth.uid() = user_id);
-- Anonymous mobile client can read/update session via token (simplified for web usage)
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON document_capture_sessions;
CREATE POLICY "Mobile tokens can access sessions" ON document_capture_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- 24. AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id  TEXT,
  action     TEXT NOT NULL,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view audit log" ON audit_log;
CREATE POLICY "Admins view audit log" ON audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit to Critical Tables
DROP TRIGGER IF EXISTS trg_audit_bills ON bills;
CREATE TRIGGER trg_audit_bills AFTER INSERT OR UPDATE OR DELETE ON bills FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_debts ON debts;
CREATE TRIGGER trg_audit_debts AFTER INSERT OR UPDATE OR DELETE ON debts FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_assets ON assets;
CREATE TRIGGER trg_audit_assets AFTER INSERT OR UPDATE OR DELETE ON assets FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ============================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGERS (Idempotent)
-- ============================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_debts_updated_at ON debts;
CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incomes_updated_at ON incomes;
CREATE TRIGGER update_incomes_updated_at
  BEFORE UPDATE ON incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_citations_updated_at ON citations;
CREATE TRIGGER update_citations_updated_at
  BEFORE UPDATE ON citations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_freelance_entries_updated_at ON freelance_entries;
CREATE TRIGGER update_freelance_entries_updated_at
  BEFORE UPDATE ON freelance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_fixes_updated_at ON credit_fixes;
CREATE TRIGGER update_credit_fixes_updated_at
  BEFORE UPDATE ON credit_fixes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_capture_sessions_updated_at ON document_capture_sessions;
CREATE TRIGGER update_document_capture_sessions_updated_at
  BEFORE UPDATE ON document_capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
