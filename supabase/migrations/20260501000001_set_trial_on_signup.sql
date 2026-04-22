-- Migration: Set 14-day reverse trial on new user signup
-- Created: 2026-05-01
-- 
-- All new users get automatic 14-day Full Suite trial, no credit card required
-- Updates handle_new_user() trigger to initialize trial fields

-- ── Step 1: Update handle_new_user to set trial fields ────────
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

-- ── Step 2: Verify function security settings ─────────────────
ALTER FUNCTION public.handle_new_user() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with 14-day reverse trial. Uses SECURITY DEFINER with empty search_path for security.';
