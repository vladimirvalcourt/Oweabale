-- Quick diagnostic to check if tables and policies exist
SELECT 
  tablename,
  CASE 
    WHEN has_table_privilege('authenticated', tablename, 'SELECT') THEN '✓ SELECT'
    ELSE '✗ NO SELECT'
  END as select_perm,
  CASE 
    WHEN has_table_privilege('authenticated', tablename, 'INSERT') THEN '✓ INSERT'
    ELSE '✗ NO INSERT'
  END as insert_perm
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'bills', 'debts', 'transactions', 'assets', 'incomes', 'subscriptions', 'plaid_accounts', 'goals', 'budgets', 'categories')
ORDER BY tablename;
