-- Linked Plaid depository accounts: metadata for Savings view (track transfers into savings-like accounts).

CREATE TABLE IF NOT EXISTS public.plaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plaid_item_id uuid NOT NULL REFERENCES public.plaid_items (id) ON DELETE CASCADE,
  plaid_account_id text NOT NULL,
  name text NOT NULL,
  official_name text,
  account_type text NOT NULL DEFAULT 'other',
  account_subtype text,
  mask text,
  subtype_suggested_savings boolean NOT NULL DEFAULT false,
  include_in_savings boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_accounts_user_plaid_account_unique UNIQUE (user_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS plaid_accounts_user_id_idx ON public.plaid_accounts (user_id);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plaid_accounts' AND column_name = 'plaid_item_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS plaid_accounts_plaid_item_id_idx ON public.plaid_accounts (plaid_item_id);
  END IF;
END $$;

COMMENT ON TABLE public.plaid_accounts IS 'Plaid account metadata synced via /accounts/get; RLS allows user SELECT/UPDATE for include_in_savings.';
COMMENT ON COLUMN public.plaid_accounts.subtype_suggested_savings IS 'Heuristic from Plaid subtype each sync (savings, money market, cd, etc.).';
COMMENT ON COLUMN public.plaid_accounts.include_in_savings IS 'Include this account on the Savings page; new rows default from subtype heuristic.';

ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own plaid_accounts"
  ON public.plaid_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own plaid_accounts"
  ON public.plaid_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inserts happen from Edge Functions (service role), not from the client.
