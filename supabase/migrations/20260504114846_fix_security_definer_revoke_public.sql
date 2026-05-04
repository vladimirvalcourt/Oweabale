-- ============================================================
-- Fix SECURITY DEFINER function exposure
-- REVOKE FROM PUBLIC (not just anon/authenticated) to actually
-- remove the implicit grant, then re-grant only where needed.
-- ============================================================

-- ── Trigger-only / internal functions ────────────────────────
-- These are called only by triggers or Supabase internals.
-- No user or service_role RPC call should ever invoke them directly.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_household() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_transaction_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_enforce_privileged_columns() FROM PUBLIC;

-- ── Backend-only (Edge Function / cron / service_role) ────────
-- Already had no PUBLIC grant (only postgres + service_role);
-- enforce for any that still have it.

REVOKE EXECUTE ON FUNCTION public.enforce_closed_beta() FROM PUBLIC;

-- ── has_full_suite_access: used in RLS expressions ────────────
-- Authenticated users can call it for their own plan check.
-- Anon must NOT call it (revoke public, keep authenticated).
REVOKE EXECUTE ON FUNCTION public.has_full_suite_access(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_full_suite_access(uuid) TO authenticated;

-- ── use_coupon: intentional authenticated RPC ─────────────────
-- Anon must NOT call it; authenticated users can.
REVOKE EXECUTE ON FUNCTION public.use_coupon(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.use_coupon(text) TO authenticated;

-- ── get_closed_beta_public: intentional public read gate ──────
-- Already has explicit anon + authenticated grants (not just PUBLIC).
-- No change needed — keep as-is (gate check before login).
