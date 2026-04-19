-- Cross-Account Protection (RISC): resolve Google subject -> auth user, revoke sessions, dedup table.

CREATE OR REPLACE FUNCTION public.find_user_id_by_google_sub(lookup_sub text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.user_id
  FROM auth.identities i
  WHERE i.provider = 'google'
    AND coalesce(i.identity_data->>'sub', '') = lookup_sub
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_google_sub(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_google_sub(text) TO service_role;

CREATE OR REPLACE FUNCTION public.risc_revoke_user_sessions(target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.risc_revoke_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risc_revoke_user_sessions(uuid) TO service_role;

CREATE TABLE public.risc_google_events (
  jti text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risc_google_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.risc_google_events IS 'Google RISC security event jti values for de-duplication; trim periodically.';

CREATE INDEX risc_google_events_received_at_idx ON public.risc_google_events (received_at);

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS google_refresh_token_fp_hash text,
  ADD COLUMN IF NOT EXISTS google_refresh_token_fp_prefix text;

COMMENT ON COLUMN public.email_connections.google_refresh_token_fp_hash IS 'Base64(SHA512(SHA512(utf8(refresh_token)))) for RISC token-revoked (hash_base64_sha512_sha512).';
COMMENT ON COLUMN public.email_connections.google_refresh_token_fp_prefix IS 'First 16 characters of refresh token for RISC token-revoked (prefix).';
