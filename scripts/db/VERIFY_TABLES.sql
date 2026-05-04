-- ============================================
-- VERIFY AND CREATE ALL REQUIRED TABLES
-- Run this in Supabase Dashboard SQL Editor
-- ============================================

-- Check which tables exist
SELECT 
  '=== EXISTING TABLES ===' as info;

SELECT table_name, 
       CASE WHEN table_name IN (
         'profiles', 'bills', 'debts', 'transactions', 'assets', 
         'incomes', 'subscriptions', 'plaid_accounts', 'goals', 
         'budgets', 'categories', 'citations', 'deductions', 
         'freelance_entries', 'mileage_log', 'client_invoices', 
         'credit_fixes', 'admin_broadcasts', 'platform_settings'
       ) THEN '✅ REQUIRED' ELSE 'OK' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count required tables
SELECT 
  COUNT(*) as found_count,
  CASE WHEN COUNT(*) >= 19 THEN '✅ ALL TABLES PRESENT' 
       ELSE '❌ MISSING TABLES - SEE LIST BELOW' END as verdict
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles', 'bills', 'debts', 'transactions', 'assets', 
    'incomes', 'subscriptions', 'plaid_accounts', 'goals', 
    'budgets', 'categories', 'citations', 'deductions', 
    'freelance_entries', 'mileage_log', 'client_invoices', 
    'credit_fixes', 'admin_broadcasts', 'platform_settings'
  );

-- List missing tables
SELECT '=== MISSING TABLES ===' as info;

SELECT required_table,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' 
           AND table_name = required_table
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM unnest(ARRAY[
  'profiles', 'bills', 'debts', 'transactions', 'assets', 
  'incomes', 'subscriptions', 'plaid_accounts', 'goals', 
  'budgets', 'categories', 'citations', 'deductions', 
  'freelance_entries', 'mileage_log', 'client_invoices', 
  'credit_fixes', 'admin_broadcasts', 'platform_settings'
]) AS required_table
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = required_table
);

-- If tables are missing, run the full migration
SELECT '=== RECOMMENDATION ===' as info;
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
          'profiles', 'bills', 'debts', 'transactions', 'assets', 
          'incomes', 'subscriptions', 'plaid_accounts', 'goals', 
          'budgets', 'categories', 'citations', 'deductions', 
          'freelance_entries', 'mileage_log', 'client_invoices', 
          'credit_fixes', 'admin_broadcasts', 'platform_settings'
        )
    ) < 19
    THEN '❌ RUN: supabase db push OR manually apply 20260503030451_cleanup_and_setup.sql'
    ELSE '✅ ALL REQUIRED TABLES EXIST'
  END as recommendation;
