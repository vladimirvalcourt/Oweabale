-- Ensure transactions table has RLS enabled and user-scoped policies.
-- The table was created in remote migrations not tracked locally.

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by Edge Functions for Plaid sync) bypasses RLS by design.
