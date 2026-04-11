-- Plaid: transaction sync metadata, transaction dedupe columns, profile UX fields.

-- plaid_items: sync state (tokens remain server-only; no new client SELECT)
ALTER TABLE public.plaid_items
  ADD COLUMN IF NOT EXISTS transactions_cursor text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz,
  ADD COLUMN IF NOT EXISTS item_login_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plaid_items.transactions_cursor IS 'Plaid /transactions/sync cursor.';
COMMENT ON COLUMN public.plaid_items.last_sync_at IS 'Last successful sync completion.';
COMMENT ON COLUMN public.plaid_items.last_sync_error IS 'Last sync or webhook error message (non-secret).';
COMMENT ON COLUMN public.plaid_items.item_login_required IS 'Plaid requires user to re-authenticate (update Link).';

CREATE INDEX IF NOT EXISTS plaid_items_last_sync_at_idx
  ON public.plaid_items (last_sync_at NULLS FIRST);

-- transactions: source + Plaid ids for dedupe and modified/removed handling
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plaid_transaction_id text,
  ADD COLUMN IF NOT EXISTS plaid_account_id text;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual', 'plaid'));

COMMENT ON COLUMN public.transactions.source IS 'manual | plaid';
COMMENT ON COLUMN public.transactions.plaid_transaction_id IS 'Plaid transaction_id for sync dedupe.';
COMMENT ON COLUMN public.transactions.plaid_account_id IS 'Plaid account_id for debugging and future use.';

DROP INDEX IF EXISTS transactions_user_plaid_txn_unique;

CREATE UNIQUE INDEX transactions_user_plaid_txn_unique
  ON public.transactions (user_id, plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

-- profiles: safe fields for UI (no tokens)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plaid_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS plaid_needs_relink boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.plaid_last_sync_at IS 'Last successful Plaid transaction sync (server-updated).';
COMMENT ON COLUMN public.profiles.plaid_needs_relink IS 'User must complete Plaid Link update mode.';
