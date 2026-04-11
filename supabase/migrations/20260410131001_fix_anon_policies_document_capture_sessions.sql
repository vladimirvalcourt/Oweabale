-- Migration: fix_anon_policies_document_capture_sessions
-- Replaces permissive RLS (USING(true)/WITH CHECK(true)) on document_capture_sessions
-- with token-scoped access for the anon role. PostgREST forwards the client header
-- x-session-token into Postgres as current_setting('request.headers') JSON; RLS
-- compares it to the row's token so only the QR-linked session is readable/updatable.
-- Authenticated users keep full ownership policies unchanged.

-- ── Helper: read session token from PostgREST-injected request headers ─────────
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

COMMENT ON FUNCTION public.request_x_session_token() IS
  'Returns x-session-token header for mobile capture RLS; PostgREST sets request.headers.';

GRANT EXECUTE ON FUNCTION public.request_x_session_token() TO anon, authenticated;

-- ── Session expiry + status: allow QR flow "pending" and bound session lifetime ─
ALTER TABLE public.document_capture_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.document_capture_sessions
SET expires_at = COALESCE(created_at, now()) + interval '24 hours'
WHERE expires_at IS NULL;

ALTER TABLE public.document_capture_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

ALTER TABLE public.document_capture_sessions
  DROP CONSTRAINT IF EXISTS document_capture_sessions_status_check;

ALTER TABLE public.document_capture_sessions
  ADD CONSTRAINT document_capture_sessions_status_check
  CHECK (status IN ('idle', 'pending', 'active', 'completed', 'error'));

-- ── Prevent privilege escalation via user_id swap on updates ────────────────────
CREATE OR REPLACE FUNCTION public.prevent_document_capture_session_user_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'document_capture_sessions.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_document_capture_session_user_change ON public.document_capture_sessions;
CREATE TRIGGER trg_prevent_document_capture_session_user_change
  BEFORE UPDATE ON public.document_capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_document_capture_session_user_change();

-- ── Drop unsafe / duplicate policy names (remote DBs may vary) ─────────────────
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "anon can update session status" ON public.document_capture_sessions;

-- Authenticated: full CRUD on own rows only (explicit TO authenticated)
DROP POLICY IF EXISTS "Users manage own sessions" ON public.document_capture_sessions;
CREATE POLICY "document_capture_sessions_authenticated_own"
  ON public.document_capture_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon: read only rows whose token matches the request header
CREATE POLICY "document_capture_sessions_anon_select_by_header_token"
  ON public.document_capture_sessions
  FOR SELECT
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Anon: update only matching token; WITH CHECK blocks token/user_id swaps
CREATE POLICY "document_capture_sessions_anon_update_by_header_token"
  ON public.document_capture_sessions
  FOR UPDATE
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    token = public.request_x_session_token()
    AND user_id IS NOT NULL
  );

-- Anon must not insert/delete capture sessions (desktop creates sessions while logged in)
-- No INSERT/DELETE policies for anon → denied by default when RLS is enabled.
