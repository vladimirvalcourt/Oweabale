-- Fix admin RLS regression on 2026-04-18 migrations + performance indexes.
-- The investment_accounts, insurance_policies, and chat_messages migrations reintroduced the
-- recursive `EXISTS (SELECT 1 FROM profiles ...)` admin pattern that was fixed project-wide in
-- 20260411144758. Replace with the security-definer helper _internal.is_admin().

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = '_internal'
  ) THEN
    RAISE EXCEPTION '_internal.is_admin() not found — apply 20260411144758 first';
  END IF;
END $$;

-- investment_accounts
DROP POLICY IF EXISTS "Admins can manage investment accounts" ON public.investment_accounts;
CREATE POLICY "Admins can manage investment accounts"
  ON public.investment_accounts FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- insurance_policies
DROP POLICY IF EXISTS "Admins can manage insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins can manage insurance policies"
  ON public.insurance_policies FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- chat_messages
DROP POLICY IF EXISTS "Admins can manage chat messages" ON public.chat_messages;
CREATE POLICY "Admins can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- Indexes for RBAC lookups + audit feed queries
CREATE INDEX IF NOT EXISTS admin_user_roles_user_id_idx
  ON public.admin_user_roles (user_id);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON public.audit_log (created_at DESC);

-- Atomic Stripe webhook claim: one round-trip, race-free.
-- Returns 'inserted' when this is the first delivery, 'duplicate_completed' when a prior
-- delivery finished, 'duplicate_pending' when a prior attempt is still mid-flight.
CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  INSERT INTO public.stripe_events (stripe_event_id, event_type, payload, processing_completed)
  VALUES (p_event_id, p_event_type, p_payload, FALSE)
  ON CONFLICT (stripe_event_id) DO NOTHING
  RETURNING processing_completed INTO v_completed;

  IF FOUND THEN
    RETURN 'inserted';
  END IF;

  SELECT processing_completed INTO v_completed
  FROM public.stripe_events
  WHERE stripe_event_id = p_event_id;

  IF v_completed IS TRUE THEN
    RETURN 'duplicate_completed';
  END IF;
  RETURN 'duplicate_pending';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(TEXT, TEXT, JSONB) TO service_role;
