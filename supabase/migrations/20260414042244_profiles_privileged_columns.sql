-- Block privilege escalation: only service role (no JWT) or real admins may change
-- is_admin / is_banned on profiles. Regular users updating their own row cannot
-- flip these flags.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.profiles_enforce_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin OR NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    -- Service-role / backend requests have no JWT → allow (RLS already bypassed).
    IF auth.uid() IS NOT NULL AND NOT _internal.is_admin() THEN
      RAISE EXCEPTION 'Not authorized to change admin or ban status'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_privileged_columns_trigger ON public.profiles;
CREATE TRIGGER profiles_enforce_privileged_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_enforce_privileged_columns();

COMMENT ON FUNCTION public.profiles_enforce_privileged_columns() IS
  'Rejects UPDATEs that change is_admin or is_banned unless caller is admin or service role.';
