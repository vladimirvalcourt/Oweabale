-- P3 admin operations: support, billing history, lifecycle governance, comms queues, and incident queues.
-- All privileged mutations are intended to go through admin-actions with service-role access and audit_log rows.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'assigned', 'status_changed', 'priority_changed', 'reply', 'note')),
  old_value text,
  new_value text,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_type text NOT NULL DEFAULT 'risk' CHECK (note_type IN ('risk', 'support', 'billing', 'general')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_user_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('ban', 'unban', 'restore', 'delete_requested', 'delete_cancelled')),
  reason_code text NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_deletion_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'approved', 'completed')),
  reason_code text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.admin_trial_extension_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_trial_ends_at timestamptz,
  new_trial_ends_at timestamptz NOT NULL,
  additional_days integer NOT NULL CHECK (additional_days BETWEEN 1 AND 90),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'admin',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.admin_email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  audience_filter text NOT NULL DEFAULT 'all',
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('draft', 'test_queued', 'queued', 'processing', 'sent', 'failed', 'cancelled')),
  test_email text,
  queued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.admin_webhook_replay_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('stripe', 'plaid', 'risc_google', 'other')),
  source_event_id text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_tickets_status_sla_idx ON public.support_tickets(status, sla_due_at, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_assignee_idx ON public.support_tickets(assigned_admin_id, status);
CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_idx ON public.support_ticket_events(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_ticket_notes_ticket_idx ON public.support_ticket_notes(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_user_notes_target_idx ON public.admin_user_notes(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_user_lifecycle_target_idx ON public.admin_user_lifecycle_events(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_deletion_reviews_target_status_idx ON public.admin_deletion_reviews(target_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_trial_extension_events_target_idx ON public.admin_trial_extension_events(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_invites_email_status_idx ON public.admin_invites(lower(email), status);
CREATE INDEX IF NOT EXISTS admin_email_queue_status_idx ON public.admin_email_queue(status, queued_at DESC);
CREATE INDEX IF NOT EXISTS admin_webhook_replay_queue_status_idx ON public.admin_webhook_replay_queue(status, created_at DESC);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deletion_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_trial_extension_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_webhook_replay_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage support ticket events" ON public.support_ticket_events;
CREATE POLICY "Admins manage support ticket events" ON public.support_ticket_events FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage support ticket notes" ON public.support_ticket_notes;
CREATE POLICY "Admins manage support ticket notes" ON public.support_ticket_notes FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage user notes" ON public.admin_user_notes;
CREATE POLICY "Admins manage user notes" ON public.admin_user_notes FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage lifecycle events" ON public.admin_user_lifecycle_events;
CREATE POLICY "Admins manage lifecycle events" ON public.admin_user_lifecycle_events FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage deletion reviews" ON public.admin_deletion_reviews;
CREATE POLICY "Admins manage deletion reviews" ON public.admin_deletion_reviews FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage trial extension events" ON public.admin_trial_extension_events;
CREATE POLICY "Admins manage trial extension events" ON public.admin_trial_extension_events FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage invites" ON public.admin_invites;
CREATE POLICY "Admins manage invites" ON public.admin_invites FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage email templates" ON public.admin_email_templates;
CREATE POLICY "Admins manage email templates" ON public.admin_email_templates FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage email suppressions" ON public.admin_email_suppressions;
CREATE POLICY "Admins manage email suppressions" ON public.admin_email_suppressions FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage email queue" ON public.admin_email_queue;
CREATE POLICY "Admins manage email queue" ON public.admin_email_queue FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());
DROP POLICY IF EXISTS "Admins manage webhook replay queue" ON public.admin_webhook_replay_queue;
CREATE POLICY "Admins manage webhook replay queue" ON public.admin_webhook_replay_queue FOR ALL USING (_internal.is_admin()) WITH CHECK (_internal.is_admin());

INSERT INTO public.admin_permissions (key, label)
VALUES
  ('support.manage', 'Manage support tickets and internal notes'),
  ('governance.manage', 'Manage admin roles and invites'),
  ('incident.manage', 'Manage incident controls and replay queues'),
  ('comms.manage', 'Manage email templates, suppressions, and queues')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

WITH role_perm(role_key, perm_key) AS (
  VALUES
    ('super_admin', 'support.manage'),
    ('super_admin', 'governance.manage'),
    ('super_admin', 'incident.manage'),
    ('super_admin', 'comms.manage'),
    ('support_agent', 'support.manage'),
    ('support_agent', 'comms.manage'),
    ('developer_ops', 'incident.manage')
)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm rp
JOIN public.admin_roles r ON r.key = rp.role_key
JOIN public.admin_permissions p ON p.key = rp.perm_key
ON CONFLICT (role_id, permission_id) DO NOTHING;
