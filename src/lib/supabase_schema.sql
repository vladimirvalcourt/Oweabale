-- ============================================================
-- OWEBALE — CANONICAL SCHEMA v1
-- Source of truth. Applied via Supabase MCP migration.
-- ============================================================

-- 1. PROFILES — linked to Supabase Auth users
CREATE TABLE profiles (
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
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. BILLS
CREATE TABLE bills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  biller     TEXT NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  category   TEXT,
  due_date   DATE NOT NULL,
  frequency  TEXT,
  status     TEXT CHECK (status IN ('upcoming', 'paid', 'overdue')),
  auto_pay   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bills" ON bills FOR ALL USING (auth.uid() = user_id);

-- 3. DEBTS
CREATE TABLE debts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  type              TEXT,
  apr               DECIMAL(5,2),
  remaining         DECIMAL(12,2) NOT NULL,
  min_payment       DECIMAL(12,2),
  paid              DECIMAL(12,2) DEFAULT 0,
  original_amount   DECIMAL(12,2),
  origination_date  DATE,
  term_months       INTEGER,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own debts" ON debts FOR ALL USING (auth.uid() = user_id);

-- 4. TRANSACTIONS
CREATE TABLE transactions (
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
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 5. ASSETS
CREATE TABLE assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  value             DECIMAL(12,2) NOT NULL,
  type              TEXT,
  appreciation_rate DECIMAL(8,4),
  purchase_price    DECIMAL(12,2),
  purchase_date     DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own assets" ON assets FOR ALL USING (auth.uid() = user_id);

-- 6. SUBSCRIPTIONS
CREATE TABLE subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  amount            DECIMAL(12,2) NOT NULL,
  frequency         TEXT,
  next_billing_date DATE,
  status            TEXT CHECK (status IN ('active', 'paused', 'cancelled')),
  price_history     JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- 7. GOALS
CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL,
  target_amount  DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  deadline       DATE,
  type           TEXT CHECK (type IN ('debt', 'savings', 'emergency')),
  color          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- 8. INCOMES
CREATE TABLE incomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  frequency       TEXT,
  category        TEXT,
  next_date       DATE,
  status          TEXT CHECK (status IN ('active', 'paused')),
  is_tax_withheld BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own incomes" ON incomes FOR ALL USING (auth.uid() = user_id);

-- 9. BUDGETS
CREATE TABLE budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category   TEXT NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  period     TEXT CHECK (period IN ('Monthly', 'Yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- 10. CATEGORIES
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT,
  type       TEXT CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);

-- 11. CITATIONS
CREATE TABLE citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT NOT NULL,
  jurisdiction    TEXT,
  days_left       INT,
  amount          DECIMAL(12,2) NOT NULL,
  penalty_fee     DECIMAL(12,2),
  date            DATE,
  citation_number TEXT,
  payment_url     TEXT,
  status          TEXT CHECK (status IN ('open', 'resolved')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own citations" ON citations FOR ALL USING (auth.uid() = user_id);

-- 12. DEDUCTIONS
CREATE TABLE deductions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  category   TEXT,
  amount     DECIMAL(12,2) NOT NULL,
  date       DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deductions" ON deductions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS — auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at      BEFORE UPDATE ON profiles      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at         BEFORE UPDATE ON bills         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_debts_updated_at         BEFORE UPDATE ON debts         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at        BEFORE UPDATE ON assets        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at         BEFORE UPDATE ON goals         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incomes_updated_at       BEFORE UPDATE ON incomes       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at       BEFORE UPDATE ON budgets       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_citations_updated_at     BEFORE UPDATE ON citations     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
