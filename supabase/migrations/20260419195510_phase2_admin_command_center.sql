-- Phase 2: Enterprise admin architecture foundations.
-- - Multi-tier RBAC roles and permissions
-- - Audited impersonation sessions
-- - Compliance tracking tables (KYC/AML + flagged transactions)
-- - User timeline support indexes for Plaid/Stripe operational views

-- =========================
-- RBAC Roles + Permissions
-- =========================

INSERT INTO public.admin_roles (key, label)
VALUES
  ('super_admin', 'Super Admin'),
  ('support_agent', 'Support Agent'),
  ('developer_ops', 'Developer/Ops')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO public.admin_permissions (key, label)
VALUES
  ('users.read', 'Read users and profile state'),
  ('users.impersonate', 'Impersonate users for support'),
  ('users.manage', 'Manage users (ban/unban, sessions)'),
  ('settings.maintenance', 'Toggle maintenance mode'),
  ('settings.platform', 'Toggle platform controls'),
  ('compliance.read', 'Read KYC/AML status and flags'),
  ('compliance.manage', 'Update KYC/AML and flagged transactions'),
  ('telemetry.read', 'Read system telemetry and webhook health')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

WITH role_perm(role_key, perm_key) AS (
  VALUES
    -- super_admin: full control
    ('super_admin', 'dashboard.view'),
    ('super_admin', 'users.read'),
    ('super_admin', 'users.impersonate'),
    ('super_admin', 'users.manage'),
    ('super_admin', 'settings.manage'),
    ('super_admin', 'settings.maintenance'),
    ('super_admin', 'settings.platform'),
    ('super_admin', 'audit.read'),
    ('super_admin', 'moderation.manage'),
    ('super_admin', 'compliance.read'),
    ('super_admin', 'compliance.manage'),
    ('super_admin', 'telemetry.read'),
    -- support_agent: read + impersonate + non-destructive user ops
    ('support_agent', 'dashboard.view'),
    ('support_agent', 'users.read'),
    ('support_agent', 'users.impersonate'),
    ('support_agent', 'audit.read'),
    ('support_agent', 'compliance.read'),
    -- developer_ops: telemetry, moderation, and platform ops visibility
    ('developer_ops', 'dashboard.view'),
    ('developer_ops', 'audit.read'),
    ('developer_ops', 'moderation.manage'),
    ('developer_ops', 'telemetry.read'),
    ('developer_ops', 'settings.platform')
)
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm rp
JOIN public.admin_roles r ON r.key = rp.role_key
JOIN public.admin_permissions p ON p.key = rp.perm_key
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =========================
-- Impersonation Sessions
-- =========================

CREATE TABLE IF NOT EXISTS public.admin_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  audit_context jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admin_impersonation_sessions_admin_idx
  ON public.admin_impersonation_sessions (admin_user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS admin_impersonation_sessions_target_idx
  ON public.admin_impersonation_sessions (target_user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS admin_impersonation_sessions_status_idx
  ON public.admin_impersonation_sessions (status, expires_at DESC);

ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage impersonation sessions" ON public.admin_impersonation_sessions;
CREATE POLICY "Admins manage impersonation sessions"
  ON public.admin_impersonation_sessions
  FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- =========================
-- Compliance Module Tables
-- =========================

CREATE TABLE IF NOT EXISTS public.user_compliance_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_status text NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'manual_review')),
  aml_status text NOT NULL DEFAULT 'pending' CHECK (aml_status IN ('pending', 'clear', 'flagged', 'manual_review')),
  pep_sanctions_hit boolean NOT NULL DEFAULT false,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flagged_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'rule' CHECK (source IN ('rule', 'plaid', 'manual', 'external')),
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS flagged_transactions_user_status_idx
  ON public.flagged_transactions (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS flagged_transactions_severity_idx
  ON public.flagged_transactions (severity, status, created_at DESC);

ALTER TABLE public.user_compliance_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage user compliance statuses" ON public.user_compliance_status;
CREATE POLICY "Admins manage user compliance statuses"
  ON public.user_compliance_status
  FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP POLICY IF EXISTS "Admins manage flagged transactions" ON public.flagged_transactions;
CREATE POLICY "Admins manage flagged transactions"
  ON public.flagged_transactions
  FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

DROP TRIGGER IF EXISTS update_user_compliance_status_updated_at ON public.user_compliance_status;
CREATE TRIGGER update_user_compliance_status_updated_at
  BEFORE UPDATE ON public.user_compliance_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_flagged_transactions_updated_at ON public.flagged_transactions;
CREATE TRIGGER update_flagged_transactions_updated_at
  BEFORE UPDATE ON public.flagged_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Telemetry support indexes
-- =========================

CREATE INDEX IF NOT EXISTS stripe_events_processed_at_idx
  ON public.stripe_events (processed_at DESC);
CREATE INDEX IF NOT EXISTS plaid_items_last_sync_idx
  ON public.plaid_items (last_sync_at DESC, item_login_required, last_sync_error);
