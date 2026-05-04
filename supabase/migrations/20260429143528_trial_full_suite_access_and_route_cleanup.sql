-- Repair reverse-trial access everywhere the database enforces Full Suite.
--
-- The live production function only checked admin, entitlement, and Stripe
-- subscription rows. That made active 14-day profile trials look locked to RLS.
-- Keep this migration current-dated so it lands before the older future-dated
-- trial repair files that were sitting in the repo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'tracker';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_plan_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    -- Update any existing rows with invalid plan values
    UPDATE public.profiles
    SET plan = CASE
      WHEN plan = 'free' THEN 'tracker'
      WHEN plan NOT IN ('tracker', 'trial', 'full_suite') THEN 'tracker'
      ELSE plan
    END
    WHERE plan IS NULL OR plan NOT IN ('tracker', 'trial', 'full_suite');

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('tracker', 'trial', 'full_suite'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry
  ON public.profiles (plan, trial_ends_at)
  WHERE plan = 'trial';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
    false,
    false,
    'trial',
    now(),
    now() + interval '14 days',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
    last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
    avatar = COALESCE(NULLIF(public.profiles.avatar, ''), EXCLUDED.avatar),
    plan = CASE
      WHEN public.profiles.plan IN ('trial', 'full_suite') THEN public.profiles.plan
      ELSE 'trial'
    END,
    trial_started_at = COALESCE(public.profiles.trial_started_at, EXCLUDED.trial_started_at),
    trial_ends_at = CASE
      WHEN public.profiles.plan = 'full_suite' THEN public.profiles.trial_ends_at
      WHEN public.profiles.trial_ends_at IS NOT NULL AND public.profiles.trial_ends_at > now() THEN public.profiles.trial_ends_at
      ELSE EXCLUDED.trial_ends_at
    END,
    trial_expired = CASE
      WHEN public.profiles.plan = 'full_suite' THEN public.profiles.trial_expired
      ELSE false
    END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_full_suite_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_access boolean := false;
  entitlement_active boolean := false;
  subscription_active boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    p.is_admin = true
    OR p.plan = 'full_suite'
    OR (
      p.plan = 'trial'
      AND p.trial_expired IS FALSE
      AND p.trial_ends_at IS NOT NULL
      AND p.trial_ends_at > now()
    )
    INTO profile_access
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF coalesce(profile_access, false) THEN
    RETURN true;
  END IF;

  SELECT (
      e.status = 'active'
      AND (
        e.ends_at IS NULL
        OR e.ends_at >= now()
      )
    )
    INTO entitlement_active
  FROM public.entitlements e
  WHERE e.user_id = p_user_id
    AND e.feature_key = 'full_suite'
  ORDER BY e.updated_at DESC
  LIMIT 1;

  SELECT (s.status IN ('active', 'trialing'))
    INTO subscription_active
  FROM public.billing_subscriptions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC
  LIMIT 1;

  RETURN coalesce(entitlement_active, false) OR coalesce(subscription_active, false);
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates/repairs new user profiles with a 14-day reverse trial and pinned search_path.';

COMMENT ON FUNCTION public.has_full_suite_access(uuid) IS
  'Returns true for admins, active 14-day profile trials, paid profile plan, active entitlement, or live Stripe subscription.';

-- Repair recent signups that were created while the trigger/function mismatch
-- was live. Do not touch paid/admin rows or users whose trial history exists.
UPDATE public.profiles p
SET
  plan = 'trial',
  trial_started_at = now(),
  trial_ends_at = now() + interval '14 days',
  trial_expired = false
WHERE coalesce(p.is_admin, false) = false
  AND coalesce(p.plan, 'tracker') = 'tracker'
  AND p.created_at >= now() - interval '30 days'
  AND p.trial_started_at IS NULL
  AND coalesce(p.trial_expired, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.billing_subscriptions s
    WHERE s.user_id = p.id
      AND s.status IN ('active', 'trialing')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = p.id
      AND e.feature_key = 'full_suite'
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at >= now())
  );
