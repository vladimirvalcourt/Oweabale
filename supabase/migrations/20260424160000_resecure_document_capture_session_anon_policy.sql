-- Migration: resecure_document_capture_session_anon_policy
-- Restores token-bound anonymous access for document_capture_sessions.
-- A later migration reintroduced a permissive FOR ALL anon policy that did not
-- compare request headers, allowing any anonymous caller to read/update active sessions.

-- Ensure helper exists (safe no-op if already present)
CREATE OR REPLACE FUNCTION public.request_x_session_token()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $$
  SELECT NULLIF(
    trim(both FROM (COALESCE(current_setting('request.headers', true), '{}')::jsonb ->> 'x-session-token')),
    ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.request_x_session_token() TO anon, authenticated;

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
