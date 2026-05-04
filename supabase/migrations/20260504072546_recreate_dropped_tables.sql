-- Recreate tables that were dropped in 001_cleanup_old_tables.sql
-- These tables are needed by the frontend to make backend 100% follow frontend

-- 1. PENDING_INGESTIONS
-- Document ingestion pipeline for PDF/image statement scanning
CREATE TABLE IF NOT EXISTS public.pending_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bill', 'debt', 'transaction', 'income', 'citation')),
  status TEXT NOT NULL DEFAULT 'scanning',
  source TEXT NOT NULL DEFAULT 'desktop' CHECK (source IN ('desktop', 'mobile')),
  extracted_data JSONB NOT NULL DEFAULT '{}',
  original_file JSONB NOT NULL DEFAULT '{}',
  storage_path TEXT,
  storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_ingestions_user_created_idx
  ON public.pending_ingestions (user_id, created_at DESC);

ALTER TABLE public.pending_ingestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_ingestions_select_own"
  ON public.pending_ingestions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pending_ingestions_insert_own"
  ON public.pending_ingestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pending_ingestions_update_own"
  ON public.pending_ingestions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "pending_ingestions_delete_own"
  ON public.pending_ingestions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. CATEGORIZATION_EXCLUSIONS
-- Exclude specific transactions or merchants from auto-categorization
CREATE TABLE IF NOT EXISTS public.categorization_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('transaction', 'merchant')),
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  merchant_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT categorization_exclusions_target_check CHECK (
    (scope = 'transaction' AND transaction_id IS NOT NULL)
    OR
    (scope = 'merchant' AND merchant_name IS NOT NULL AND length(trim(merchant_name)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS categorization_exclusions_user_tx_unique
  ON public.categorization_exclusions (user_id, transaction_id)
  WHERE scope = 'transaction';

CREATE UNIQUE INDEX IF NOT EXISTS categorization_exclusions_user_merchant_unique
  ON public.categorization_exclusions (user_id, lower(merchant_name))
  WHERE scope = 'merchant';

ALTER TABLE public.categorization_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorization_exclusions_select_own"
  ON public.categorization_exclusions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "categorization_exclusions_insert_own"
  ON public.categorization_exclusions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categorization_exclusions_update_own"
  ON public.categorization_exclusions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "categorization_exclusions_delete_own"
  ON public.categorization_exclusions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. NET_WORTH_SNAPSHOTS
-- Historical net worth tracking for trend analysis
CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  net_worth DECIMAL(14,2) NOT NULL,
  assets DECIMAL(14,2) NOT NULL,
  debts DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS net_worth_snapshots_user_date_idx
  ON public.net_worth_snapshots (user_id, date DESC);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "net_worth_snapshots_select_own"
  ON public.net_worth_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "net_worth_snapshots_insert_own"
  ON public.net_worth_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "net_worth_snapshots_update_own"
  ON public.net_worth_snapshots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "net_worth_snapshots_delete_own"
  ON public.net_worth_snapshots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.pending_ingestions IS 'Document ingestion pipeline for PDF/image statement scanning';
COMMENT ON TABLE public.categorization_exclusions IS 'Exclude specific transactions or merchants from auto-categorization';
COMMENT ON TABLE public.net_worth_snapshots IS 'Historical net worth tracking for trend analysis';
