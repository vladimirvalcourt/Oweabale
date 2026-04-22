-- Manual Test: Create a test user and verify trial activation
-- Run this in Supabase SQL Editor after applying migrations

-- Step 1: Check current function definition
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%''trial''%' THEN '✅ Has trial plan'
    ELSE '❌ Missing trial plan'
  END as has_trial_plan,
  CASE 
    WHEN prosrc LIKE '%NOW() + INTERVAL%14 days%' THEN '✅ Has 14-day expiry'
    ELSE '❌ Missing 14-day expiry'
  END as has_14_days,
  CASE 
    WHEN prosrc LIKE '%trial_started_at%' THEN '✅ Sets trial_started_at'
    ELSE '❌ Missing trial_started_at'
  END as has_start_date,
  CASE 
    WHEN prosrc LIKE '%trial_ends_at%' THEN '✅ Sets trial_ends_at'
    ELSE '❌ Missing trial_ends_at'
  END as has_end_date
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Step 2: Check triggers are active
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name IN ('on_auth_user_created', 'on_auth_user_created_household')
ORDER BY trigger_name;

-- Step 3: List recent users and their trial status
SELECT 
  p.id,
  p.email,
  p.plan,
  p.trial_started_at,
  p.trial_ends_at,
  p.trial_expired,
  p.created_at,
  CASE 
    WHEN p.plan = 'trial' AND p.trial_ends_at > NOW() AND p.trial_expired = false 
    THEN '✅ Active trial'
    WHEN p.plan = 'trial' AND p.trial_ends_at <= NOW() 
    THEN '⚠️  Trial expired (cron should downgrade)'
    WHEN p.plan = 'tracker' AND p.trial_expired = true 
    THEN '✅ Downgraded to tracker'
    WHEN p.plan = 'tracker' AND p.trial_started_at IS NULL 
    THEN '❌ Never had trial (needs backfill)'
    WHEN p.plan = 'full_suite' 
    THEN '💎 Paid subscriber'
    ELSE '❓ Unknown state'
  END as status
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 4: Count users by status
SELECT 
  plan,
  COUNT(*) as total_users,
  COUNT(CASE WHEN trial_expired = false AND plan = 'trial' THEN 1 END) as active_trials,
  COUNT(CASE WHEN trial_expired = true THEN 1 END) as expired_trials,
  MIN(created_at) as earliest_signup,
  MAX(created_at) as latest_signup
FROM profiles
GROUP BY plan
ORDER BY plan;

-- Step 5: Find users who need backfill (signed up recently without trial)
SELECT 
  id,
  email,
  created_at,
  plan,
  trial_started_at,
  trial_expired,
  'Needs backfill' as action_required
FROM profiles
WHERE 
  plan = 'tracker' 
  AND (trial_started_at IS NULL OR trial_started_at < NOW() - INTERVAL '30 days')
  AND (trial_expired = false OR trial_expired IS NULL)
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Step 6: Verify cron job configuration (if using pg_cron)
SELECT * FROM cron.job WHERE jobname LIKE '%trial%' OR command LIKE '%expire-trials%';
