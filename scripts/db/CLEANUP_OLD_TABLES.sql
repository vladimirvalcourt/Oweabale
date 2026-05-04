-- ============================================
-- CLEANUP - DELETE ALL EXISTING TABLES
-- ============================================
-- Run this BEFORE running COMPLETE_DB_SETUP.sql
-- This removes all old tables and policies
-- ============================================

-- Drop all policies first
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Disable RLS on all tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
END $$;

-- Drop all tables
DROP TABLE IF EXISTS public.admin_broadcasts CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.credit_fixes CASCADE;
DROP TABLE IF EXISTS public.client_invoices CASCADE;
DROP TABLE IF EXISTS public.mileage_log CASCADE;
DROP TABLE IF EXISTS public.freelance_entries CASCADE;
DROP TABLE IF EXISTS public.deductions CASCADE;
DROP TABLE IF EXISTS public.citations CASCADE;
DROP TABLE IF EXISTS public.plaid_accounts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.incomes CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Verify cleanup
SELECT '✅ Cleanup complete!' as status;
SELECT COUNT(*) as remaining_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT COUNT(*) as remaining_policies FROM pg_policies WHERE schemaname = 'public';
