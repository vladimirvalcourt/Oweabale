-- Create all core tables required by the application

-- bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biller TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  auto_pay BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bills" ON bills;
CREATE POLICY "Users manage own bills" ON bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'student_loan', 'mortgage', 'auto_loan', 'personal_loan', 'other')),
  apr NUMERIC NOT NULL CHECK (apr >= 0),
  remaining NUMERIC NOT NULL CHECK (remaining >= 0),
  min_payment NUMERIC NOT NULL CHECK (min_payment >= 0),
  paid NUMERIC NOT NULL DEFAULT 0 CHECK (paid >= 0),
  payment_due_date DATE,
  original_amount NUMERIC NOT NULL CHECK (original_amount >= 0),
  origination_date DATE,
  term_months INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own debts" ON debts;
CREATE POLICY "Users manage own debts" ON debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  platform_tag TEXT,
  notes TEXT,
  plaid_account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
CREATE POLICY "Users manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);

-- assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL CHECK (value >= 0),
  type TEXT NOT NULL CHECK (type IN ('cash', 'investment', 'real_estate', 'vehicle', 'crypto', 'other')),
  appreciation_rate NUMERIC DEFAULT 0,
  purchase_price NUMERIC,
  purchase_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own assets" ON assets;
CREATE POLICY "Users manage own assets" ON assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- incomes table
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  category TEXT NOT NULL,
  next_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_tax_withheld BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own incomes" ON incomes;
CREATE POLICY "Users manage own incomes" ON incomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_billing_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'paused')),
  price_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON subscriptions;
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  type TEXT NOT NULL DEFAULT 'savings' CHECK (type IN ('savings', 'debt_payoff', 'investment')),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON goals;
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  rollover_enabled BOOLEAN DEFAULT FALSE,
  lock_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plaid_accounts table
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  official_name TEXT,
  account_type TEXT,
  account_subtype TEXT,
  mask TEXT,
  subtype_suggested_savings BOOLEAN DEFAULT FALSE,
  include_in_savings BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, plaid_account_id)
);
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own plaid accounts" ON plaid_accounts;
CREATE POLICY "Users manage own plaid accounts" ON plaid_accounts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- citations table
CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  jurisdiction TEXT,
  days_left INTEGER,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  penalty_fee NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  citation_number TEXT,
  payment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'disputed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own citations" ON citations;
CREATE POLICY "Users manage own citations" ON citations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- deductions table
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own deductions" ON deductions;
CREATE POLICY "Users manage own deductions" ON deductions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- freelance_entries table
CREATE TABLE IF NOT EXISTS freelance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  is_vaulted BOOLEAN DEFAULT FALSE,
  scoured_write_offs NUMERIC NOT NULL DEFAULT 0 CHECK (scoured_write_offs >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE freelance_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own freelance entries" ON freelance_entries;
CREATE POLICY "Users manage own freelance entries" ON freelance_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- mileage_log table
CREATE TABLE IF NOT EXISTS mileage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_date DATE NOT NULL,
  start_location TEXT,
  end_location TEXT,
  miles NUMERIC NOT NULL CHECK (miles >= 0),
  purpose TEXT,
  platform TEXT,
  irs_rate_per_mile NUMERIC DEFAULT 0.67,
  deduction_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE mileage_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own mileage log" ON mileage_log;
CREATE POLICY "Users manage own mileage log" ON mileage_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- client_invoices table
CREATE TABLE IF NOT EXISTS client_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE client_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own client invoices" ON client_invoices;
CREATE POLICY "Users manage own client invoices" ON client_invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- credit_fixes table
CREATE TABLE IF NOT EXISTS credit_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'sent', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_fixes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own credit fixes" ON credit_fixes;
CREATE POLICY "Users manage own credit fixes" ON credit_fixes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- net_worth_snapshots table
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  net_worth NUMERIC NOT NULL,
  assets NUMERIC NOT NULL,
  debts NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own net worth snapshots" ON net_worth_snapshots;
CREATE POLICY "Users manage own net worth snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- categorization_exclusions table
CREATE TABLE IF NOT EXISTS categorization_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('merchant', 'category')),
  transaction_id UUID,
  merchant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE categorization_exclusions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categorization exclusions" ON categorization_exclusions;
CREATE POLICY "Users manage own categorization exclusions" ON categorization_exclusions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- document_capture_sessions table
CREATE TABLE IF NOT EXISTS document_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  captured_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE document_capture_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own document capture sessions" ON document_capture_sessions;
CREATE POLICY "Users manage own document capture sessions" ON document_capture_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_document_capture_sessions_token ON document_capture_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_document_capture_sessions_expires ON document_capture_sessions(expires_at);

-- scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'bill', 'statement', 'other')),
  file_url TEXT NOT NULL,
  extracted_data JSONB DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scans" ON scans;
CREATE POLICY "Users manage own scans" ON scans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- avatars storage bucket reference (table for tracking)
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own avatars" ON avatars;
CREATE POLICY "Users manage own avatars" ON avatars FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entitlements table
CREATE TABLE IF NOT EXISTS entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature)
);
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own entitlements" ON entitlements;
CREATE POLICY "Users view own entitlements" ON entitlements FOR SELECT USING (auth.uid() = user_id);

-- billing_subscriptions table
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own billing subscriptions" ON billing_subscriptions;
CREATE POLICY "Users view own billing subscriptions" ON billing_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- billing_payments table
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own billing payments" ON billing_payments;
CREATE POLICY "Users view own billing payments" ON billing_payments FOR SELECT USING (auth.uid() = user_id);

-- savings table
CREATE TABLE IF NOT EXISTS savings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own savings" ON savings;
CREATE POLICY "Users manage own savings" ON savings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

