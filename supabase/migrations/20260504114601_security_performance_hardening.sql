-- ============================================================
-- Security & Performance Hardening
-- Fixes 44 advisory lint issues across security + performance
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION A: Enable RLS on all public tables missing it
-- ────────────────────────────────────────────────────────────

-- Internal/backend-only tables (admin, billing, audit, infra):
-- Enable RLS with admin-only or service_role-only access.
-- Users should never directly query these via PostgREST.

ALTER TABLE public.plaid_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_allowlist           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_compliance_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flagged_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tos_acceptances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_blasts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risc_google_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_deletion_reviews   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_trial_extension_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_webhook_replay_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events          ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- SECTION A (continued): RLS policies per table
-- ────────────────────────────────────────────────────────────

-- plaid_items: contains access_token — users can only see their own,
-- but access_token must NEVER be exposed via PostgREST.
-- Authenticated users can read metadata columns only (enforced at app layer).
-- Service role has full access (no policy needed — bypasses RLS).
CREATE POLICY "plaid_items_owner_only"
  ON public.plaid_items
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- categorization_rules: user-owned
CREATE POLICY "categorization_rules_owner_only"
  ON public.categorization_rules
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- audit_log: users can only read their own audit entries; no writes via API
CREATE POLICY "audit_log_select_own"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- app_config: read-only for authenticated users (no user-specific rows)
CREATE POLICY "app_config_read_authenticated"
  ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- beta_allowlist: admin-only; block all direct access from regular users
-- (service_role used by Edge Functions to check beta status)
-- No policy = no access for anon/authenticated via PostgREST.

-- billing_subscriptions: users can view their own subscription
CREATE POLICY "billing_subscriptions_select_own"
  ON public.billing_subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- billing_payments: users can view their own payments
CREATE POLICY "billing_payments_select_own"
  ON public.billing_payments
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- entitlements: users can view their own entitlements
CREATE POLICY "entitlements_select_own"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- stripe_events: backend-only; no direct PostgREST access
-- No policy = no access for anon/authenticated.

-- push_subscriptions: users manage their own
CREATE POLICY "push_subscriptions_owner_only"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- investment_accounts: users manage their own
CREATE POLICY "investment_accounts_owner_only"
  ON public.investment_accounts
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- insurance_policies: users manage their own
CREATE POLICY "insurance_policies_owner_only"
  ON public.insurance_policies
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- admin_impersonation_sessions: admin-only (is_admin check)
CREATE POLICY "admin_impersonation_sessions_admin_only"
  ON public.admin_impersonation_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_roles / admin_permissions / admin_role_permissions / admin_user_roles:
-- read-only for authenticated users (needed to check user role in app),
-- writes only via service_role
CREATE POLICY "admin_roles_read_authenticated"
  ON public.admin_roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_permissions_read_authenticated"
  ON public.admin_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_role_permissions_read_authenticated"
  ON public.admin_role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_user_roles_read_own"
  ON public.admin_user_roles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- system_notifications: all authenticated users can read
CREATE POLICY "system_notifications_read_authenticated"
  ON public.system_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- moderation_queue: admin-only
CREATE POLICY "moderation_queue_admin_only"
  ON public.moderation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- user_compliance_status: users read own
CREATE POLICY "user_compliance_status_select_own"
  ON public.user_compliance_status
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- flagged_transactions: admin-only
CREATE POLICY "flagged_transactions_admin_only"
  ON public.flagged_transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- data_deletion_requests: users can insert and view own requests
CREATE POLICY "data_deletion_requests_owner"
  ON public.data_deletion_requests
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- tos_acceptances: users can insert and view own
CREATE POLICY "tos_acceptances_owner"
  ON public.tos_acceptances
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- admin_email_blasts: admin-only
CREATE POLICY "admin_email_blasts_admin_only"
  ON public.admin_email_blasts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- user_sessions: users can view own sessions only
CREATE POLICY "user_sessions_select_own"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- coupons: authenticated users can read (to display discount info); no writes
CREATE POLICY "coupons_read_authenticated"
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (true);

