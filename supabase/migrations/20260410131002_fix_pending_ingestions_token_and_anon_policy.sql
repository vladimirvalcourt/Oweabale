-- Migration: fix_pending_ingestions_token_and_anon_policy
-- Closes anon INSERT spam: require a capture session token that matches an active
-- document_capture_sessions row. Desktop/authenticated inserts omit token (NULL) and
-- continue to use the existing authenticated-only policy.

ALTER TABLE public.pending_ingestions
  ADD COLUMN IF NOT EXISTS token text;

COMMENT ON COLUMN public.pending_ingestions.token IS
  'Mobile capture session secret; must match document_capture_sessions.token for anon INSERT.';

CREATE INDEX IF NOT EXISTS idx_pending_ingestions_token ON public.pending_ingestions (token)
  WHERE token IS NOT NULL;

-- Replace broad policy with role-scoped policies
DROP POLICY IF EXISTS "anon can insert pending ingestion" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users manage own pending_ingestions" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON public.pending_ingestions;

CREATE POLICY "pending_ingestions_authenticated_all"
  ON public.pending_ingestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon: insert only when token proves an active capture session for the same user
-- NOTE: document_capture_sessions was dropped in 20260428180411_remove_mobile_capture_flow.sql
-- Skip this policy if the table doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_capture_sessions'
  ) THEN
    CREATE POLICY "pending_ingestions_anon_insert_with_valid_capture_token"
      ON public.pending_ingestions
      FOR INSERT
      TO anon
      WITH CHECK (
        token IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.document_capture_sessions d
          WHERE d.token = token
            AND d.user_id = user_id
            AND d.status IN ('idle', 'pending', 'active')
            AND (d.expires_at IS NULL OR d.expires_at > now())
        )
      );
  END IF;
END $$;

-- Anon cannot SELECT/UPDATE/DELETE pending_ingestions (no policies → denied)
