-- Stripe billing + DB/RLS-backed entitlements

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_stripe_customer_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  amount_total bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  product_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_source_check CHECK (source IN ('subscription', 'one_time', 'admin', 'manual')),
  CONSTRAINT entitlements_status_check CHECK (status IN ('active', 'inactive', 'expired', 'revoked'))
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_id_idx ON public.billing_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx ON public.billing_subscriptions (status);
CREATE INDEX IF NOT EXISTS billing_subscriptions_period_end_idx ON public.billing_subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS billing_payments_user_id_idx ON public.billing_payments (user_id);
CREATE INDEX IF NOT EXISTS billing_payments_status_idx ON public.billing_payments (status);
CREATE INDEX IF NOT EXISTS entitlements_user_id_idx ON public.entitlements (user_id);
CREATE INDEX IF NOT EXISTS entitlements_feature_key_idx ON public.entitlements (feature_key);
CREATE INDEX IF NOT EXISTS entitlements_status_idx ON public.entitlements (status);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing subscriptions" ON public.billing_subscriptions;
CREATE POLICY "Users can view own billing subscriptions"
  ON public.billing_subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own billing payments" ON public.billing_payments;
CREATE POLICY "Users can view own billing payments"
  ON public.billing_payments
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- No client-side access to webhook event rows.
DROP POLICY IF EXISTS "No direct stripe event access" ON public.stripe_events;
CREATE POLICY "No direct stripe event access"
  ON public.stripe_events
  FOR SELECT
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.has_entitlement(p_feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = auth.uid()
      AND e.feature_key = p_feature_key
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_entitlement(text) TO authenticated;