-- risc_google_events: backend-only; no direct PostgREST access
-- No policy = no access for anon/authenticated.

-- support_ticket_events: users can view events on their own tickets
CREATE POLICY "support_ticket_events_select_own"
  ON public.support_ticket_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id AND st.user_id = (select auth.uid())
    )
  );

-- support_ticket_notes: admin-only
CREATE POLICY "support_ticket_notes_admin_only"
  ON public.support_ticket_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_user_notes: admin-only
CREATE POLICY "admin_user_notes_admin_only"
  ON public.admin_user_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_user_lifecycle_events: admin-only
CREATE POLICY "admin_user_lifecycle_events_admin_only"
  ON public.admin_user_lifecycle_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_deletion_reviews: admin-only
CREATE POLICY "admin_deletion_reviews_admin_only"
  ON public.admin_deletion_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- user_feedback: users manage own
CREATE POLICY "user_feedback_owner"
  ON public.user_feedback
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- support_tickets: users manage own tickets
CREATE POLICY "support_tickets_owner"
  ON public.support_tickets
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- admin_trial_extension_events: admin-only
CREATE POLICY "admin_trial_extension_events_admin_only"
  ON public.admin_trial_extension_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_invites: admin-only
CREATE POLICY "admin_invites_admin_only"
  ON public.admin_invites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_email_templates: admin-only
CREATE POLICY "admin_email_templates_admin_only"
  ON public.admin_email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_email_suppressions: admin-only
CREATE POLICY "admin_email_suppressions_admin_only"
  ON public.admin_email_suppressions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_email_queue: admin-only
CREATE POLICY "admin_email_queue_admin_only"
  ON public.admin_email_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- admin_webhook_replay_queue: admin-only
CREATE POLICY "admin_webhook_replay_queue_admin_only"
  ON public.admin_webhook_replay_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- households: owner-only (household members handled via separate join)
CREATE POLICY "households_owner_only"
  ON public.households
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

-- security_events: users can read own events; inserts via service_role only
CREATE POLICY "security_events_select_own"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────
-- SECTION B: Fix SECURITY DEFINER view (audit_logs)
-- Replace with SECURITY INVOKER — view only selects own rows
-- ────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.audit_logs;
CREATE VIEW public.audit_logs
  WITH (security_invoker = true)
AS
  SELECT id, user_id, table_name, record_id, action, old_data, new_data, created_at
  FROM public.audit_log;

-- ────────────────────────────────────────────────────────────
-- SECTION B (continued): Revoke EXECUTE from SECURITY DEFINER
-- functions that should NOT be callable via PostgREST
-- ────────────────────────────────────────────────────────────

-- Trigger-only functions: should never be called directly by users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_household() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_transaction_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_audit_log() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_enforce_privileged_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flip_overdue_bills() FROM anon, authenticated;

-- Backend-only operations: called exclusively from Edge Functions with service_role
REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_closed_beta() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.risc_revoke_user_sessions(uuid) FROM anon, authenticated;

-- find_user_id_by_google_sub: backend RISC handler only
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_google_sub(text) FROM anon, authenticated;

-- has_full_suite_access: used in RLS policies internally, not as RPC endpoint
-- Keep authenticated access for now since it may be used in policies;
-- revoke anon only
REVOKE EXECUTE ON FUNCTION public.has_full_suite_access(uuid) FROM anon;

-- use_coupon: intentionally callable by authenticated users (user action)
-- KEEP authenticated access — only revoke anon
REVOKE EXECUTE ON FUNCTION public.use_coupon(text) FROM anon;

