#!/bin/bash
# Trial Activation Verification Script
# Run this after applying migrations to verify the fix works

set -e

echo "🔍 Verifying 14-day trial activation fix..."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it or run SQL manually."
    exit 1
fi

echo "✅ Step 1: Checking handle_new_user() function..."
supabase db execute --file - <<'SQL'
SELECT 
  CASE 
    WHEN prosrc LIKE '%trial%' 
     AND prosrc LIKE '%NOW() + INTERVAL ''14 days''%' 
    THEN '✅ PASS: Function includes trial initialization'
    ELSE '❌ FAIL: Function missing trial fields'
  END AS status
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
SQL

echo ""
echo "✅ Step 2: Checking triggers exist..."
supabase db execute --file - <<'SQL'
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_created_household')
ORDER BY trigger_name;
SQL

echo ""
echo "✅ Step 3: Checking recent user profiles..."
supabase db execute --file - <<'SQL'
SELECT 
  id,
  email,
  plan,
  trial_started_at,
  trial_ends_at,
  trial_expired,
  created_at,
  CASE 
    WHEN plan = 'trial' 
     AND trial_ends_at > NOW() 
     AND trial_expired = false 
    THEN '✅ Active trial'
    WHEN plan = 'tracker' 
    THEN '⚠️  On tracker (may need backfill)'
    ELSE '❓ Unknown state'
  END AS trial_status
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
SQL

echo ""
echo "✅ Step 4: Counting users by plan..."
supabase db execute --file - <<'SQL'
SELECT 
  plan,
  COUNT(*) as user_count,
  COUNT(CASE WHEN trial_expired = false THEN 1 END) as active_trials,
  COUNT(CASE WHEN trial_expired = true THEN 1 END) as expired_trials
FROM profiles
GROUP BY plan
ORDER BY plan;
SQL

echo ""
echo "✅ Step 5: Checking for users needing backfill..."
supabase db execute --file - <<'SQL'
SELECT 
  COUNT(*) as users_needing_backfill
FROM profiles
WHERE 
  plan = 'tracker' 
  AND (trial_started_at IS NULL OR trial_started_at < NOW() - INTERVAL '30 days')
  AND (trial_expired = false OR trial_expired IS NULL)
  AND created_at >= NOW() - INTERVAL '30 days';
SQL

echo ""
echo "🎉 Verification complete!"
echo ""
echo "Next steps:"
echo "1. If you see '❌ FAIL' in Step 1, re-run the migration"
echo "2. If Step 5 shows users needing backfill, run the backfill migration"
echo "3. Create a test account to verify trial activation works end-to-end"
echo ""
