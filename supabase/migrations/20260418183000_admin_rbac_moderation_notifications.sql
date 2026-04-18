-- Admin RBAC + Moderation + Notifications foundation.

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.system_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderator_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON public.moderation_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS system_notifications_created_idx ON public.system_notifications(created_at DESC);

CREATE SCHEMA IF NOT EXISTS _internal;

CREATE OR REPLACE FUNCTION _internal.is_moderator_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
    OR EXISTS (
      SELECT 1
      FROM public.admin_user_roles aur
      JOIN public.admin_roles ar ON ar.id = aur.role_id
      WHERE aur.user_id = auth.uid()
        AND ar.key IN ('admin', 'moderator')
    );
$$;

GRANT EXECUTE ON FUNCTION _internal.is_moderator_or_admin() TO authenticated, anon;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_roles" ON public.admin_roles;
CREATE POLICY "Admins manage admin_roles"
  ON public.admin_roles FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Admins manage admin_permissions" ON public.admin_permissions;
CREATE POLICY "Admins manage admin_permissions"
  ON public.admin_permissions FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Admins manage admin_role_permissions" ON public.admin_role_permissions;
CREATE POLICY "Admins manage admin_role_permissions"
  ON public.admin_role_permissions FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Admins manage admin_user_roles" ON public.admin_user_roles;
CREATE POLICY "Admins manage admin_user_roles"
  ON public.admin_user_roles FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Admins read notifications" ON public.system_notifications;
CREATE POLICY "Admins read notifications"
  ON public.system_notifications FOR SELECT
  USING (_internal.is_admin());

DROP POLICY IF EXISTS "Admins manage notifications" ON public.system_notifications;
CREATE POLICY "Admins manage notifications"
  ON public.system_notifications FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Moderators read moderation queue" ON public.moderation_queue;
CREATE POLICY "Moderators read moderation queue"
  ON public.moderation_queue FOR SELECT
  USING (_internal.is_moderator_or_admin());

DROP POLICY IF EXISTS "Moderators update moderation queue" ON public.moderation_queue;
CREATE POLICY "Moderators update moderation queue"
  ON public.moderation_queue FOR UPDATE
  USING (_internal.is_moderator_or_admin())
  WITH CHECK (_internal.is_moderator_or_admin());

DROP POLICY IF EXISTS "Users can report moderation items" ON public.moderation_queue;
CREATE POLICY "Users can report moderation items"
  ON public.moderation_queue FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Compatibility object for clients that expect plural audit_logs.
CREATE OR REPLACE VIEW public.audit_logs AS
SELECT
  id,
  user_id,
  table_name,
  record_id,
  action,
  old_data,
  new_data,
  created_at
FROM public.audit_log;

GRANT SELECT ON public.audit_logs TO authenticated;

INSERT INTO public.admin_roles (key, label)
VALUES ('admin', 'Admin'), ('moderator', 'Moderator'), ('user', 'User')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.admin_permissions (key, label)
VALUES
  ('dashboard.view', 'View dashboard'),
  ('users.manage', 'Manage users'),
  ('moderation.manage', 'Manage moderation queue'),
  ('audit.read', 'Read audit logs'),
  ('settings.manage', 'Manage platform settings')
ON CONFLICT (key) DO NOTHING;
