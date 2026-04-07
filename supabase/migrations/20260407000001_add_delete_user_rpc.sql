-- Migration: add delete_user() RPC
-- Allows an authenticated user to delete their own auth.users record.
-- SECURITY DEFINER so it can access auth.users with elevated privileges,
-- but it strictly deletes only auth.uid() — no privilege escalation possible.

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
