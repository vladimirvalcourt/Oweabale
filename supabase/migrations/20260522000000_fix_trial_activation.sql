-- Migration: Fix 14-day trial activation on signup
-- Created: 2026-05-22
-- 
-- Problem: Users signing up don't get 14-day trial activated
-- Root cause: handle_new_user() function may not include trial initialization
-- due to migration order conflicts between 20260421 and 20260501 migrations
--
-- Solution: Recreate handle_new_user() with guaranteed trial fields
-- This migration supersedes all previous versions

-- ── Step 1: Drop existing triggers to avoid conflicts ─────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;

-- ── Step 2: Recreate handle_new_user with trial initialization ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar,
    has_completed_onboarding,
    is_admin,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_expired
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      CASE 
        WHEN POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) > 0 
        THEN SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) + 1)
        ELSE ''
      END,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    FALSE,  -- has_completed_onboarding default
    FALSE,  -- is_admin default (never auto-assign admin)
    'trial',  -- Start with 14-day reverse trial
    NOW(),  -- trial_started_at = now
    NOW() + INTERVAL '14 days',  -- trial_ends_at = 14 days from now
    FALSE  -- trial_expired = false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ── Step 3: Recreate household trigger (preserves functionality) ─
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create default household for new user
  INSERT INTO public.households (name, owner_id)
  VALUES ('My Household', NEW.id)
  RETURNING id INTO new_household_id;
  
  -- Add user as owner
  INSERT INTO public.household_members (household_id, user_id, role, status, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', 'accepted', NOW());
  
  RETURN NEW;
END;
$$;

-- ── Step 4: Recreate triggers in correct order ────────────────
-- Profile creation must happen first
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Then household creation
CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_household();

-- ── Step 5: Ensure INSERT policy exists for service role ──────
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Step 6: Verify function security settings ─────────────────
ALTER FUNCTION public.handle_new_user() SET search_path TO '';
ALTER FUNCTION public.handle_new_user_household() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with 14-day reverse trial. Uses SECURITY DEFINER with empty search_path for security.';
COMMENT ON FUNCTION public.handle_new_user_household() IS 'Creates default household for new users. Uses SECURITY DEFINER with empty search_path for security.';
