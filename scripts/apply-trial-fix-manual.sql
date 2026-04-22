-- ============================================================================
-- QUICK FIX: Apply this entire script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/hjgrslcapdmmgxeppguu/sql/new
-- ============================================================================

-- Step 1: Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;

-- Step 2: Recreate handle_new_user with trial initialization
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

-- Step 3: Recreate household trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  INSERT INTO public.households (name, owner_id)
  VALUES ('My Household', NEW.id)
  RETURNING id INTO new_household_id;
  
  INSERT INTO public.household_members (household_id, user_id, role, status, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', 'accepted', NOW());
  
  RETURN NEW;
END;
$$;

-- Step 4: Recreate triggers in correct order
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_household();

-- Step 5: Ensure INSERT policy exists
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Step 6: Verify security settings
ALTER FUNCTION public.handle_new_user() SET search_path TO '';
ALTER FUNCTION public.handle_new_user_household() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with 14-day reverse trial. Uses SECURITY DEFINER with empty search_path for security.';
COMMENT ON FUNCTION public.handle_new_user_household() IS 'Creates default household for new users. Uses SECURITY DEFINER with empty search_path for security.';

-- ============================================================================
-- VERIFICATION: Check that the fix was applied correctly
-- ============================================================================

SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%''trial''%' AND prosrc LIKE '%NOW() + INTERVAL%14 days%' 
    THEN '✅ SUCCESS: Trial activation is configured'
    ELSE '❌ FAIL: Trial activation is NOT configured'
  END as status
FROM pg_proc 
WHERE proname = 'handle_new_user' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- BACKFILL: Give recent users a 14-day trial (optional, one-time fix)
-- Uncomment the following block if you want to backfill existing users
-- ============================================================================

/*
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

-- Show how many users were affected
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled trial for % users', affected_count;
END $$;
*/

-- ============================================================================
-- DONE! Test by creating a new account at https://www.oweable.com/onboarding
-- ============================================================================
