-- Explicit subscription tier on profiles.
--
-- Previously the system inferred "free tier" from the absence of any
-- entitlement row, which is fragile and made it impossible to tell at a
-- glance what tier a user is on.  This migration adds a first-class
-- subscription_tier column so that:
--   • Every new user is explicitly placed on 'tracker' at sign-up.
--   • The Stripe webhook promotes/demotes the column as subscription
--     status changes.
--   • Access-control hooks can read a single column instead of joining
--     three tables.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'tracker'
  CHECK (subscription_tier IN ('tracker', 'full_suite'));

-- Backfill: users who already have an active full_suite entitlement get
-- promoted; everyone else stays on 'tracker' (already the DEFAULT).
UPDATE public.profiles p
SET subscription_tier = 'full_suite'
WHERE EXISTS (
  SELECT 1
  FROM   public.entitlements e
  WHERE  e.user_id     = p.id
    AND  e.feature_key = 'full_suite'
    AND  e.status      = 'active'
    AND  (e.ends_at IS NULL OR e.ends_at > now())
);

-- Also promote users with a live billing subscription in case an
-- entitlement row was never written (e.g. webhook failed once).
UPDATE public.profiles p
SET subscription_tier = 'full_suite'
WHERE subscription_tier = 'tracker'
  AND EXISTS (
    SELECT 1
    FROM   public.billing_subscriptions bs
    WHERE  bs.user_id = p.id
      AND  bs.status IN ('active', 'trialing')
  );

-- Rewrite handle_new_user to explicitly insert subscription_tier = 'tracker'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name',
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name',
      ''
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    ),
    'tracker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
