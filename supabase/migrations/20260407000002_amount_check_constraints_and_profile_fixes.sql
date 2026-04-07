-- ============================================================
-- Migration: amount > 0 CHECK constraints, profiles DELETE
-- policy, and is_admin column
-- ============================================================

-- ── M-2: amount > 0 CHECK constraints ────────────────────────
-- Reject zero or negative financial values at the database level,
-- regardless of what the frontend sends.

ALTER TABLE bills        ADD CONSTRAINT bills_amount_positive        CHECK (amount > 0);
ALTER TABLE debts        ADD CONSTRAINT debts_remaining_positive     CHECK (remaining >= 0);
ALTER TABLE debts        ADD CONSTRAINT debts_min_payment_positive   CHECK (min_payment >= 0);
ALTER TABLE assets       ADD CONSTRAINT assets_value_positive        CHECK (value > 0);
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_amount_positive CHECK (amount > 0);
ALTER TABLE goals        ADD CONSTRAINT goals_target_amount_positive  CHECK (target_amount > 0);
ALTER TABLE goals        ADD CONSTRAINT goals_current_amount_nn      CHECK (current_amount >= 0);
ALTER TABLE incomes      ADD CONSTRAINT incomes_amount_positive      CHECK (amount > 0);
ALTER TABLE budgets      ADD CONSTRAINT budgets_amount_positive      CHECK (amount > 0);
ALTER TABLE citations    ADD CONSTRAINT citations_amount_positive    CHECK (amount > 0);
ALTER TABLE citations    ADD CONSTRAINT citations_penalty_nn         CHECK (penalty_fee >= 0);
ALTER TABLE deductions   ADD CONSTRAINT deductions_amount_positive   CHECK (amount > 0);

-- ── M-3: profiles DELETE RLS policy ──────────────────────────
-- Allows users to delete their own profile row.
-- The ON DELETE CASCADE on auth.users already handles this when
-- delete_user() RPC removes the auth record, but an explicit
-- policy enables profile self-deletion independently if needed.

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ── M-1 (schema): is_admin column on profiles ────────────────
-- Grants platform-owner access to /admin. Defaults to false for
-- all users. Set manually in Supabase dashboard or via service key.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin-only SELECT policy: admins can read all profiles
-- (required for the User Management table in AdminDashboard)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
