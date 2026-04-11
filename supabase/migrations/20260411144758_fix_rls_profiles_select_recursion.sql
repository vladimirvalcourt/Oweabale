-- ============================================================
-- Fix: second recursive profiles SELECT policy + cascade cleanup
--
-- A remote-placeholder migration had created a combined `profiles_select`
-- policy containing:
--   (auth.uid() = id) OR
--   ((SELECT is_admin FROM profiles WHERE id = auth.uid() LIMIT 1) = true)
--
-- The second branch queries profiles inside a profiles SELECT policy —
-- infinite recursion (Postgres error 42P17).
--
-- In addition, every table with an admin check that does
--   EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
-- would trigger profiles SELECT policies on the way, hitting the same loop.
--
-- Fix: replace all self/cross-referencing admin policies with
-- _internal.is_admin() which runs SECURITY DEFINER (BYPASSRLS).
-- ============================================================

-- ── profiles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  USING ((auth.uid() = id) OR _internal.is_admin());

-- ── admin_broadcasts ──────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins manage broadcasts"
  ON public.admin_broadcasts FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- ── audit_log ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins view audit log" ON public.audit_log;
CREATE POLICY "Admins view audit log"
  ON public.audit_log FOR SELECT
  USING (_internal.is_admin());

-- ── platform_settings (consolidate duplicates) ────────────────
DROP POLICY IF EXISTS "Admins can modify platform_settings"  ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can read platform_settings"    ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update platform_settings"  ON public.platform_settings;
DROP POLICY IF EXISTS "Admins manage platform_settings"      ON public.platform_settings;
CREATE POLICY "Admins manage platform_settings"
  ON public.platform_settings FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- ── support_tickets ───────────────────────────────────────────
DROP POLICY IF EXISTS "Admins have full access to tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins view all tickets"           ON public.support_tickets;
CREATE POLICY "Admins manage tickets"
  ON public.support_tickets FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- ── user_feedback ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage all feedback" ON public.user_feedback;
CREATE POLICY "Admins can manage all feedback"
  ON public.user_feedback FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());
