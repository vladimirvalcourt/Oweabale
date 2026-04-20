-- Optional user-visible memo on manual transactions (Quick Entry notes, etc.)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.transactions.notes IS 'Optional note/memo for manual entries; null for Plaid-synced rows.';
