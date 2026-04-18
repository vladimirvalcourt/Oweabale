-- Track user investment accounts (brokerage, IRA, 401k, etc.).
CREATE TABLE IF NOT EXISTS public.investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brokerage', 'ira', 'roth_ira', '401k', '403b', 'hsa', 'other')),
  institution TEXT,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  notes TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own investment accounts" ON public.investment_accounts;
CREATE POLICY "Users can manage own investment accounts"
  ON public.investment_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage investment accounts" ON public.investment_accounts;
CREATE POLICY "Admins can manage investment accounts"
  ON public.investment_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS investment_accounts_user_id_idx
  ON public.investment_accounts (user_id);
