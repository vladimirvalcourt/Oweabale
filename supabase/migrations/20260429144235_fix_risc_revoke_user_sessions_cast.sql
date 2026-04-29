-- Fix database lint/runtime type mismatch in the RISC session revocation helper.
-- auth.refresh_tokens.user_id is varchar in this Supabase project, while the
-- public RPC accepts the auth user id as uuid.

CREATE OR REPLACE FUNCTION public.risc_revoke_user_sessions(target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens
  WHERE user_id = target_user::text;
END;
$$;

REVOKE ALL ON FUNCTION public.risc_revoke_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risc_revoke_user_sessions(uuid) TO service_role;
