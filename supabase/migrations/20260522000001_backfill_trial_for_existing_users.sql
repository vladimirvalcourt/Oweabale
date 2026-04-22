-- Migration: Backfill 14-day trial for recent users without trial
-- Created: 2026-05-22
-- 
-- Purpose: Give existing tracker users (who signed up recently) a fresh 14-day trial
-- This is a one-time fix for users affected by the trial activation bug
--
-- Safety: Only affects users who:
-- - Have plan = 'tracker'
-- - Don't have trial_started_at set (never had a trial)
-- - Signed up in the last 30 days
-- - Haven't already expired a trial (trial_expired = false or null)

UPDATE public.profiles
SET 
  plan = 'trial',
  trial_started_at = NOW(),
  trial_ends_at = NOW() + INTERVAL '14 days',
  trial_expired = false,
  updated_at = NOW()
WHERE 
  plan = 'tracker' 
  AND (trial_started_at IS NULL OR trial_started_at < NOW() - INTERVAL '30 days')
  AND (trial_expired = false OR trial_expired IS NULL)
  AND created_at >= NOW() - INTERVAL '30 days';

-- Log how many users were affected
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled trial for % users', affected_count;
END $$;
