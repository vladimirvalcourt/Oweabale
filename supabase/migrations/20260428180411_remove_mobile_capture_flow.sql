-- Remove the unsupported QR/mobile capture path.
-- Desktop document ingestion now uses the authenticated ingestion-files bucket only.

DROP POLICY IF EXISTS "pending_ingestions_anon_insert_with_valid_capture_token" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_authenticated_all" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users manage own pending_ingestions" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON public.pending_ingestions;

CREATE POLICY "Users can manage their own pending_ingestions"
  ON public.pending_ingestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP INDEX IF EXISTS public.idx_pending_ingestions_token;
ALTER TABLE public.pending_ingestions DROP COLUMN IF EXISTS token;

DROP POLICY IF EXISTS "Authenticated users manage own scans" ON storage.objects;
DROP POLICY IF EXISTS "Anon mobile capture uploads to incoming" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read scans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scans" ON storage.objects;
DROP POLICY IF EXISTS "scans_authenticated_manage_owned_objects" ON storage.objects;
DROP POLICY IF EXISTS "scans_anon_upload_with_valid_capture_session" ON storage.objects;

DROP TABLE IF EXISTS public.document_capture_sessions CASCADE;
DROP FUNCTION IF EXISTS public.prevent_document_capture_session_user_change();
DROP FUNCTION IF EXISTS public.request_x_session_token();

-- NOTE: Direct deletion from storage.buckets is not allowed via SQL
-- This must be done via the Supabase Storage API
-- The scans bucket deletion is skipped here and should be done manually if needed
