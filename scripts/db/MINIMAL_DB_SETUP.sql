-- Minimal database setup for Oweable
-- Run this in Supabase Dashboard SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles table (essential)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'dark',
  phone TEXT DEFAULT '',
  timezone TEXT DEFAULT 'America/New_York',
  language TEXT DEFAULT 'en',
  notification_prefs JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_expired BOOLEAN DEFAULT FALSE,
  credit_score INTEGER,
  credit_last_updated TIMESTAMPTZ,
  plaid_linked_at TIMESTAMPTZ,
  plaid_institution_name TEXT,
  plaid_last_sync_at TIMESTAMPTZ,
  plaid_needs_relink BOOLEAN DEFAULT FALSE,
  tax_state TEXT DEFAULT 'CA',
  tax_rate NUMERIC DEFAULT 9.5,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biller TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  auto_pay BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bills" ON bills;
CREATE POLICY "Users manage own bills" ON bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  apr NUMERIC NOT NULL,
  remaining NUMERIC NOT NULL,
  min_payment NUMERIC NOT NULL,
  paid NUMERIC NOT NULL DEFAULT 0,
  payment_due_date DATE,
  original_amount NUMERIC NOT NULL,
  origination_date DATE,
  term_months INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own debts" ON debts;
CREATE POLICY "Users manage own debts" ON debts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create transactions table
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own transactions" ON transactions;
CREATE POLICY "Users manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  type TEXT NOT NULL,
  appreciation_rate NUMERIC DEFAULT 0,
  purchase_price NUMERIC,
  purchase_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own assets" ON assets;
CREATE POLICY "Users manage own assets" ON assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  category TEXT NOT NULL,
  next_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  is_tax_withheld BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own incomes" ON incomes;
CREATE POLICY "Users manage own incomes" ON incomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL,
  next_billing_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  price_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own subscriptions" ON subscriptions;
CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  type TEXT NOT NULL DEFAULT 'savings',
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON goals;
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  rollover_enabled BOOLEAN DEFAULT FALSE,
  lock_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
CREATE POLICY "Users manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create plaid_accounts table
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

-- Auth trigger for creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
