-- Enforce Tracker vs Full Suite at the database layer for paid-only tables.

CREATE OR REPLACE FUNCTION public.has_full_suite_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
  entitlement_active boolean := false;
  subscription_active boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.is_admin = true
    INTO is_admin
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF coalesce(is_admin, false) THEN
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

COMMENT ON FUNCTION public.has_full_suite_access(uuid)
  IS 'Returns true for admins or users with active full_suite entitlement/subscription.';

-- transactions: read own rows; writes require full suite
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_write_own_transactions_full_suite" ON public.transactions;

CREATE POLICY "users_select_own_transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_transactions_full_suite"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));

-- debts: read own rows; writes require full suite
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "users_select_own_debts" ON public.debts;
DROP POLICY IF EXISTS "users_write_own_debts_full_suite" ON public.debts;

CREATE POLICY "users_select_own_debts"
  ON public.debts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_debts_full_suite"
  ON public.debts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));

-- incomes: read own rows; writes require full suite
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "users_select_own_incomes" ON public.incomes;
DROP POLICY IF EXISTS "users_write_own_incomes_full_suite" ON public.incomes;

CREATE POLICY "users_select_own_incomes"
  ON public.incomes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_incomes_full_suite"
  ON public.incomes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));
