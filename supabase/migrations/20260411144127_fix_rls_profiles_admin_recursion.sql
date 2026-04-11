-- ============================================================
-- Fix: infinite recursion in profiles RLS
--
-- Root cause: "Admins can view all profiles" policy on the
-- `profiles` table contains:
--   EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()
--           AND p.is_admin = TRUE)
-- Postgres evaluates that sub-SELECT, which re-triggers every
-- SELECT policy on `profiles`, including this one — infinite loop.
--
-- Fix: move the is_admin check into a SECURITY DEFINER function
-- that lives in a private schema.  SECURITY DEFINER runs as the
-- function owner (postgres / BYPASSRLS), so the inner SELECT on
-- `profiles` is executed without going through RLS at all.
-- ============================================================

-- 1. Private schema for internal helper functions
CREATE SCHEMA IF NOT EXISTS _internal;
GRANT USAGE ON SCHEMA _internal TO authenticated, anon;

-- 2. SECURITY DEFINER helper — queries profiles bypassing RLS
CREATE OR REPLACE FUNCTION _internal.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Grant execute so authenticated/anon users can call it through
-- the policy evaluator (the evaluator runs in the caller's security
-- context, so the role must have EXECUTE permission).
GRANT EXECUTE ON FUNCTION _internal.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION _internal.is_admin() TO anon;

-- 3. Replace the recursive policy with the safe one
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (_internal.is_admin());
