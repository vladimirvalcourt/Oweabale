-- ============================================
-- OWEABLE BACKEND - COMPLETE SETUP
-- ============================================
-- Run this ONCE in Supabase SQL Editor
-- This creates all tables, indexes, RLS policies, and functions
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ============================================
-- TABLES
-- ============================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  email TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  theme TEXT DEFAULT 'dark',
  phone TEXT DEFAULT '',
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  notification_prefs JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
  plan TEXT DEFAULT 'free',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_expired BOOLEAN DEFAULT false,
  credit_score INTEGER,
  credit_last_updated TIMESTAMPTZ,
  plaid_linked_at TIMESTAMPTZ,
  plaid_institution_name TEXT,
  plaid_last_sync_at TIMESTAMPTZ,
  plaid_needs_relink BOOLEAN DEFAULT false,
  tax_state TEXT DEFAULT 'CA',
  tax_rate NUMERIC DEFAULT 0.25,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BILLS
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biller TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'utilities',
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'pending',
  auto_pay BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEBTS
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit_card',
  apr NUMERIC DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  min_payment NUMERIC DEFAULT 0,
  paid NUMERIC DEFAULT 0,
  payment_due_date DATE,
  original_amount NUMERIC DEFAULT 0,
  origination_date DATE,
  term_months INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  platform_tag TEXT,
  notes TEXT,
  plaid_account_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ASSETS
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'checking',
  appreciation_rate NUMERIC DEFAULT 0,
  purchase_price NUMERIC,
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INCOMES
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  category TEXT DEFAULT 'salary',
  next_date DATE,
  status TEXT DEFAULT 'active',
  is_tax_withheld BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_billing_date DATE,
  status TEXT DEFAULT 'active',
  price_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. GOALS
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'active',
  type TEXT DEFAULT 'savings',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  rollover_enabled BOOLEAN DEFAULT false,
  lock_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  color TEXT DEFAULT '#6b7280',
  icon TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PLAID_ACCOUNTS
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  official_name TEXT,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  mask TEXT,
  subtype_suggested_savings BOOLEAN DEFAULT false,
  include_in_savings BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plaid_account_id)
);

-- 12. CITATIONS
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  jurisdiction TEXT,
  days_left INTEGER,
  amount NUMERIC DEFAULT 0,
  penalty_fee NUMERIC DEFAULT 0,
  date DATE,
  citation_number TEXT,
  payment_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DEDUCTIONS
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'business',
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. FREELANCE_ENTRIES
CREATE TABLE IF NOT EXISTS freelance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  is_vaulted BOOLEAN DEFAULT false,
  scoured_write_offs NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. MILEAGE_LOG
CREATE TABLE IF NOT EXISTS mileage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_date DATE NOT NULL,
  start_location TEXT,
  end_location TEXT,
  miles NUMERIC NOT NULL,
  purpose TEXT,
  platform TEXT,
  irs_rate_per_mile NUMERIC DEFAULT 0.67,
  deduction_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. CLIENT_INVOICES
CREATE TABLE IF NOT EXISTS client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  issued_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. CREDIT_FIXES
CREATE TABLE IF NOT EXISTS credit_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ADMIN_BROADCASTS
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. PLATFORM_SETTINGS
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);



-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_frequency ON bills(frequency);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_type ON debts(type);
CREATE INDEX IF NOT EXISTS idx_debts_payment_due_date ON debts(payment_due_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_account_id ON transactions(plaid_account_id);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_frequency ON incomes(frequency);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_plaid_account_id ON plaid_accounts(plaid_account_id);

CREATE INDEX IF NOT EXISTS idx_citations_user_id ON citations(user_id);
CREATE INDEX IF NOT EXISTS idx_citations_date ON citations(date);
CREATE INDEX IF NOT EXISTS idx_citations_status ON citations(status);

CREATE INDEX IF NOT EXISTS idx_deductions_user_id ON deductions(user_id);
CREATE INDEX IF NOT EXISTS idx_deductions_date ON deductions(date);

CREATE INDEX IF NOT EXISTS idx_freelance_entries_user_id ON freelance_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_freelance_entries_date ON freelance_entries(date);

CREATE INDEX IF NOT EXISTS idx_mileage_log_user_id ON mileage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_log_trip_date ON mileage_log(trip_date);

CREATE INDEX IF NOT EXISTS idx_client_invoices_user_id ON client_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_due_date ON client_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_client_invoices_status ON client_invoices(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users manage own bills" ON bills;
DROP POLICY IF EXISTS "Users manage own debts" ON debts;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
DROP POLICY IF EXISTS "Users manage own assets" ON assets;
DROP POLICY IF EXISTS "Users manage own incomes" ON incomes;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users manage own goals" ON goals;
DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
DROP POLICY IF EXISTS "Users manage own plaid accounts" ON plaid_accounts;
DROP POLICY IF EXISTS "Users manage own citations" ON citations;
DROP POLICY IF EXISTS "Users manage own deductions" ON deductions;
DROP POLICY IF EXISTS "Users manage own freelance entries" ON freelance_entries;
DROP POLICY IF EXISTS "Users manage own mileage log" ON mileage_log;
DROP POLICY IF EXISTS "Users manage own client invoices" ON client_invoices;
DROP POLICY IF EXISTS "Users manage own credit fixes" ON credit_fixes;
DROP POLICY IF EXISTS "Users can view admin broadcasts" ON admin_broadcasts;
DROP POLICY IF EXISTS "Anyone can view platform settings" ON platform_settings;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Bills policies
CREATE POLICY "Users manage own bills" ON bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Debts policies
CREATE POLICY "Users manage own debts" ON debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assets policies
CREATE POLICY "Users manage own assets" ON assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Incomes policies
CREATE POLICY "Users manage own incomes" ON incomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Plaid accounts policies
CREATE POLICY "Users manage own plaid accounts" ON plaid_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Citations policies
CREATE POLICY "Users manage own citations" ON citations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deductions policies
CREATE POLICY "Users manage own deductions" ON deductions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Freelance entries policies
CREATE POLICY "Users manage own freelance entries" ON freelance_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mileage log policies
CREATE POLICY "Users manage own mileage log" ON mileage_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Client invoices policies
CREATE POLICY "Users manage own client invoices" ON client_invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Credit fixes policies
CREATE POLICY "Users manage own credit fixes" ON credit_fixes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin broadcasts policy (read-only for everyone)
CREATE POLICY "Users can view admin broadcasts" ON admin_broadcasts FOR SELECT USING (true);

-- Platform settings policy (read-only for everyone)
CREATE POLICY "Anyone can view platform settings" ON platform_settings FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email,
    avatar,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
DO $$
DECLARE
  table_name TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'bills', 'debts', 'transactions', 'assets',
    'incomes', 'subscriptions', 'goals', 'budgets', 'categories',
    'plaid_accounts', 'citations', 'deductions', 'freelance_entries',
    'mileage_log', 'client_invoices', 'credit_fixes'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', table_name, table_name);
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Database setup complete!' as status;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';