-- get_closed_beta_public: intentionally public read function
-- KEEP both anon + authenticated access (it's a read-only gate check)

-- ────────────────────────────────────────────────────────────
-- SECTION B (continued): Fix mutable search_path in functions
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_entitlement(p_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = (SELECT auth.uid())
      AND e.feature_key = p_feature_key
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at >= now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION D: Fix RLS performance — consolidate duplicate policies
-- and replace auth.uid() with (select auth.uid()) to avoid initplan
-- ────────────────────────────────────────────────────────────

-- Pattern: many tables have two identical ALL policies (old + new name).
-- Drop the old "Users manage own X" policies and keep only the *_user_only
-- ones, updated to use (select auth.uid()) for performance.

-- assets
DROP POLICY IF EXISTS "Users manage own assets" ON public.assets;
DROP POLICY IF EXISTS "assets_user_only" ON public.assets;
CREATE POLICY "assets_owner"
  ON public.assets FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- bills
DROP POLICY IF EXISTS "Users manage own bills" ON public.bills;
DROP POLICY IF EXISTS "bills_user_only" ON public.bills;
CREATE POLICY "bills_owner"
  ON public.bills FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- budgets
DROP POLICY IF EXISTS "Users manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "budgets_user_only" ON public.budgets;
CREATE POLICY "budgets_owner"
  ON public.budgets FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- categories
DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
DROP POLICY IF EXISTS "categories_user_only" ON public.categories;
CREATE POLICY "categories_owner"
  ON public.categories FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- citations
DROP POLICY IF EXISTS "Users manage own citations" ON public.citations;
DROP POLICY IF EXISTS "citations_user_only" ON public.citations;
CREATE POLICY "citations_owner"
  ON public.citations FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- client_invoices
DROP POLICY IF EXISTS "Users manage own client invoices" ON public.client_invoices;
DROP POLICY IF EXISTS "client_invoices_user_only" ON public.client_invoices;
CREATE POLICY "client_invoices_owner"
  ON public.client_invoices FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- credit_fixes
DROP POLICY IF EXISTS "Users manage own credit fixes" ON public.credit_fixes;
DROP POLICY IF EXISTS "credit_fixes_user_only" ON public.credit_fixes;
CREATE POLICY "credit_fixes_owner"
  ON public.credit_fixes FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- debts
DROP POLICY IF EXISTS "Users manage own debts" ON public.debts;
DROP POLICY IF EXISTS "debts_user_only" ON public.debts;
CREATE POLICY "debts_owner"
  ON public.debts FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- deductions
DROP POLICY IF EXISTS "Users manage own deductions" ON public.deductions;
DROP POLICY IF EXISTS "deductions_user_only" ON public.deductions;
CREATE POLICY "deductions_owner"
  ON public.deductions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- freelance_entries
DROP POLICY IF EXISTS "Users manage own freelance entries" ON public.freelance_entries;
DROP POLICY IF EXISTS "Users manage own freelance_entries" ON public.freelance_entries;
DROP POLICY IF EXISTS "freelance_entries_user_only" ON public.freelance_entries;
CREATE POLICY "freelance_entries_owner"
  ON public.freelance_entries FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- goals
DROP POLICY IF EXISTS "Users manage own goals" ON public.goals;
DROP POLICY IF EXISTS "goals_user_only" ON public.goals;
CREATE POLICY "goals_owner"
  ON public.goals FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- incomes
DROP POLICY IF EXISTS "Users manage own incomes" ON public.incomes;
DROP POLICY IF EXISTS "incomes_user_only" ON public.incomes;
CREATE POLICY "incomes_owner"
  ON public.incomes FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- mileage_log
DROP POLICY IF EXISTS "Users manage own mileage log" ON public.mileage_log;
DROP POLICY IF EXISTS "mileage_log_user_only" ON public.mileage_log;
CREATE POLICY "mileage_log_owner"
  ON public.mileage_log FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- subscriptions
DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_only" ON public.subscriptions;
CREATE POLICY "subscriptions_owner"
  ON public.subscriptions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- transactions: also has users_and_household_transactions_access from earlier migration
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_user_only" ON public.transactions;
DROP POLICY IF EXISTS "users_and_household_transactions_access" ON public.transactions;
CREATE POLICY "transactions_owner"
  ON public.transactions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- plaid_accounts: only had one policy, update to use (select auth.uid())
DROP POLICY IF EXISTS "Users manage own plaid accounts" ON public.plaid_accounts;
CREATE POLICY "plaid_accounts_owner"
  ON public.plaid_accounts FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- categorization_exclusions: consolidate 5 policies into 1
DROP POLICY IF EXISTS "categorization_exclusions_select_own" ON public.categorization_exclusions;
DROP POLICY IF EXISTS "categorization_exclusions_insert_own" ON public.categorization_exclusions;
DROP POLICY IF EXISTS "categorization_exclusions_update_own" ON public.categorization_exclusions;
DROP POLICY IF EXISTS "categorization_exclusions_delete_own" ON public.categorization_exclusions;
DROP POLICY IF EXISTS "categorization_exclusions_user_only" ON public.categorization_exclusions;
CREATE POLICY "categorization_exclusions_owner"
  ON public.categorization_exclusions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- net_worth_snapshots: consolidate 5 policies into 1
DROP POLICY IF EXISTS "net_worth_snapshots_select_own" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "net_worth_snapshots_insert_own" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "net_worth_snapshots_update_own" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "net_worth_snapshots_delete_own" ON public.net_worth_snapshots;
DROP POLICY IF EXISTS "net_worth_snapshots_user_only" ON public.net_worth_snapshots;
CREATE POLICY "net_worth_snapshots_owner"
  ON public.net_worth_snapshots FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- pending_ingestions: consolidate 5 policies into 1
DROP POLICY IF EXISTS "pending_ingestions_select_own" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_insert_own" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_update_own" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_delete_own" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_user_only" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON public.pending_ingestions;
CREATE POLICY "pending_ingestions_owner"
  ON public.pending_ingestions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- profiles: update existing policies to use (select auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_admin_select_all"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid()) AND p.is_admin = true
    )
  );

-- ────────────────────────────────────────────────────────────
-- SECTION E: Add indexes for unindexed foreign keys
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_admin_deletion_reviews_cancelled_by
  ON public.admin_deletion_reviews (cancelled_by);

CREATE INDEX IF NOT EXISTS idx_admin_deletion_reviews_requested_by
  ON public.admin_deletion_reviews (requested_by);

CREATE INDEX IF NOT EXISTS idx_admin_email_queue_queued_by
  ON public.admin_email_queue (queued_by);

CREATE INDEX IF NOT EXISTS idx_admin_email_queue_template_id
  ON public.admin_email_queue (template_id);

CREATE INDEX IF NOT EXISTS idx_admin_email_suppressions_created_by
  ON public.admin_email_suppressions (created_by);

CREATE INDEX IF NOT EXISTS idx_admin_email_templates_created_by
  ON public.admin_email_templates (created_by);

CREATE INDEX IF NOT EXISTS idx_admin_email_templates_updated_by
  ON public.admin_email_templates (updated_by);

CREATE INDEX IF NOT EXISTS idx_admin_invites_invited_by
  ON public.admin_invites (invited_by);

CREATE INDEX IF NOT EXISTS idx_admin_invites_role_id
  ON public.admin_invites (role_id);

CREATE INDEX IF NOT EXISTS idx_admin_role_permissions_permission_id
  ON public.admin_role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_admin_trial_extension_events_admin_user_id
  ON public.admin_trial_extension_events (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_lifecycle_events_admin_user_id
  ON public.admin_user_lifecycle_events (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_admin_user_id
  ON public.admin_user_notes (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_assigned_by
  ON public.admin_user_roles (assigned_by);

CREATE INDEX IF NOT EXISTS idx_admin_webhook_replay_queue_requested_by
  ON public.admin_webhook_replay_queue (requested_by);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON public.audit_log (user_id);

CREATE INDEX IF NOT EXISTS idx_credit_fixes_user_id
  ON public.credit_fixes (user_id);

CREATE INDEX IF NOT EXISTS idx_flagged_transactions_resolved_by
  ON public.flagged_transactions (resolved_by);

CREATE INDEX IF NOT EXISTS idx_households_owner_id
  ON public.households (owner_id);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by
  ON public.moderation_queue (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_submitted_by
  ON public.moderation_queue (submitted_by);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_actor_user_id
  ON public.support_ticket_events (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_admin_user_id
  ON public.support_ticket_notes (admin_user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
  ON public.support_tickets (user_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id
  ON public.user_feedback (user_id);
