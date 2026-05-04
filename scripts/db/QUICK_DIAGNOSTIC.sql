-- ============================================
-- QUICK DIAGNOSTIC - RUN IN SUPABASE DASHBOARD
-- ============================================
-- Copy and paste this entire file into SQL Editor
-- This will tell you exactly what's wrong
-- ============================================

-- 1. Check if trial columns exist
SELECT '=== TRIAL COLUMNS CHECK ===' as info;
SELECT column_name, data_type, 
       CASE WHEN column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired') THEN '✅ REQUIRED' ELSE 'OK' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY column_name;

-- Count how many trial columns exist
SELECT COUNT(*) as trial_columns_found,
       CASE WHEN COUNT(*) = 3 THEN '✅ ALL PRESENT' 
            WHEN COUNT(*) = 0 THEN '❌ NONE FOUND - RUN MIGRATION'
            ELSE '⚠️ PARTIAL - RUN MIGRATION' END as verdict
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');

-- 2. Check RLS status
SELECT '=== RLS STATUS ===' as info;
SELECT relname as table_name,
       CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_class 
WHERE relname = 'profiles';

-- 3. Check RLS policies
SELECT '=== RLS POLICIES ===' as info;
SELECT policyname, cmd, 
       CASE WHEN qual IS NOT NULL THEN '✅ HAS CONDITION' ELSE '❌ NO CONDITION' END as status
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 4. Check if auth trigger exists
SELECT '=== AUTH TRIGGER ===' as info;
SELECT trigger_name, event_object_table,
       CASE WHEN trigger_name = 'on_auth_user_created' THEN '✅ EXISTS' ELSE '⚠️ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table = 'profiles';

-- 5. Test query (will fail if columns missing)
SELECT '=== TEST QUERY ===' as info;
SELECT 'If you see rows below, database is OK ✅' as result;

-- Get most recent user
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- Try to query profiles with trial columns (this is what AuthCallback does)
SELECT '=== TEST QUERY ===' as info;

-- Check if columns exist first
SELECT 
  CASE WHEN COUNT(*) = 3 THEN '✅ All 3 trial columns present'
       WHEN COUNT(*) = 0 THEN '❌ NO TRIAL COLUMNS - Run FIX_TRIAL_COLUMNS.sql'
       ELSE '⚠️ Only ' || COUNT(*) || ' of 3 columns found - Run FIX_TRIAL_COLUMNS.sql'
  END as column_status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');

-- Get most recent user
SELECT 'Most recent user:' as info, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 1;

-- Test profile query (only if you have users)
-- Replace YOUR_USER_ID with actual ID from above query
-- SELECT id, plan, trial_started_at, trial_ends_at, trial_expired 
-- FROM profiles 
-- WHERE id = 'YOUR_USER_ID_HERE';

-- 6. Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired')) as trial_columns,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') as rls_policies,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'profiles') as triggers,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables;

SELECT '=== RECOMMENDATION ===' as info;
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired')) < 3
    THEN '❌ RUN FIX_TRIAL_COLUMNS.sql - Missing trial columns'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'SELECT') = 0
    THEN '❌ CREATE RLS POLICY - No SELECT policy on profiles'
    WHEN (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') = 0
    THEN '⚠️ AUTH TRIGGER MISSING - Profiles not auto-created on signup'
    ELSE '✅ DATABASE LOOKS GOOD - Issue may be frontend/network related'
  END as recommendation;
