-- Migration: harden mobile capture session, scans storage, and public contact surfaces
-- Restores header-bound anon RLS for capture sessions and restricts scans bucket access
-- to the owning authenticated user or a valid mobile capture token.

-- Harden anon mobile capture access back to header-bound token matching.
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "document_capture_sessions_anon_select_by_header_token" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "document_capture_sessions_anon_update_by_header_token" ON public.document_capture_sessions;

CREATE POLICY "document_capture_sessions_anon_select_by_header_token"
  ON public.document_capture_sessions
  FOR SELECT
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND status IN ('idle', 'pending', 'active')
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "document_capture_sessions_anon_update_by_header_token"
  ON public.document_capture_sessions
  FOR UPDATE
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND status IN ('idle', 'pending', 'active')
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    token = public.request_x_session_token()
    AND user_id IS NOT NULL
    AND status IN ('idle', 'pending', 'active', 'completed', 'error')
  );

COMMENT ON POLICY "document_capture_sessions_anon_select_by_header_token" ON public.document_capture_sessions IS
  'Anonymous mobile clients may read only the live capture session whose token matches x-session-token.';

COMMENT ON POLICY "document_capture_sessions_anon_update_by_header_token" ON public.document_capture_sessions IS
  'Anonymous mobile clients may update only the live capture session whose token matches x-session-token.';

-- Remove broad scans bucket access and bind uploads/reads to ownership.
DROP POLICY IF EXISTS "Authenticated users manage own scans" ON storage.objects;
DROP POLICY IF EXISTS "Anon mobile capture uploads to incoming" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read scans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scans" ON storage.objects;
DROP POLICY IF EXISTS "scans_authenticated_manage_owned_objects" ON storage.objects;
DROP POLICY IF EXISTS "scans_anon_upload_with_valid_capture_session" ON storage.objects;

CREATE POLICY "scans_authenticated_manage_owned_objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'scans'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] = 'incoming'
        AND (storage.foldername(name))[2] IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.document_capture_sessions d
          WHERE d.id::text = (storage.foldername(name))[2]
            AND d.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'scans'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] = 'incoming'
        AND (storage.foldername(name))[2] IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.document_capture_sessions d
          WHERE d.id::text = (storage.foldername(name))[2]
            AND d.user_id = auth.uid()
            AND d.status IN ('idle', 'pending', 'active')
            AND (d.expires_at IS NULL OR d.expires_at > now())
        )
      )
    )
  );

CREATE POLICY "scans_anon_upload_with_valid_capture_session"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'scans'
    AND (storage.foldername(name))[1] = 'incoming'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf')
    AND EXISTS (
      SELECT 1
      FROM public.document_capture_sessions d
      WHERE d.id::text = (storage.foldername(name))[2]
        AND d.token = public.request_x_session_token()
        AND d.status IN ('idle', 'pending', 'active')
        AND (d.expires_at IS NULL OR d.expires_at > now())
    )
  );
