-- Plaid: server-side item storage + profile display fields (no secrets on client).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plaid_institution_name text,
  ADD COLUMN IF NOT EXISTS plaid_linked_at timestamptz;

COMMENT ON COLUMN public.profiles.plaid_institution_name IS 'Last linked Plaid institution label (safe to show in UI).';
COMMENT ON COLUMN public.profiles.plaid_linked_at IS 'When the user last completed Plaid Link.';

CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  access_token text NOT NULL,
  institution_id text,
  institution_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_items_item_id_key UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS plaid_items_user_id_idx ON public.plaid_items (user_id);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.plaid_items IS 'Plaid access tokens — inserted by Edge Functions (service role). Clients cannot SELECT.';

-- Allow users to remove their own Plaid rows (e.g. reset data) without reading tokens.
CREATE POLICY "Users delete own plaid_items"
  ON public.plaid_items
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
