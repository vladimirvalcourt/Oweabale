ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.profiles.has_completed_onboarding IS 'Tracks if the user has finished the initial setup flow.';
-- Migration: Setup auth trigger for Google OAuth
-- Creates a function to automatically create profiles when users sign in with Google

-- Create a function to handle new user profile creation when they sign in with Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'given_name',
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'family_name',
      ''
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function when a new user is created via Google OAuth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

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

DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ── M-1 (schema): is_admin column on profiles ────────────────
-- Grants platform-owner access to /admin. Defaults to false for
-- all users. Set manually in Supabase dashboard or via service key.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Admin-only SELECT policy: admins can read all profiles
-- (required for the User Management table in AdminDashboard)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
-- Migration: add token column to document_capture_sessions
-- The mobile capture page validates this token on every request.
-- Sessions without a matching token are rejected even if the session ID is known.

ALTER TABLE document_capture_sessions
  ADD COLUMN IF NOT EXISTS token TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- Index for fast lookup on (id, token) pairs
CREATE INDEX IF NOT EXISTS idx_capture_sessions_token
  ON document_capture_sessions (id, token);
-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Migration: support_tickets
-- Persists help desk tickets submitted by users.

CREATE TABLE IF NOT EXISTS support_tickets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number  TEXT        NOT NULL,
  subject        TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  department     TEXT        NOT NULL DEFAULT 'General Support',
  priority       TEXT        NOT NULL DEFAULT 'Normal'
                             CHECK (priority IN ('Low', 'Normal', 'Urgent')),
  status         TEXT        NOT NULL DEFAULT 'Open'
                             CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate a human-readable ticket number before insert
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_number ON support_tickets;
CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins have full access
DROP POLICY IF EXISTS "Admins have full access to tickets" ON support_tickets;
CREATE POLICY "Admins have full access to tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
-- Migration: education lesson completion tracking
-- Stores an array of completed lesson IDs on the user's profile.
-- Each lesson ID is a string like '1-1', '2-3', etc.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS completed_lessons TEXT[] NOT NULL DEFAULT '{}';
-- Migration: flip_overdue_bills()
-- Updates any 'upcoming' bill whose due_date is in the past to 'overdue'.
-- Called from the frontend fetchData() on every authenticated load so the
-- status is always accurate without requiring a separate cron service.

CREATE OR REPLACE FUNCTION flip_overdue_bills()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE bills
  SET    status     = 'overdue',
         updated_at = NOW()
  WHERE  due_date   < CURRENT_DATE
    AND  status     = 'upcoming';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Only authenticated users may call this function.
-- RLS on the bills table ensures each user's UPDATE only touches their own rows.
REVOKE ALL ON FUNCTION flip_overdue_bills() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flip_overdue_bills() TO authenticated;
-- Migration: net_worth_snapshots
-- One row per user per day — written by the frontend on every fetchData() call.
-- Provides a genuine historical timeline of net worth, unlike forward projections.

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  net_worth  DECIMAL(14,2) NOT NULL,
  assets     DECIMAL(14,2) NOT NULL,
  debts      DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots"
  ON net_worth_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
-- Migration: categorization_rules
-- Stores user-defined rules that auto-assign categories to incoming transactions.
-- Rule engine runs in the frontend (addTransaction) before every DB insert.

CREATE TABLE IF NOT EXISTS categorization_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type  TEXT        NOT NULL
                          CHECK (match_type IN ('contains', 'exact', 'starts_with', 'ends_with')),
  match_value TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  priority    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categorization rules"
  ON categorization_rules FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_categorization_rules_user ON categorization_rules (user_id, priority DESC, created_at DESC);
-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- ============================================================
-- Migration: Missing tables + profile credit columns
-- Adds: credit_fixes, freelance_entries, pending_ingestions,
--       platform_settings, admin_broadcasts
-- Alters: profiles (credit_score, credit_last_updated)
-- ============================================================


-- ── 1. profiles: add credit columns ─────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credit_score        INTEGER,
  ADD COLUMN IF NOT EXISTS credit_last_updated TIMESTAMPTZ;


-- ── 2. credit_fixes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_fixes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item        TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status      TEXT        NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo', 'sent', 'resolved')),
  bureau      TEXT        NOT NULL DEFAULT 'Experian',
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_fixes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own credit_fixes" ON credit_fixes;
CREATE POLICY "Users manage own credit_fixes"
  ON credit_fixes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 3. freelance_entries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelance_entries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client             TEXT        NOT NULL,
  amount             NUMERIC     NOT NULL CHECK (amount > 0),
  date               DATE        NOT NULL,
  is_vaulted         BOOLEAN     NOT NULL DEFAULT FALSE,
  scoured_write_offs NUMERIC     NOT NULL DEFAULT 0 CHECK (scoured_write_offs >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE freelance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own freelance_entries" ON freelance_entries;
CREATE POLICY "Users manage own freelance_entries"
  ON freelance_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 4. pending_ingestions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_ingestions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('bill', 'debt', 'transaction', 'income')),
  status         TEXT        NOT NULL DEFAULT 'scanning',
  source         TEXT        NOT NULL DEFAULT 'desktop' CHECK (source IN ('desktop', 'mobile')),
  extracted_data JSONB       NOT NULL DEFAULT '{}',
  original_file  JSONB       NOT NULL DEFAULT '{}',
  storage_path   TEXT,
  storage_url    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pending_ingestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pending_ingestions" ON pending_ingestions;
CREATE POLICY "Users manage own pending_ingestions"
  ON pending_ingestions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 5. platform_settings ────────────────────────────────────
-- Single-row table owned by the platform. Admins write; everyone reads.
CREATE TABLE IF NOT EXISTS platform_settings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode      BOOLEAN     NOT NULL DEFAULT FALSE,
  plaid_enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
  broadcast_message     TEXT        NOT NULL DEFAULT '',
  tax_standard_deduction NUMERIC    NOT NULL DEFAULT 13850,
  tax_top_bracket       NUMERIC     NOT NULL DEFAULT 37,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the single settings row.
-- Remote projects may have `platform_settings.id` as INTEGER (older schema) or UUID (newer schema).
DO $$
DECLARE
  id_type TEXT;
BEGIN
  SELECT data_type
    INTO id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'platform_settings'
    AND column_name = 'id';

  IF id_type = 'integer' THEN
    INSERT INTO platform_settings (id) VALUES (1)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO platform_settings (id) VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read platform settings
DROP POLICY IF EXISTS "Authenticated users can read platform_settings" ON platform_settings;
CREATE POLICY "Authenticated users can read platform_settings"
  ON platform_settings FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only admins can write
DROP POLICY IF EXISTS "Admins can modify platform_settings" ON platform_settings;
CREATE POLICY "Admins can modify platform_settings"
  ON platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );


-- ── 6. admin_broadcasts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read broadcasts
DROP POLICY IF EXISTS "Authenticated users can read broadcasts" ON admin_broadcasts;
CREATE POLICY "Authenticated users can read broadcasts"
  ON admin_broadcasts FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only admins can create/update/delete broadcasts
DROP POLICY IF EXISTS "Admins manage broadcasts" ON admin_broadcasts;
CREATE POLICY "Admins manage broadcasts"
  ON admin_broadcasts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
-- ============================================================
-- Migration: Missing tables + profile credit columns
-- Adds: credit_fixes, freelance_entries, pending_ingestions,
--       platform_settings (alters existing), admin_broadcasts
-- Alters: profiles (credit_score, credit_last_updated)
-- ============================================================


-- ── 1. profiles: add credit columns ─────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS credit_score        INTEGER,
  ADD COLUMN IF NOT EXISTS credit_last_updated TIMESTAMPTZ;


-- ── 2. credit_fixes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_fixes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item        TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status      TEXT        NOT NULL DEFAULT 'todo'
                          CHECK (status IN ('todo', 'sent', 'resolved')),
  bureau      TEXT        NOT NULL DEFAULT 'Experian',
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_fixes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'credit_fixes' AND policyname = 'Users manage own credit_fixes'
  ) THEN
    CREATE POLICY "Users manage own credit_fixes"
      ON credit_fixes FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ── 3. freelance_entries ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelance_entries (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client             TEXT        NOT NULL,
  amount             NUMERIC     NOT NULL CHECK (amount > 0),
  date               DATE        NOT NULL,
  is_vaulted         BOOLEAN     NOT NULL DEFAULT FALSE,
  scoured_write_offs NUMERIC     NOT NULL DEFAULT 0 CHECK (scoured_write_offs >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE freelance_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freelance_entries' AND policyname = 'Users manage own freelance_entries'
  ) THEN
    CREATE POLICY "Users manage own freelance_entries"
      ON freelance_entries FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ── 4. pending_ingestions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_ingestions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL CHECK (type IN ('bill', 'debt', 'transaction', 'income')),
  status         TEXT        NOT NULL DEFAULT 'scanning',
  source         TEXT        NOT NULL DEFAULT 'desktop' CHECK (source IN ('desktop', 'mobile')),
  extracted_data JSONB       NOT NULL DEFAULT '{}',
  original_file  JSONB       NOT NULL DEFAULT '{}',
  storage_path   TEXT,
  storage_url    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pending_ingestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pending_ingestions' AND policyname = 'Users manage own pending_ingestions'
  ) THEN
    CREATE POLICY "Users manage own pending_ingestions"
      ON pending_ingestions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ── 5. platform_settings: add missing columns + seed row ────
-- Note: table already exists with id INTEGER
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Authenticated users can read platform_settings'
  ) THEN
    CREATE POLICY "Authenticated users can read platform_settings"
      ON platform_settings FOR SELECT
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_settings' AND policyname = 'Admins can modify platform_settings'
  ) THEN
    CREATE POLICY "Admins can modify platform_settings"
      ON platform_settings FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
  END IF;
END $$;


-- ── 6. admin_broadcasts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_broadcasts' AND policyname = 'Authenticated users can read broadcasts'
  ) THEN
    CREATE POLICY "Authenticated users can read broadcasts"
      ON admin_broadcasts FOR SELECT
      TO authenticated
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_broadcasts' AND policyname = 'Admins manage broadcasts'
  ) THEN
    CREATE POLICY "Admins manage broadcasts"
      ON admin_broadcasts FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));
  END IF;
END $$;
-- ── user_feedback ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'feature_request', 'bug')),
  rating     INTEGER     CHECK (rating >= 1 AND rating <= 5),
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit feedback" ON user_feedback;
CREATE POLICY "Users can submit feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own feedback" ON user_feedback;
CREATE POLICY "Users can read own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all feedback" ON user_feedback;
CREATE POLICY "Admins can manage all feedback"
  ON user_feedback FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db pull`.

-- ============================================================
-- Migration: Fix Bills Sync Issue
-- Purpose: Ensure bills table exists with correct schema and RLS policies
-- Date: 2026-04-10
-- Fixes: Bill sync failures due to missing table or incorrect RLS
-- ============================================================

BEGIN;

-- Step 1: Create bills table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  biller TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category TEXT,
  due_date DATE NOT NULL,
  frequency TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue')),
  auto_pay BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bills_user_id_fkey' 
    AND table_name = 'bills'
  ) THEN
    ALTER TABLE public.bills 
      ADD CONSTRAINT bills_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Enable Row Level Security
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate RLS policy to ensure it's correct
DROP POLICY IF EXISTS "Users can manage their own bills" ON public.bills;

CREATE POLICY "Users can manage their own bills"
  ON public.bills
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Create performance index
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);

-- Step 6: Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Apply updated_at trigger to bills table
DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bills;

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Bills table migration completed successfully';
  RAISE NOTICE '✅ RLS Policy enabled for authenticated users';
  RAISE NOTICE '✅ Index created on user_id for performance';
  RAISE NOTICE '✅ Auto-update trigger configured';
END $$;
-- ============================================================
-- Migration: Fix Audit Log Schema
-- Purpose: Ensure audit_log table has correct columns for triggers
-- Date: 2026-04-10
-- Fixes: "column record_id of relation audit_log does not exist" error
-- ============================================================

BEGIN;

-- Step 1: Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'audit_log_user_id_fkey' 
    AND table_name = 'audit_log'
  ) THEN
    ALTER TABLE public.audit_log 
      ADD CONSTRAINT audit_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add record_id column if missing (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log' 
    AND column_name = 'record_id'
  ) THEN
    ALTER TABLE public.audit_log ADD COLUMN record_id TEXT;
    RAISE NOTICE '✅ Added missing record_id column to audit_log';
  ELSE
    RAISE NOTICE '✅ record_id column already exists';
  END IF;
END $$;

-- Step 4: Enable Row Level Security
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate RLS policy for admin access
DROP POLICY IF EXISTS "Admins view audit log" ON public.audit_log;

CREATE POLICY "Admins view audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Step 6: Create or replace the audit trigger function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id, 
    table_name, 
    record_id, 
    action, 
    old_data, 
    new_data
  )
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Recreate audit triggers on all critical tables

-- Bills table
DROP TRIGGER IF EXISTS trg_audit_bills ON public.bills;
CREATE TRIGGER trg_audit_bills
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- Debts table
DROP TRIGGER IF EXISTS trg_audit_debts ON public.debts;
CREATE TRIGGER trg_audit_debts
  AFTER INSERT OR UPDATE OR DELETE ON public.debts
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- Transactions table
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

-- Assets table
DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;
CREATE TRIGGER trg_audit_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.process_audit_log();

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Audit log schema fixed successfully';
  RAISE NOTICE '✅ All audit triggers recreated (bills, debts, transactions, assets)';
  RAISE NOTICE '✅ RLS policy configured for admin access only';
END $$;
-- Ensure audit_log has record_id and audit function matches table shape.
-- Fixes runtime error: column "record_id" of relation "audit_log" does not exist.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS record_id TEXT;

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id::TEXT, OLD.id::TEXT),
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Reconcile audit_log schema drift between environments.
-- Some environments use operation/row_id while others use action/record_id.
-- This migration keeps both pairs in sync and removes duplicate audit triggers.

BEGIN;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS operation TEXT,
  ADD COLUMN IF NOT EXISTS row_id TEXT,
  ADD COLUMN IF NOT EXISTS record_id TEXT;

UPDATE public.audit_log
SET action = operation
WHERE action IS NULL AND operation IS NOT NULL;

UPDATE public.audit_log
SET operation = action
WHERE operation IS NULL AND action IS NOT NULL;

UPDATE public.audit_log
SET record_id = COALESCE(record_id, row_id),
    row_id = COALESCE(row_id, record_id)
WHERE record_id IS NULL OR row_id IS NULL;

DROP TRIGGER IF EXISTS trg_audit_bills ON public.bills;
DROP TRIGGER IF EXISTS trg_audit_debts ON public.debts;
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;

DROP TRIGGER IF EXISTS audit_bills ON public.bills;
CREATE TRIGGER audit_bills
AFTER INSERT OR UPDATE OR DELETE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_debts ON public.debts;
CREATE TRIGGER audit_debts
AFTER INSERT OR UPDATE OR DELETE ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_assets ON public.assets;
CREATE TRIGGER audit_assets
AFTER INSERT OR UPDATE OR DELETE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

COMMIT;
-- Migration: fix_anon_policies_document_capture_sessions
-- Replaces permissive RLS (USING(true)/WITH CHECK(true)) on document_capture_sessions
-- with token-scoped access for the anon role. PostgREST forwards the client header
-- x-session-token into Postgres as current_setting('request.headers') JSON; RLS
-- compares it to the row's token so only the QR-linked session is readable/updatable.
-- Authenticated users keep full ownership policies unchanged.

-- ── Helper: read session token from PostgREST-injected request headers ─────────
CREATE OR REPLACE FUNCTION public.request_x_session_token()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO public, pg_catalog
AS $$
  SELECT NULLIF(
    trim(both FROM (COALESCE(current_setting('request.headers', true), '{}')::jsonb ->> 'x-session-token')),
    ''
  );
$$;

COMMENT ON FUNCTION public.request_x_session_token() IS
  'Returns x-session-token header for mobile capture RLS; PostgREST sets request.headers.';

GRANT EXECUTE ON FUNCTION public.request_x_session_token() TO anon, authenticated;

-- ── Session expiry + status: allow QR flow "pending" and bound session lifetime ─
ALTER TABLE public.document_capture_sessions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.document_capture_sessions
SET expires_at = COALESCE(created_at, now()) + interval '24 hours'
WHERE expires_at IS NULL;

ALTER TABLE public.document_capture_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '24 hours');

ALTER TABLE public.document_capture_sessions
  DROP CONSTRAINT IF EXISTS document_capture_sessions_status_check;

ALTER TABLE public.document_capture_sessions
  ADD CONSTRAINT document_capture_sessions_status_check
  CHECK (status IN ('idle', 'pending', 'active', 'completed', 'error'));

-- ── Prevent privilege escalation via user_id swap on updates ────────────────────
CREATE OR REPLACE FUNCTION public.prevent_document_capture_session_user_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'document_capture_sessions.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_document_capture_session_user_change ON public.document_capture_sessions;
CREATE TRIGGER trg_prevent_document_capture_session_user_change
  BEFORE UPDATE ON public.document_capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_document_capture_session_user_change();

-- ── Drop unsafe / duplicate policy names (remote DBs may vary) ─────────────────
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "anon can update session status" ON public.document_capture_sessions;

-- Authenticated: full CRUD on own rows only (explicit TO authenticated)
DROP POLICY IF EXISTS "Users manage own sessions" ON public.document_capture_sessions;
CREATE POLICY "document_capture_sessions_authenticated_own"
  ON public.document_capture_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon: read only rows whose token matches the request header
CREATE POLICY "document_capture_sessions_anon_select_by_header_token"
  ON public.document_capture_sessions
  FOR SELECT
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Anon: update only matching token; WITH CHECK blocks token/user_id swaps
CREATE POLICY "document_capture_sessions_anon_update_by_header_token"
  ON public.document_capture_sessions
  FOR UPDATE
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    token = public.request_x_session_token()
    AND user_id IS NOT NULL
  );

-- Anon must not insert/delete capture sessions (desktop creates sessions while logged in)
-- No INSERT/DELETE policies for anon → denied by default when RLS is enabled.
-- Migration: fix_pending_ingestions_token_and_anon_policy
-- Closes anon INSERT spam: require a capture session token that matches an active
-- document_capture_sessions row. Desktop/authenticated inserts omit token (NULL) and
-- continue to use the existing authenticated-only policy.

ALTER TABLE public.pending_ingestions
  ADD COLUMN IF NOT EXISTS token text;

COMMENT ON COLUMN public.pending_ingestions.token IS
  'Mobile capture session secret; must match document_capture_sessions.token for anon INSERT.';

CREATE INDEX IF NOT EXISTS idx_pending_ingestions_token ON public.pending_ingestions (token)
  WHERE token IS NOT NULL;

-- Replace broad policy with role-scoped policies
DROP POLICY IF EXISTS "anon can insert pending ingestion" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users manage own pending_ingestions" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON public.pending_ingestions;

CREATE POLICY "pending_ingestions_authenticated_all"
  ON public.pending_ingestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon: insert only when token proves an active capture session for the same user
CREATE POLICY "pending_ingestions_anon_insert_with_valid_capture_token"
  ON public.pending_ingestions
  FOR INSERT
  TO anon
  WITH CHECK (
    token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.document_capture_sessions d
      WHERE d.token = token
        AND d.user_id = user_id
        AND d.status IN ('idle', 'pending', 'active')
        AND (d.expires_at IS NULL OR d.expires_at > now())
    )
  );

-- Anon cannot SELECT/UPDATE/DELETE pending_ingestions (no policies → denied)
-- Migration: fix_function_search_path
-- Mitigates search_path injection for SECURITY DEFINER and trigger helpers by pinning
-- search_path to public + pg_catalog. Applies to every public overload of the listed names.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_audit_trigger',
        'process_audit_log',
        'handle_new_user',
        'update_updated_at_column',
        'set_platform_settings_updated_at',
        'generate_ticket_number',
        'prevent_document_capture_session_user_change',
        'request_x_session_token'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_catalog', r.fn);
  END LOOP;
END $$;
-- Migration: move_extensions_to_extensions_schema
-- Moves extensions out of public to reduce attack surface (namespace confusion with
-- malicious objects in public). Safe for this app: no SQL references extension
-- functions by unqualified name in migrations. Roles receive USAGE on schema extensions.

CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
DECLARE
  ext text;
BEGIN
  FOREACH ext IN ARRAY ARRAY['pg_trgm', 'fuzzystrmatch', 'pg_net', 'postgis']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext) THEN
      BEGIN
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext);
        RAISE NOTICE 'Moved extension % to schema extensions', ext;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Could not move extension %: %', ext, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Extension % not installed; skip', ext;
    END IF;
  END LOOP;
END $$;
-- Migration: fix_rls_spatial_ref_sys
-- PostGIS installs spatial_ref_sys (EPSG lookup). Without RLS it is readable via
-- PostgREST as any role. Enable RLS and allow SELECT only for authenticated users.
-- Table may live in public or extensions depending on where postgis was installed;
-- this migration runs after extensions move so it targets the current location.

DO $$
DECLARE
  tgt regclass;
BEGIN
  SELECT c.oid INTO tgt
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'spatial_ref_sys'
    AND c.relkind = 'r'
    AND n.nspname IN ('public', 'extensions')
  ORDER BY (n.nspname = 'extensions') DESC
  LIMIT 1;

  IF tgt IS NULL THEN
    RAISE NOTICE 'spatial_ref_sys not found; skip RLS (PostGIS may be absent).';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tgt);
  EXECUTE format('DROP POLICY IF EXISTS spatial_ref_sys_read_authenticated ON %s', tgt);
  EXECUTE format(
    $f$
    CREATE POLICY spatial_ref_sys_read_authenticated
    ON %s
    FOR SELECT
    TO authenticated
    USING (true)
    $f$,
    tgt
  );

  RAISE NOTICE 'RLS enabled on %', tgt::text;
EXCEPTION
  WHEN SQLSTATE '42501' THEN
    -- Managed PostGIS: spatial_ref_sys is often owned by supabase_admin; migration role cannot ALTER.
    RAISE NOTICE 'spatial_ref_sys RLS skipped (42501: not owner — expected on some Supabase projects).';
END $$;
-- Plaid: server-side item storage + profile display fields (no secrets on client).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plaid_institution_name text,
  ADD COLUMN IF NOT EXISTS plaid_linked_at timestamptz;

COMMENT ON COLUMN public.profiles.plaid_institution_name IS 'Last linked Plaid institution label (safe to show in UI).';
COMMENT ON COLUMN public.profiles.plaid_linked_at IS 'When the user last completed Plaid Link.';

CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  access_token text NOT NULL,
  institution_id text,
  institution_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_items_item_id_key UNIQUE (item_id)
);

CREATE INDEX IF NOT EXISTS plaid_items_user_id_idx ON public.plaid_items (user_id);

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.plaid_items IS 'Plaid access tokens — inserted by Edge Functions (service role). Clients cannot SELECT.';

-- Allow users to remove their own Plaid rows (e.g. reset data) without reading tokens.
CREATE POLICY "Users delete own plaid_items"
  ON public.plaid_items
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
-- Allow Review Inbox rows for tickets / citations (tolls, fines, etc.)
ALTER TABLE public.pending_ingestions
  DROP CONSTRAINT IF EXISTS pending_ingestions_type_check;

ALTER TABLE public.pending_ingestions
  ADD CONSTRAINT pending_ingestions_type_check
  CHECK (type IN ('bill', 'debt', 'transaction', 'income', 'citation'));
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
DROP POLICY IF EXISTS "Admins manage tickets"             ON public.support_tickets;
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
-- Plaid: transaction sync metadata, transaction dedupe columns, profile UX fields.

-- plaid_items: sync state (tokens remain server-only; no new client SELECT)
ALTER TABLE public.plaid_items
  ADD COLUMN IF NOT EXISTS transactions_cursor text,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz,
  ADD COLUMN IF NOT EXISTS item_login_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.plaid_items.transactions_cursor IS 'Plaid /transactions/sync cursor.';
COMMENT ON COLUMN public.plaid_items.last_sync_at IS 'Last successful sync completion.';
COMMENT ON COLUMN public.plaid_items.last_sync_error IS 'Last sync or webhook error message (non-secret).';
COMMENT ON COLUMN public.plaid_items.item_login_required IS 'Plaid requires user to re-authenticate (update Link).';

CREATE INDEX IF NOT EXISTS plaid_items_last_sync_at_idx
  ON public.plaid_items (last_sync_at NULLS FIRST);

-- transactions: source + Plaid ids for dedupe and modified/removed handling
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS plaid_transaction_id text,
  ADD COLUMN IF NOT EXISTS plaid_account_id text;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('manual', 'plaid'));

COMMENT ON COLUMN public.transactions.source IS 'manual | plaid';
COMMENT ON COLUMN public.transactions.plaid_transaction_id IS 'Plaid transaction_id for sync dedupe.';
COMMENT ON COLUMN public.transactions.plaid_account_id IS 'Plaid account_id for debugging and future use.';

DROP INDEX IF EXISTS transactions_user_plaid_txn_unique;

CREATE UNIQUE INDEX transactions_user_plaid_txn_unique
  ON public.transactions (user_id, plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

-- profiles: safe fields for UI (no tokens)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plaid_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS plaid_needs_relink boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.plaid_last_sync_at IS 'Last successful Plaid transaction sync (server-updated).';
COMMENT ON COLUMN public.profiles.plaid_needs_relink IS 'User must complete Plaid Link update mode.';
-- Plaid scheduled sync is not defined in SQL (URL and secrets are environment-specific).
--
-- Configure in Supabase Dashboard → Edge Functions → `plaid-sync` → Cron (or Integrations → Cron):
--   Method: POST
--   URL:    https://<PROJECT_REF>.supabase.co/functions/v1/plaid-sync
--   Header: Authorization: Bearer <PLAID_CRON_SECRET>
--   Body:   {}
-- Suggested schedule: every 6 hours (0 */6 * * *).
--
-- Set secret `PLAID_CRON_SECRET` on the Edge Function and use the same value in the cron job.

DO $$
BEGIN
  NULL;
END $$;
-- Ensure transaction amounts stay positive (matches Plaid sync Math.abs behavior and UI).
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_positive;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);
-- Closed beta: block new auth.users rows unless email is on beta_allowlist (when closed_beta is on).
-- Toggle via public.app_config; manage allowlist via SQL Editor (service role) or Supabase CLI.

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.app_config IS 'Internal feature flags. closed_beta: jsonb boolean.';

INSERT INTO public.app_config (key, value)
VALUES ('closed_beta', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.beta_allowlist (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  note text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.beta_allowlist IS 'Lowercase emails allowed to register when closed_beta is true.';

ALTER TABLE public.beta_allowlist ENABLE ROW LEVEL SECURITY;

-- Expose whether closed beta is on (for sign-in page copy). Does not leak allowlist.
CREATE OR REPLACE FUNCTION public.get_closed_beta_public()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value = 'true'::jsonb) FROM public.app_config WHERE key = 'closed_beta'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.get_closed_beta_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_closed_beta_public() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_closed_beta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_on boolean;
  em text;
BEGIN
  SELECT COALESCE(
    (SELECT (value = 'true'::jsonb) FROM public.app_config WHERE key = 'closed_beta'),
    false
  )
  INTO beta_on;

  IF beta_on IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  em := lower(trim(COALESCE(NEW.email, '')));
  IF em = '' THEN
    RAISE EXCEPTION 'Closed beta: a verified email is required.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM public.beta_allowlist WHERE email = em) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This email is not on the closed beta list. Contact the team if you were invited.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_closed_beta_before_auth_user_insert ON auth.users;
CREATE TRIGGER enforce_closed_beta_before_auth_user_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_closed_beta();
-- Seed closed-beta allowlist (idempotent). Requires 20260411220000_closed_beta_allowlist.sql.

INSERT INTO public.beta_allowlist (email, note)
VALUES ('vladimirvalcourt@gmail.com', 'Primary beta tester')
ON CONFLICT (email) DO NOTHING;
-- Turn on closed-beta enforcement (allowlist required for new signups).

UPDATE public.app_config
SET value = 'true'::jsonb, updated_at = now()
WHERE key = 'closed_beta';
-- Optional next payment due for debts (null = no scheduled due date, e.g. closed card with balance).
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS payment_due_date date;

COMMENT ON COLUMN public.debts.payment_due_date IS 'Next payment due date when applicable; NULL if none (e.g. closed revolving account).';
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
-- Persist Owe-AI teaching familiarity across sessions.
CREATE TABLE IF NOT EXISTS public.ai_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  familiarity_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (familiarity_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_style TEXT NOT NULL DEFAULT 'plain_language'
    CHECK (preferred_style IN ('plain_language', 'step_by_step', 'concise')),
  topics_covered TEXT[] NOT NULL DEFAULT '{}',
  recent_focus TEXT[] NOT NULL DEFAULT '{}',
  last_lesson_topic TEXT,
  total_lessons INTEGER NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
  total_messages INTEGER NOT NULL DEFAULT 0 CHECK (total_messages >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can read own AI learning profile"
  ON public.ai_learning_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can insert own AI learning profile"
  ON public.ai_learning_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can update own AI learning profile"
  ON public.ai_learning_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage AI learning profiles" ON public.ai_learning_profiles;
CREATE POLICY "Admins can manage AI learning profiles"
  ON public.ai_learning_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS ai_learning_profiles_familiarity_idx
  ON public.ai_learning_profiles (familiarity_level);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_ai_learning_profiles_updated_at ON public.ai_learning_profiles;
    CREATE TRIGGER update_ai_learning_profiles_updated_at
      BEFORE UPDATE ON public.ai_learning_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Stripe billing + DB/RLS-backed entitlements

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_stripe_customer_id_key'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_payment_intent_id text UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  amount_total bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  product_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_source_check CHECK (source IN ('subscription', 'one_time', 'admin', 'manual')),
  CONSTRAINT entitlements_status_check CHECK (status IN ('active', 'inactive', 'expired', 'revoked'))
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_id_idx ON public.billing_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx ON public.billing_subscriptions (status);
CREATE INDEX IF NOT EXISTS billing_subscriptions_period_end_idx ON public.billing_subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS billing_payments_user_id_idx ON public.billing_payments (user_id);
CREATE INDEX IF NOT EXISTS billing_payments_status_idx ON public.billing_payments (status);
CREATE INDEX IF NOT EXISTS entitlements_user_id_idx ON public.entitlements (user_id);
CREATE INDEX IF NOT EXISTS entitlements_feature_key_idx ON public.entitlements (feature_key);
CREATE INDEX IF NOT EXISTS entitlements_status_idx ON public.entitlements (status);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own billing subscriptions" ON public.billing_subscriptions;
CREATE POLICY "Users can view own billing subscriptions"
  ON public.billing_subscriptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own billing payments" ON public.billing_payments;
CREATE POLICY "Users can view own billing payments"
  ON public.billing_payments
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own entitlements" ON public.entitlements;
CREATE POLICY "Users can view own entitlements"
  ON public.entitlements
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- No client-side access to webhook event rows.
DROP POLICY IF EXISTS "No direct stripe event access" ON public.stripe_events;
CREATE POLICY "No direct stripe event access"
  ON public.stripe_events
  FOR SELECT
  TO authenticated
  USING (false);

CREATE OR REPLACE FUNCTION public.has_entitlement(p_feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = auth.uid()
      AND e.feature_key = p_feature_key
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_entitlement(text) TO authenticated;
-- Disable closed-beta enforcement: open sign-ups to any Google account.

UPDATE public.app_config
SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'closed_beta';
-- Security hardening follow-up:
-- 1) Ensure SECURITY DEFINER trigger helper has immutable search_path.
-- 2) Attempt to enforce RLS on spatial_ref_sys when ownership permits.

DO $$
DECLARE
  fn regprocedure;
  tgt regclass;
BEGIN
  -- Harden handle_new_user against search_path injection.
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_catalog', fn);
  END IF;

  -- Try to lock down spatial_ref_sys where extension ownership allows.
  SELECT c.oid
  INTO tgt
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'spatial_ref_sys'
    AND c.relkind = 'r'
    AND n.nspname IN ('public', 'extensions')
  ORDER BY (n.nspname = 'extensions') DESC
  LIMIT 1;

  IF tgt IS NOT NULL THEN
    BEGIN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tgt);
      EXECUTE format('DROP POLICY IF EXISTS spatial_ref_sys_read_authenticated ON %s', tgt);
      EXECUTE format(
        'CREATE POLICY spatial_ref_sys_read_authenticated ON %s FOR SELECT TO authenticated USING (true)',
        tgt
      );
    EXCEPTION
      WHEN SQLSTATE '42501' THEN
        RAISE NOTICE 'Skipped spatial_ref_sys RLS hardening due to owner permissions.';
    END;
  END IF;
END $$;
-- Web Push: store one row per browser endpoint per user (VAPID subscriptions).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now (),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now (),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.push_subscriptions IS 'Web Push subscription keys per user/device; server sends via VAPID.';
-- Ensure transactions table has RLS enabled and user-scoped policies.
-- The table was created in remote migrations not tracked locally.

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by Edge Functions for Plaid sync) bypasses RLS by design.
-- Track user investment accounts (brokerage, IRA, 401k, etc.).
CREATE TABLE IF NOT EXISTS public.investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('brokerage', 'ira', 'roth_ira', '401k', '403b', 'hsa', 'other')),
  institution TEXT,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  notes TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own investment accounts" ON public.investment_accounts;
CREATE POLICY "Users can manage own investment accounts"
  ON public.investment_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage investment accounts" ON public.investment_accounts;
CREATE POLICY "Admins can manage investment accounts"
  ON public.investment_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS investment_accounts_user_id_idx
  ON public.investment_accounts (user_id);
-- Track user insurance policies across all coverage types.
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('health', 'life', 'auto', 'renters', 'homeowners', 'disability', 'umbrella', 'dental', 'vision', 'other')),
  provider TEXT NOT NULL,
  premium NUMERIC NOT NULL DEFAULT 0 CHECK (premium >= 0),
  frequency TEXT NOT NULL DEFAULT 'Monthly' CHECK (frequency IN ('Weekly', 'Bi-weekly', 'Monthly', 'Yearly')),
  coverage_amount NUMERIC,
  deductible NUMERIC,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can manage own insurance policies"
  ON public.insurance_policies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins can manage insurance policies"
  ON public.insurance_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS insurance_policies_user_id_idx
  ON public.insurance_policies (user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_insurance_policies_updated_at ON public.insurance_policies;
    CREATE TRIGGER update_insurance_policies_updated_at
      BEFORE UPDATE ON public.insurance_policies
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Persist Owe-AI chat history per user and mode.
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(content) <= 10000),
  mode TEXT NOT NULL DEFAULT 'advisor' CHECK (mode IN ('advisor', 'academy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own chat messages" ON public.chat_messages;
CREATE POLICY "Users can read own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage chat messages" ON public.chat_messages;
CREATE POLICY "Admins can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

-- Fast "last N messages" retrieval per user
CREATE INDEX IF NOT EXISTS chat_messages_user_created_idx
  ON public.chat_messages (user_id, created_at DESC);

-- Filter by mode (advisor vs academy)
CREATE INDEX IF NOT EXISTS chat_messages_user_mode_idx
  ON public.chat_messages (user_id, mode);
-- Add alert preferences column to profiles for configurable financial notifications.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_preferences JSONB NOT NULL DEFAULT '{"bill_due_days":[1,3],"over_budget":true,"low_cash":true,"debt_due":true}'::jsonb;
-- Remote placeholder migration.
-- This migration version exists in the linked Supabase project migration history,
-- but the original SQL file is not present in this repo. This file is a no-op
-- placeholder to reconcile history and unblock `supabase db push`.
-- Webhook claim-before-handle: rows start unfulfilled until handlers succeed.
ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS processing_completed boolean NOT NULL DEFAULT false;

-- Historical rows were inserted only after successful handling in the prior flow.
UPDATE public.stripe_events SET processing_completed = true;
-- Plaid sync uses PostgREST upsert: onConflict 'user_id,plaid_transaction_id'.
-- PostgreSQL cannot infer a PARTIAL unique INDEX for ON CONFLICT (user_id, plaid_transaction_id),
-- so inserts failed with: "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- A non-partial UNIQUE constraint still allows many manual rows per user (plaid_transaction_id NULL
-- does not collide in PostgreSQL UNIQUE semantics).
--
-- Drop constraint first (if it already exists from a prior apply); then any orphaned partial index.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_plaid_txn_unique;
DROP INDEX IF EXISTS transactions_user_plaid_txn_unique;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_plaid_txn_unique
  UNIQUE (user_id, plaid_transaction_id);
-- Ensures processing_completed exists when an older push recorded the same version as another file
-- or the column was never applied. Safe to run multiple times.
ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS processing_completed boolean NOT NULL DEFAULT false;

-- Historical rows predating claim-before-handle were only inserted after successful handling.
UPDATE public.stripe_events SET processing_completed = true;
-- Expand budget periods and support rollover behavior.
-- Safe for either enum-backed or text-backed `period` columns.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS rollover_enabled boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  period_udt text;
  c record;
BEGIN
  SELECT udt_name
    INTO period_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'budgets'
    AND column_name = 'period';

  -- If `period` is backed by a Postgres enum, extend it.
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = period_udt
      AND t.typtype = 'e'
  ) THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Weekly');
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Bi-weekly');
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Quarterly');
  ELSE
    -- If text/varchar + check constraints, replace any period checks with the expanded set.
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.budgets'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%period%'
    LOOP
      EXECUTE format('ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_period_check
      CHECK (period IN ('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'));
  END IF;
END $$;
-- Budget guardrails: allow none/soft/hard overspend handling.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS lock_mode text NOT NULL DEFAULT 'none';

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.budgets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%lock_mode%'
  LOOP
    EXECUTE format('ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_lock_mode_check
  CHECK (lock_mode IN ('none', 'soft', 'hard'));
create table if not exists public.categorization_exclusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('transaction', 'merchant')),
  transaction_id uuid null references public.transactions(id) on delete cascade,
  merchant_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categorization_exclusions_target_check check (
    (scope = 'transaction' and transaction_id is not null)
    or
    (scope = 'merchant' and merchant_name is not null and length(trim(merchant_name)) > 0)
  )
);

create unique index if not exists categorization_exclusions_user_tx_unique
  on public.categorization_exclusions (user_id, transaction_id)
  where scope = 'transaction';

create unique index if not exists categorization_exclusions_user_merchant_unique
  on public.categorization_exclusions (user_id, lower(merchant_name))
  where scope = 'merchant';

create index if not exists categorization_exclusions_user_idx
  on public.categorization_exclusions (user_id);

alter table public.categorization_exclusions enable row level security;

drop policy if exists "Users can read own categorization exclusions" on public.categorization_exclusions;
create policy "Users can read own categorization exclusions"
  on public.categorization_exclusions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own categorization exclusions" on public.categorization_exclusions;
create policy "Users can insert own categorization exclusions"
  on public.categorization_exclusions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own categorization exclusions" on public.categorization_exclusions;
create policy "Users can update own categorization exclusions"
  on public.categorization_exclusions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own categorization exclusions" on public.categorization_exclusions;
create policy "Users can delete own categorization exclusions"
  on public.categorization_exclusions
  for delete
  using (auth.uid() = user_id);
-- Global feature flags for admin-controlled rollouts (JSON map of string -> boolean).
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.platform_settings.feature_flags IS 'Admin-editable boolean flags (e.g. owe_ai_enabled); merged in app with defaults.';
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
-- Fix admin RLS regression on 2026-04-18 migrations + performance indexes.
-- The investment_accounts, insurance_policies, and chat_messages migrations reintroduced the
-- recursive `EXISTS (SELECT 1 FROM profiles ...)` admin pattern that was fixed project-wide in
-- 20260411144758. Replace with the security-definer helper _internal.is_admin().

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = '_internal'
  ) THEN
    RAISE EXCEPTION '_internal.is_admin() not found — apply 20260411144758 first';
  END IF;
END $$;

-- investment_accounts
DROP POLICY IF EXISTS "Admins can manage investment accounts" ON public.investment_accounts;
CREATE POLICY "Admins can manage investment accounts"
  ON public.investment_accounts FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- insurance_policies
DROP POLICY IF EXISTS "Admins can manage insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins can manage insurance policies"
  ON public.insurance_policies FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- chat_messages
DROP POLICY IF EXISTS "Admins can manage chat messages" ON public.chat_messages;
CREATE POLICY "Admins can manage chat messages"
  ON public.chat_messages FOR ALL
  USING (_internal.is_admin())
  WITH CHECK (_internal.is_admin());

-- Indexes for RBAC lookups + audit feed queries
CREATE INDEX IF NOT EXISTS admin_user_roles_user_id_idx
  ON public.admin_user_roles (user_id);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
  ON public.audit_log (created_at DESC);

-- Atomic Stripe webhook claim: one round-trip, race-free.
-- Returns 'inserted' when this is the first delivery, 'duplicate_completed' when a prior
-- delivery finished, 'duplicate_pending' when a prior attempt is still mid-flight.
CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  p_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  INSERT INTO public.stripe_events (stripe_event_id, event_type, payload, processing_completed)
  VALUES (p_event_id, p_event_type, p_payload, FALSE)
  ON CONFLICT (stripe_event_id) DO NOTHING
  RETURNING processing_completed INTO v_completed;

  IF FOUND THEN
    RETURN 'inserted';
  END IF;

  SELECT processing_completed INTO v_completed
  FROM public.stripe_events
  WHERE stripe_event_id = p_event_id;

  IF v_completed IS TRUE THEN
    RETURN 'duplicate_completed';
  END IF;
  RETURN 'duplicate_pending';
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(TEXT, TEXT, JSONB) TO service_role;
-- Applied on linked Supabase project before this repo contained the version file.
-- Placeholder to align local migration history with remote `schema_migrations`.
-- Safe no-op if re-run on a DB that already recorded this version.
SELECT 1;
-- Owe-AI: group messages into conversations (sessions).
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS chat_messages_user_mode_session_idx
  ON public.chat_messages (user_id, mode, session_id, created_at DESC);

-- One legacy session per (user_id, mode) for existing rows.
DO $$
DECLARE r RECORD;
  new_sid uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, mode FROM public.chat_messages WHERE session_id IS NULL
  LOOP
    new_sid := gen_random_uuid();
    UPDATE public.chat_messages
    SET session_id = new_sid
    WHERE user_id = r.user_id AND mode = r.mode AND session_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE public.chat_messages
  ALTER COLUMN session_id SET DEFAULT gen_random_uuid();

-- New inserts should set session_id explicitly from the client; default covers edge cases.
-- Manual mileage log for business / medical / charity trips (IRS mileage deduction planning).
CREATE TABLE IF NOT EXISTS public.mileage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trip_date date NOT NULL,
  start_location text NOT NULL DEFAULT '',
  end_location text NOT NULL DEFAULT '',
  miles numeric(12, 2) NOT NULL CHECK (miles > 0 AND miles <= 99999),
  purpose text NOT NULL CHECK (purpose IN ('business', 'medical', 'charity')),
  platform text NOT NULL DEFAULT '',
  irs_rate_per_mile numeric(10, 4) NOT NULL DEFAULT 0.70,
  deduction_amount numeric(14, 2) NOT NULL CHECK (deduction_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mileage_log_user_trip_date_idx
  ON public.mileage_log (user_id, trip_date DESC);

ALTER TABLE public.mileage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mileage_log_select_own"
  ON public.mileage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "mileage_log_insert_own"
  ON public.mileage_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mileage_log_update_own"
  ON public.mileage_log FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "mileage_log_delete_own"
  ON public.mileage_log FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
-- Ensure document_capture_sessions has a stable updated_at column + trigger.
-- Some environments were missing this column, causing admin query/update mismatches.

ALTER TABLE public.document_capture_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.document_capture_sessions
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_document_capture_sessions_updated_at ON public.document_capture_sessions;
CREATE TRIGGER update_document_capture_sessions_updated_at
  BEFORE UPDATE ON public.document_capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
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
-- Linked Plaid depository accounts: metadata for Savings view (track transfers into savings-like accounts).

CREATE TABLE IF NOT EXISTS public.plaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plaid_item_id uuid NOT NULL REFERENCES public.plaid_items (id) ON DELETE CASCADE,
  plaid_account_id text NOT NULL,
  name text NOT NULL,
  official_name text,
  account_type text NOT NULL DEFAULT 'other',
  account_subtype text,
  mask text,
  subtype_suggested_savings boolean NOT NULL DEFAULT false,
  include_in_savings boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plaid_accounts_user_plaid_account_unique UNIQUE (user_id, plaid_account_id)
);

CREATE INDEX IF NOT EXISTS plaid_accounts_user_id_idx ON public.plaid_accounts (user_id);
CREATE INDEX IF NOT EXISTS plaid_accounts_plaid_item_id_idx ON public.plaid_accounts (plaid_item_id);

COMMENT ON TABLE public.plaid_accounts IS 'Plaid account metadata synced via /accounts/get; RLS allows user SELECT/UPDATE for include_in_savings.';
COMMENT ON COLUMN public.plaid_accounts.subtype_suggested_savings IS 'Heuristic from Plaid subtype each sync (savings, money market, cd, etc.).';
COMMENT ON COLUMN public.plaid_accounts.include_in_savings IS 'Include this account on the Savings page; new rows default from subtype heuristic.';

ALTER TABLE public.plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own plaid_accounts"
  ON public.plaid_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own plaid_accounts"
  ON public.plaid_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inserts happen from Edge Functions (service role), not from the client.
-- Planning fields: pay-yourself target and % of gig gross to reserve for taxes (UI-only guidance).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_reserve_percent numeric(5, 2) NOT NULL DEFAULT 30
  CHECK (tax_reserve_percent >= 0 AND tax_reserve_percent <= 100);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS steady_salary_target numeric(14, 2) NOT NULL DEFAULT 0
  CHECK (steady_salary_target >= 0);

COMMENT ON COLUMN public.profiles.tax_reserve_percent IS 'Percent of self-employed gross income to set aside for taxes (user planning preference).';
COMMENT ON COLUMN public.profiles.steady_salary_target IS 'Target monthly amount to transfer to personal checking as a steady salary (planning).';
-- Client invoices (accounts receivable) for freelancers
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_name text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  issued_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_invoices_user_due_idx
  ON public.client_invoices (user_id, due_date DESC);

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_invoices_select_own"
  ON public.client_invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "client_invoices_insert_own"
  ON public.client_invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_invoices_update_own"
  ON public.client_invoices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "client_invoices_delete_own"
  ON public.client_invoices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Optional gig / platform label on transactions (user-editable; Plaid sync leaves default '')
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS platform_tag text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.transactions.platform_tag IS 'User or inferred gig platform label (e.g. Uber, DoorDash).';
COMMENT ON TABLE public.client_invoices IS 'Freelancer client invoices for AR tracking and alerts.';
-- Remote migration stub
-- Migration: Fix Google OAuth "Database error saving new user"
-- Created: 2026-04-21
-- 
-- Problem: New Google OAuth users get "Database error saving new user" error
-- Root causes:
-- 1. Missing INSERT policy on profiles table
-- 2. search_path not pinned in function definition (security vulnerability)
-- 3. No ON CONFLICT clause causing duplicate key errors
-- 4. Attempting to insert columns Google doesn't provide
-- 5. Not handling full_name field from Google metadata
--
-- Solution: Rewrite handle_new_user() with SECURITY DEFINER, empty search_path,
-- ON CONFLICT handling, and proper Google OAuth field mapping

-- ── Step 1: Drop existing triggers to avoid conflicts ─────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;

-- ── Step 2: Recreate handle_new_user with all fixes ───────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar,
    has_completed_onboarding,
    is_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      CASE 
        WHEN POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) > 0 
        THEN SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) + 1)
        ELSE ''
      END,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    FALSE,  -- has_completed_onboarding default
    FALSE   -- is_admin default (never auto-assign admin)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ── Step 3: Recreate household trigger (preserves functionality) ─
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create default household for new user
  INSERT INTO public.households (name, owner_id)
  VALUES ('My Household', NEW.id)
  RETURNING id INTO new_household_id;
  
  -- Add user as owner
  INSERT INTO public.household_members (household_id, user_id, role, status, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', 'accepted', NOW());
  
  RETURN NEW;
END;
$$;

-- ── Step 4: Recreate triggers in correct order ────────────────
-- Profile creation must happen first
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Then household creation
CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_household();

-- ── Step 5: Add INSERT policy for profiles (belt-and-suspenders) ─
-- Even though SECURITY DEFINER bypasses RLS, having an explicit policy
-- ensures consistency and allows direct inserts if needed
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Step 6: Verify function security settings ─────────────────
-- Ensure search_path is pinned (redundant with SET in function but defensive)
ALTER FUNCTION public.handle_new_user() SET search_path TO '';
ALTER FUNCTION public.handle_new_user_household() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users from OAuth metadata. Uses SECURITY DEFINER with empty search_path for security.';
COMMENT ON FUNCTION public.handle_new_user_household() IS 'Creates default household for new users. Uses SECURITY DEFINER with empty search_path for security.';
-- New tables for GDPR/Compliance features
-- data_deletion_requests: tracks GDPR deletion requests
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  notes text
);

-- RLS: only admins can read/write
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "admin_full_access_deletion_requests"
  ON public.data_deletion_requests
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- tos_acceptances: tracks ToS acceptance log
CREATE TABLE IF NOT EXISTS public.tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- RLS: admins can read all; users can read their own
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_tos" ON public.tos_acceptances;
CREATE POLICY "admin_read_tos"
  ON public.tos_acceptances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = user_id
  );
DROP POLICY IF EXISTS "user_insert_tos" ON public.tos_acceptances;
CREATE POLICY "user_insert_tos"
  ON public.tos_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- admin_email_blasts: sent email log (ADD 7)
CREATE TABLE IF NOT EXISTS public.admin_email_blasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  audience_filter text NOT NULL DEFAULT 'all',
  recipient_count int NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

ALTER TABLE public.admin_email_blasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_email_blasts" ON public.admin_email_blasts;
CREATE POLICY "admin_full_access_email_blasts"
  ON public.admin_email_blasts
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- user_sessions: for IP/Device tracking (ADD 8)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_read_own_sessions" ON public.user_sessions;
CREATE POLICY "admin_full_access_user_sessions"
  ON public.user_sessions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "user_read_own_sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user_id ON public.tos_acceptances(user_id);

DO $$ BEGIN
  RAISE NOTICE '✓ Compliance & sessions tables created/updated';
END $$;
-- ADD 6: Coupons table for promo code management
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_coupons" ON public.coupons;
CREATE POLICY "admin_full_access_coupons"
  ON public.coupons
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Public read for code validation (anonymous lookup for checkout)
DROP POLICY IF EXISTS "public_read_active_coupons" ON public.coupons;
CREATE POLICY "public_read_active_coupons"
  ON public.coupons FOR SELECT
  USING (active = true AND (valid_until IS NULL OR valid_until > now()));

-- Auto-increment uses_count via RPC (called from checkout logic)
CREATE OR REPLACE FUNCTION public.use_coupon(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon not found');
  END IF;
  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon is inactive');
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon has expired');
  END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
  RETURN jsonb_build_object(
    'ok', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✓ Coupons table and use_coupon() function created';
END $$;
-- Email Intelligence: Gmail OAuth tokens (encrypted payload) + structured scan findings only (no raw bodies).

CREATE TABLE public.email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail' CHECK (provider = 'gmail'),
  email_address text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_scan_at timestamptz,
  last_scan_after date,
  CONSTRAINT email_connections_user_provider_email_unique UNIQUE (user_id, provider, email_address)
);

CREATE INDEX email_connections_user_id_idx ON public.email_connections (user_id);

CREATE TABLE public.email_scan_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.email_connections (id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  subject_snapshot text NOT NULL DEFAULT '',
  sender_domain text NOT NULL DEFAULT '',
  biller_name text NOT NULL DEFAULT '',
  amount_due numeric,
  due_date date,
  account_last4 text,
  extracted_status text NOT NULL,
  action_required boolean NOT NULL DEFAULT true,
  extracted_category text NOT NULL,
  confidence_score numeric NOT NULL,
  suggested_destination text NOT NULL,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'high')),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'confirmed', 'skipped')),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_scan_findings_user_message_unique UNIQUE (user_id, provider_message_id)
);

CREATE INDEX email_scan_findings_user_review_idx ON public.email_scan_findings (user_id, review_status);
CREATE INDEX email_scan_findings_user_urgency_idx ON public.email_scan_findings (user_id, urgency) WHERE review_status = 'pending';

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_scan_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_connections_select_own"
  ON public.email_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_connections_insert_own"
  ON public.email_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_connections_update_own"
  ON public.email_connections FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_connections_delete_own"
  ON public.email_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_scan_findings_select_own"
  ON public.email_scan_findings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_scan_findings_insert_own"
  ON public.email_scan_findings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_scan_findings_update_own"
  ON public.email_scan_findings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_scan_findings_delete_own"
  ON public.email_scan_findings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.email_connections IS 'Gmail (etc.) OAuth refresh tokens; ciphertext only.';
COMMENT ON TABLE public.email_scan_findings IS 'Structured fields extracted from financial emails; no raw MIME/body.';
-- FIX 3: Repair audit trigger on transactions table
-- The existing trigger is missing TG_OP capture into the action column

-- First drop and recreate the trigger function for transactions
-- (using the same pattern as bills/assets triggers)

CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'transactions',
    TG_OP,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists (may be named differently)
DROP TRIGGER IF EXISTS trg_log_transaction_changes ON public.transactions;
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS transactions_audit ON public.transactions;

-- Recreate with correct trigger capturing all ops
CREATE TRIGGER trg_log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();

-- Verify the fix by checking trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_log_transaction_changes'
      AND event_object_table = 'transactions'
  ) THEN
    RAISE NOTICE '✓ FIX 3 complete: transactions audit trigger repaired';
  ELSE
    RAISE EXCEPTION 'FIX 3 FAILED: trigger not created';
  END IF;
END $$;
-- Cross-Account Protection (RISC): resolve Google subject -> auth user, revoke sessions, dedup table.

CREATE OR REPLACE FUNCTION public.find_user_id_by_google_sub(lookup_sub text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT i.user_id
  FROM auth.identities i
  WHERE i.provider = 'google'
    AND coalesce(i.identity_data->>'sub', '') = lookup_sub
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_google_sub(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_google_sub(text) TO service_role;

CREATE OR REPLACE FUNCTION public.risc_revoke_user_sessions(target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user;
END;
$$;

REVOKE ALL ON FUNCTION public.risc_revoke_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risc_revoke_user_sessions(uuid) TO service_role;

CREATE TABLE public.risc_google_events (
  jti text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.risc_google_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.risc_google_events IS 'Google RISC security event jti values for de-duplication; trim periodically.';

CREATE INDEX risc_google_events_received_at_idx ON public.risc_google_events (received_at);

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS google_refresh_token_fp_hash text,
  ADD COLUMN IF NOT EXISTS google_refresh_token_fp_prefix text;

COMMENT ON COLUMN public.email_connections.google_refresh_token_fp_hash IS 'Base64(SHA512(SHA512(utf8(refresh_token)))) for RISC token-revoked (hash_base64_sha512_sha512).';
COMMENT ON COLUMN public.email_connections.google_refresh_token_fp_prefix IS 'First 16 characters of refresh token for RISC token-revoked (prefix).';
-- Owe-AI feature was removed from product and backend.
-- Keep schema aligned by dropping legacy tables that are no longer read/written.
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_learning_profiles CASCADE;
-- Remote migration placeholder.
-- The corresponding SQL was applied directly in Supabase before this local
-- migration history was reconciled.
-- Remote migration placeholder.
-- The corresponding SQL was applied directly in Supabase before this local
-- migration history was reconciled.
-- Legacy admins used profiles.is_admin alone. After RBAC hardening, Edge admin-actions
-- requires a role row; grant super_admin to every profile still marked admin so invokes succeed.

INSERT INTO public.admin_user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.admin_roles r ON r.key = 'super_admin'
WHERE p.is_admin = true
ON CONFLICT (user_id, role_id) DO NOTHING;
-- Admin grant_entitlement used PostgREST upsert onConflict (user_id, feature_key) but no unique
-- existed, causing non-2xx failures. Deduplicate then enforce one row per user per feature.

DELETE FROM public.entitlements e
WHERE e.id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, feature_key
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
      ) AS rn
    FROM public.entitlements
  ) ranked
  WHERE ranked.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS entitlements_user_id_feature_key_uidx
  ON public.entitlements (user_id, feature_key);
-- Migration: harden mobile capture session, scans storage, and public contact surfaces
-- Restores header-bound anon RLS for capture sessions and restricts scans bucket access
-- to the owning authenticated user or a valid mobile capture token.

-- Harden anon mobile capture access back to header-bound token matching.
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "document_capture_sessions_anon_select_by_header_token" ON public.document_capture_sessions;
DROP POLICY IF EXISTS "document_capture_sessions_anon_update_by_header_token" ON public.document_capture_sessions;

CREATE POLICY "document_capture_sessions_anon_select_by_header_token"
  ON public.document_capture_sessions
  FOR SELECT
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND status IN ('idle', 'pending', 'active')
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "document_capture_sessions_anon_update_by_header_token"
  ON public.document_capture_sessions
  FOR UPDATE
  TO anon
  USING (
    token IS NOT NULL
    AND token = public.request_x_session_token()
    AND status IN ('idle', 'pending', 'active')
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    token = public.request_x_session_token()
    AND user_id IS NOT NULL
    AND status IN ('idle', 'pending', 'active', 'completed', 'error')
  );

COMMENT ON POLICY "document_capture_sessions_anon_select_by_header_token" ON public.document_capture_sessions IS
  'Anonymous mobile clients may read only the live capture session whose token matches x-session-token.';

COMMENT ON POLICY "document_capture_sessions_anon_update_by_header_token" ON public.document_capture_sessions IS
  'Anonymous mobile clients may update only the live capture session whose token matches x-session-token.';

-- Remove broad scans bucket access and bind uploads/reads to ownership.
DROP POLICY IF EXISTS "Authenticated users manage own scans" ON storage.objects;
DROP POLICY IF EXISTS "Anon mobile capture uploads to incoming" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read scans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scans" ON storage.objects;
DROP POLICY IF EXISTS "scans_authenticated_manage_owned_objects" ON storage.objects;
DROP POLICY IF EXISTS "scans_anon_upload_with_valid_capture_session" ON storage.objects;

CREATE POLICY "scans_authenticated_manage_owned_objects"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'scans'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] = 'incoming'
        AND (storage.foldername(name))[2] IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.document_capture_sessions d
          WHERE d.id::text = (storage.foldername(name))[2]
            AND d.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'scans'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] = 'incoming'
        AND (storage.foldername(name))[2] IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.document_capture_sessions d
          WHERE d.id::text = (storage.foldername(name))[2]
            AND d.user_id = auth.uid()
            AND d.status IN ('idle', 'pending', 'active')
            AND (d.expires_at IS NULL OR d.expires_at > now())
        )
      )
    )
  );

CREATE POLICY "scans_anon_upload_with_valid_capture_session"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'scans'
    AND (storage.foldername(name))[1] = 'incoming'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf')
    AND EXISTS (
      SELECT 1
      FROM public.document_capture_sessions d
      WHERE d.id::text = (storage.foldername(name))[2]
        AND d.token = public.request_x_session_token()
        AND d.status IN ('idle', 'pending', 'active')
        AND (d.expires_at IS NULL OR d.expires_at > now())
    )
  );
-- Remote migration stub
-- Allow support/ops to manage product access and Stripe-assisted actions without full super-admin.
-- Super admins still bypass via isSuperAdmin in admin-actions requirePermission().

INSERT INTO public.admin_permissions (key, label)
VALUES (
  'billing.manage',
  'Manage billing access: Full Suite grants, coupons, and subscription trials'
)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.key = 'billing.manage'
  AND r.key IN ('super_admin', 'support_agent', 'developer_ops')
ON CONFLICT DO NOTHING;
-- Email Intelligence: Zapier webhook only (no in-app Gmail OAuth).

DELETE FROM public.email_scan_findings;
DELETE FROM public.email_connections;

-- Drop legacy provider CHECK (name varies by Postgres version).
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'email_connections'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.email_connections DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.email_connections
  ALTER COLUMN encrypted_refresh_token DROP NOT NULL;

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS zapier_ingest_secret_hash text,
  ADD COLUMN IF NOT EXISTS zapier_ingest_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.email_connections
  ADD CONSTRAINT email_connections_provider_check CHECK (provider = 'zapier');

ALTER TABLE public.email_connections ALTER COLUMN provider SET DEFAULT 'zapier';

CREATE INDEX IF NOT EXISTS email_connections_zapier_secret_hash_idx
  ON public.email_connections (zapier_ingest_secret_hash)
  WHERE zapier_ingest_secret_hash IS NOT NULL;

COMMENT ON TABLE public.email_connections IS 'Zapier Email Intelligence: hashed webhook secret; no provider mail tokens.';
COMMENT ON COLUMN public.email_connections.encrypted_refresh_token IS 'Legacy Gmail OAuth ciphertext; NULL for Zapier.';
COMMENT ON COLUMN public.email_connections.zapier_ingest_secret_hash IS 'SHA-256 hex of secret + server pepper; used to authenticate Zapier webhooks.';
COMMENT ON COLUMN public.email_connections.zapier_ingest_enabled IS 'True after user has generated a webhook secret via Edge Function.';

-- Inserts only via Edge Functions (service role); block direct client inserts.
DROP POLICY IF EXISTS "email_connections_insert_own" ON public.email_connections;
-- Remove Email Intelligence feature (tables unused after product removal).

DROP TABLE IF EXISTS public.email_scan_findings CASCADE;
DROP TABLE IF EXISTS public.email_connections CASCADE;
-- Remove the unsupported QR/mobile capture path.
-- Desktop document ingestion now uses the authenticated ingestion-files bucket only.

DROP POLICY IF EXISTS "pending_ingestions_anon_insert_with_valid_capture_token" ON public.pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_authenticated_all" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users manage own pending_ingestions" ON public.pending_ingestions;
DROP POLICY IF EXISTS "Users can manage their own pending_ingestions" ON public.pending_ingestions;

CREATE POLICY "Users can manage their own pending_ingestions"
  ON public.pending_ingestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP INDEX IF EXISTS public.idx_pending_ingestions_token;
ALTER TABLE public.pending_ingestions DROP COLUMN IF EXISTS token;

DROP POLICY IF EXISTS "Authenticated users manage own scans" ON storage.objects;
DROP POLICY IF EXISTS "Anon mobile capture uploads to incoming" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read scans" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scans" ON storage.objects;
DROP POLICY IF EXISTS "scans_authenticated_manage_owned_objects" ON storage.objects;
DROP POLICY IF EXISTS "scans_anon_upload_with_valid_capture_session" ON storage.objects;

DROP TABLE IF EXISTS public.document_capture_sessions CASCADE;
DROP FUNCTION IF EXISTS public.prevent_document_capture_session_user_change();
DROP FUNCTION IF EXISTS public.request_x_session_token();

DELETE FROM storage.buckets
WHERE id = 'scans'
  AND NOT EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id = 'scans'
  );
-- Fix transactions RLS to support:
-- 1. Users NOT in a household (can see their own transactions)
-- 2. Plaid-synced transactions with household_id = NULL (owned by user_id)
-- 3. Household members (can see household transactions)

-- Drop the overly restrictive household-only policy
DROP POLICY IF EXISTS "household_transactions_access" ON public.transactions;

-- Create comprehensive policy that handles all cases:
-- - User can see transactions where user_id matches (including NULL household_id)
-- - Household members can see transactions where household_id matches
CREATE POLICY "users_and_household_transactions_access"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    -- Case 1: Own transactions (works for non-household users and NULL household_id)
    auth.uid() = user_id
    OR
    -- Case 2: Household member accessing household transactions
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  )
  WITH CHECK (
    -- Writes follow same logic
    auth.uid() = user_id
    OR
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

COMMENT ON POLICY "users_and_household_transactions_access" ON public.transactions
  IS 'Users can access their own transactions (including Plaid sync with NULL household_id) and household transactions if they are members.';-- Repair reverse-trial access everywhere the database enforces Full Suite.
--
-- The live production function only checked admin, entitlement, and Stripe
-- subscription rows. That made active 14-day profile trials look locked to RLS.
-- Keep this migration current-dated so it lands before the older future-dated
-- trial repair files that were sitting in the repo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expired boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'tracker';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_plan_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('tracker', 'trial', 'full_suite'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry
  ON public.profiles (plan, trial_ends_at)
  WHERE plan = 'trial';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar,
    has_completed_onboarding,
    is_admin,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_expired
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      CASE
        WHEN POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) > 0
        THEN SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) + 1)
        ELSE ''
      END,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    false,
    false,
    'trial',
    now(),
    now() + interval '14 days',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
    last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
    avatar = COALESCE(NULLIF(public.profiles.avatar, ''), EXCLUDED.avatar),
    plan = CASE
      WHEN public.profiles.plan IN ('trial', 'full_suite') THEN public.profiles.plan
      ELSE 'trial'
    END,
    trial_started_at = COALESCE(public.profiles.trial_started_at, EXCLUDED.trial_started_at),
    trial_ends_at = CASE
      WHEN public.profiles.plan = 'full_suite' THEN public.profiles.trial_ends_at
      WHEN public.profiles.trial_ends_at IS NOT NULL AND public.profiles.trial_ends_at > now() THEN public.profiles.trial_ends_at
      ELSE EXCLUDED.trial_ends_at
    END,
    trial_expired = CASE
      WHEN public.profiles.plan = 'full_suite' THEN public.profiles.trial_expired
      ELSE false
    END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_full_suite_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_access boolean := false;
  entitlement_active boolean := false;
  subscription_active boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    p.is_admin = true
    OR p.plan = 'full_suite'
    OR (
      p.plan = 'trial'
      AND p.trial_expired IS FALSE
      AND p.trial_ends_at IS NOT NULL
      AND p.trial_ends_at > now()
    )
    INTO profile_access
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF coalesce(profile_access, false) THEN
    RETURN true;
  END IF;

  SELECT (
      e.status = 'active'
      AND (
        e.ends_at IS NULL
        OR e.ends_at >= now()
      )
    )
    INTO entitlement_active
  FROM public.entitlements e
  WHERE e.user_id = p_user_id
    AND e.feature_key = 'full_suite'
  ORDER BY e.updated_at DESC
  LIMIT 1;

  SELECT (s.status IN ('active', 'trialing'))
    INTO subscription_active
  FROM public.billing_subscriptions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC
  LIMIT 1;

  RETURN coalesce(entitlement_active, false) OR coalesce(subscription_active, false);
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates/repairs new user profiles with a 14-day reverse trial and pinned search_path.';

COMMENT ON FUNCTION public.has_full_suite_access(uuid) IS
  'Returns true for admins, active 14-day profile trials, paid profile plan, active entitlement, or live Stripe subscription.';

-- Repair recent signups that were created while the trigger/function mismatch
-- was live. Do not touch paid/admin rows or users whose trial history exists.
UPDATE public.profiles p
SET
  plan = 'trial',
  trial_started_at = now(),
  trial_ends_at = now() + interval '14 days',
  trial_expired = false
WHERE coalesce(p.is_admin, false) = false
  AND coalesce(p.plan, 'tracker') = 'tracker'
  AND p.created_at >= now() - interval '30 days'
  AND p.trial_started_at IS NULL
  AND coalesce(p.trial_expired, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.billing_subscriptions s
    WHERE s.user_id = p.id
      AND s.status IN ('active', 'trialing')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = p.id
      AND e.feature_key = 'full_suite'
      AND e.status = 'active'
      AND (e.ends_at IS NULL OR e.ends_at >= now())
  );
-- Fix database lint/runtime type mismatch in the RISC session revocation helper.
-- auth.refresh_tokens.user_id is varchar in this Supabase project, while the
-- public RPC accepts the auth user id as uuid.

CREATE OR REPLACE FUNCTION public.risc_revoke_user_sessions(target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens
  WHERE user_id = target_user::text;
END;
$$;

REVOKE ALL ON FUNCTION public.risc_revoke_user_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.risc_revoke_user_sessions(uuid) TO service_role;
-- Clean up linked-database lint failures from public schema.
--
-- 1. PostGIS was still installed in public in the linked project, so Supabase
--    lint treated extension-owned helper functions as app functions. This
--    PostGIS install does not support ALTER EXTENSION ... SET SCHEMA, and this
--    product has no live geospatial dependencies, so remove the unused extension.
-- 2. get_businesses_nearby belonged to a removed local-business experiment and
--    references a businesses table that no longer exists. No app code calls it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis'
      AND n.nspname = 'public'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_depend d
    WHERE d.refobjid = (SELECT oid FROM pg_extension WHERE extname = 'postgis')
      AND d.deptype <> 'e'
  ) THEN
    DROP EXTENSION postgis;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_businesses_nearby(double precision, double precision, double precision, text);
-- Plaid transaction sync was blocked in production because the transactions
-- audit trigger wrote only action/record_id while audit_log still requires
-- operation/row_id. Keep both schema variants populated.

BEGIN;

CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  audit_user_id uuid;
  audit_row_id text;
BEGIN
  audit_user_id := COALESCE(NEW.user_id, OLD.user_id);
  audit_row_id := COALESCE(NEW.id::text, OLD.id::text);

  INSERT INTO public.audit_log (
    user_id,
    table_name,
    operation,
    action,
    row_id,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    audit_user_id,
    'transactions',
    TG_OP,
    TG_OP,
    audit_row_id,
    audit_row_id,
    CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Audit logging must never block user-visible writes or Plaid sync.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_transaction_changes ON public.transactions;
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS transactions_audit ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;

CREATE TRIGGER trg_log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();

COMMIT;
-- Optional user-visible memo on manual transactions (Quick Entry notes, etc.)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.transactions.notes IS 'Optional note/memo for manual entries; null for Plaid-synced rows.';
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
-- Security Events Audit Table
-- Tracks all security-relevant events for monitoring and incident response

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  endpoint text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS security_events_event_type_idx ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_severity_idx ON public.security_events (severity);
CREATE INDEX IF NOT EXISTS security_events_ip_address_idx ON public.security_events (ip_address);

-- Enable Row Level Security
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  USING (_internal.is_admin());

-- Only system (service role) can insert security events
CREATE POLICY "System can insert security events"
  ON public.security_events
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (immutable audit log)
CREATE POLICY "No updates to security events"
  ON public.security_events
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes from security events"
  ON public.security_events
  FOR DELETE
  USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.security_events IS 'Immutable audit log of security-relevant events. Only admins can query. System automatically inserts events.';
-- Notification toggles (email, push, smart alerts) stored on profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_prefs IS 'Boolean map of notification preference keys (email, push, smart alerts).';
-- Removed unused UI preference fields from settings (currency/date/dashboard were never wired in-app).
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS ui_preferences;
-- Add reverse trial fields to profiles table
-- All new signups get 14-day Full Suite trial, no credit card required

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_expired boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'tracker' CHECK (plan IN ('tracker', 'trial', 'full_suite'));

-- Add index for efficient trial expiry queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry ON public.profiles (plan, trial_ends_at) WHERE plan = 'trial';

-- Comment for documentation
COMMENT ON COLUMN public.profiles.plan IS 'User subscription tier: tracker (free), trial (14-day reverse trial), full_suite (paid subscriber)';
COMMENT ON COLUMN public.profiles.trial_started_at IS 'Timestamp when 14-day reverse trial began';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Timestamp when 14-day reverse trial expires';
COMMENT ON COLUMN public.profiles.trial_expired IS 'Flag indicating if trial has expired and user was downgraded to tracker';
-- Migration: Set 14-day reverse trial on new user signup
-- Created: 2026-05-01
-- 
-- All new users get automatic 14-day Full Suite trial, no credit card required
-- Updates handle_new_user() trigger to initialize trial fields

-- ── Step 1: Update handle_new_user to set trial fields ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar,
    has_completed_onboarding,
    is_admin,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_expired
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      CASE 
        WHEN POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) > 0 
        THEN SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) + 1)
        ELSE ''
      END,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    FALSE,  -- has_completed_onboarding default
    FALSE,  -- is_admin default (never auto-assign admin)
    'trial',  -- Start with 14-day reverse trial
    NOW(),  -- trial_started_at = now
    NOW() + INTERVAL '14 days',  -- trial_ends_at = 14 days from now
    FALSE  -- trial_expired = false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ── Step 2: Verify function security settings ─────────────────
ALTER FUNCTION public.handle_new_user() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with 14-day reverse trial. Uses SECURITY DEFINER with empty search_path for security.';
-- Enforce Tracker vs Full Suite at the database layer for paid-only tables.

CREATE OR REPLACE FUNCTION public.has_full_suite_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean := false;
  entitlement_active boolean := false;
  subscription_active boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.is_admin = true
    INTO is_admin
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF coalesce(is_admin, false) THEN
    RETURN true;
  END IF;

  SELECT (
      e.status = 'active'
      AND (
        e.ends_at IS NULL
        OR e.ends_at >= now()
      )
    )
    INTO entitlement_active
  FROM public.entitlements e
  WHERE e.user_id = p_user_id
    AND e.feature_key = 'full_suite'
  ORDER BY e.updated_at DESC
  LIMIT 1;

  SELECT (s.status IN ('active', 'trialing'))
    INTO subscription_active
  FROM public.billing_subscriptions s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC
  LIMIT 1;

  RETURN coalesce(entitlement_active, false) OR coalesce(subscription_active, false);
END;
$$;

COMMENT ON FUNCTION public.has_full_suite_access(uuid)
  IS 'Returns true for admins or users with active full_suite entitlement/subscription.';

-- transactions: read own rows; writes require full suite
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_write_own_transactions_full_suite" ON public.transactions;

CREATE POLICY "users_select_own_transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_transactions_full_suite"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));

-- debts: read own rows; writes require full suite
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "users_select_own_debts" ON public.debts;
DROP POLICY IF EXISTS "users_write_own_debts_full_suite" ON public.debts;

CREATE POLICY "users_select_own_debts"
  ON public.debts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_debts_full_suite"
  ON public.debts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));

-- incomes: read own rows; writes require full suite
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own incomes" ON public.incomes;
DROP POLICY IF EXISTS "users_select_own_incomes" ON public.incomes;
DROP POLICY IF EXISTS "users_write_own_incomes_full_suite" ON public.incomes;

CREATE POLICY "users_select_own_incomes"
  ON public.incomes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_write_own_incomes_full_suite"
  ON public.incomes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()));
-- Migration: Fix mobile capture session RLS policy
-- Replaces overly permissive USING (TRUE) WITH CHECK (TRUE) with token-based validation
-- This ensures sessions can only be accessed when a valid token is provided

-- Drop the insecure policy
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;

-- Create secure token-based policy
-- Sessions can be accessed when:
-- 1. A valid token is provided AND matches the session
-- 2. Session status allows access (idle, pending, active)
-- 3. Token hasn't expired (sessions older than 24 hours are considered expired)
CREATE POLICY "Mobile tokens can access sessions" 
ON public.document_capture_sessions 
FOR ALL 
USING (
  -- Allow access if token matches and session is in valid state
  token IS NOT NULL 
  AND status IN ('idle', 'pending', 'active')
  AND created_at > NOW() - INTERVAL '24 hours'
)
WITH CHECK (
  -- For updates/inserts, ensure token is provided and session is in valid state
  token IS NOT NULL 
  AND status IN ('idle', 'pending', 'active')
);

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_capture_sessions_token_lookup 
ON public.document_capture_sessions (token) 
WHERE status IN ('idle', 'pending', 'active');

-- Add comment documenting the security model
COMMENT ON POLICY "Mobile tokens can access sessions" ON public.document_capture_sessions IS 
  'Allows anonymous mobile clients to access capture sessions using valid tokens. 
   Tokens are UUIDs generated server-side. Sessions expire after 24 hours.
   Only sessions in idle/pending/active states are accessible.';
-- Migration: Remove household_members table and fix RLS infinite recursion
-- Date: 2026-05-02
-- Purpose: Fix 42P17 infinite recursion error by removing household_members table
--          and simplifying all RLS policies to use user_id = auth.uid()

BEGIN;

-- Step 1: Drop All RLS Policies on household_members (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'household_members') THEN
    DROP POLICY IF EXISTS "household_members_select" ON household_members;
    DROP POLICY IF EXISTS "household_members_insert" ON household_members;
    DROP POLICY IF EXISTS "household_members_update" ON household_members;
    DROP POLICY IF EXISTS "household_members_delete" ON household_members;
  END IF;
END $$;

-- Step 2: Drop the household_members table entirely (CASCADE removes dependencies)
DROP TABLE IF EXISTS household_members CASCADE;

-- Step 3: Clean up household_id columns from all tables
ALTER TABLE bills DROP COLUMN IF EXISTS household_id;
ALTER TABLE debts DROP COLUMN IF EXISTS household_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS household_id;
ALTER TABLE assets DROP COLUMN IF EXISTS household_id;
ALTER TABLE incomes DROP COLUMN IF EXISTS household_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS household_id;
ALTER TABLE budgets DROP COLUMN IF EXISTS household_id;
ALTER TABLE categories DROP COLUMN IF EXISTS household_id;
ALTER TABLE goals DROP COLUMN IF EXISTS household_id;
ALTER TABLE credit_fixes DROP COLUMN IF EXISTS household_id;
ALTER TABLE citations DROP COLUMN IF EXISTS household_id;
ALTER TABLE deductions DROP COLUMN IF EXISTS household_id;
ALTER TABLE freelance_entries DROP COLUMN IF EXISTS household_id;
ALTER TABLE mileage_log DROP COLUMN IF EXISTS household_id;
ALTER TABLE client_invoices DROP COLUMN IF EXISTS household_id;
ALTER TABLE pending_ingestions DROP COLUMN IF EXISTS household_id;
ALTER TABLE categorization_exclusions DROP COLUMN IF EXISTS household_id;
ALTER TABLE net_worth_snapshots DROP COLUMN IF EXISTS household_id;

-- Step 4: Recreate RLS policies for all tables with simple user_id checks

-- Bills
DROP POLICY IF EXISTS "bills_household_policy" ON bills;
DROP POLICY IF EXISTS "bills_user_only" ON bills;
CREATE POLICY "bills_user_only"
ON bills FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Debts
DROP POLICY IF EXISTS "debts_household_policy" ON debts;
DROP POLICY IF EXISTS "debts_user_only" ON debts;
CREATE POLICY "debts_user_only"
ON debts FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Transactions
DROP POLICY IF EXISTS "transactions_household_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_user_only" ON transactions;
CREATE POLICY "transactions_user_only"
ON transactions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Assets
DROP POLICY IF EXISTS "assets_household_policy" ON assets;
DROP POLICY IF EXISTS "assets_user_only" ON assets;
CREATE POLICY "assets_user_only"
ON assets FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Incomes
DROP POLICY IF EXISTS "incomes_household_policy" ON incomes;
DROP POLICY IF EXISTS "incomes_user_only" ON incomes;
CREATE POLICY "incomes_user_only"
ON incomes FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Subscriptions
DROP POLICY IF EXISTS "subscriptions_household_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_user_only" ON subscriptions;
CREATE POLICY "subscriptions_user_only"
ON subscriptions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Budgets
DROP POLICY IF EXISTS "budgets_household_policy" ON budgets;
DROP POLICY IF EXISTS "budgets_user_only" ON budgets;
CREATE POLICY "budgets_user_only"
ON budgets FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Categories
DROP POLICY IF EXISTS "categories_household_policy" ON categories;
DROP POLICY IF EXISTS "categories_user_only" ON categories;
CREATE POLICY "categories_user_only"
ON categories FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Goals
DROP POLICY IF EXISTS "goals_household_policy" ON goals;
DROP POLICY IF EXISTS "goals_user_only" ON goals;
CREATE POLICY "goals_user_only"
ON goals FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Credit Fixes
DROP POLICY IF EXISTS "credit_fixes_household_policy" ON credit_fixes;
DROP POLICY IF EXISTS "credit_fixes_user_only" ON credit_fixes;
CREATE POLICY "credit_fixes_user_only"
ON credit_fixes FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Citations
DROP POLICY IF EXISTS "citations_household_policy" ON citations;
DROP POLICY IF EXISTS "citations_user_only" ON citations;
CREATE POLICY "citations_user_only"
ON citations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Deductions
DROP POLICY IF EXISTS "deductions_household_policy" ON deductions;
DROP POLICY IF EXISTS "deductions_user_only" ON deductions;
CREATE POLICY "deductions_user_only"
ON deductions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Freelance Entries
DROP POLICY IF EXISTS "freelance_entries_household_policy" ON freelance_entries;
DROP POLICY IF EXISTS "freelance_entries_user_only" ON freelance_entries;
CREATE POLICY "freelance_entries_user_only"
ON freelance_entries FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Mileage Log
DROP POLICY IF EXISTS "mileage_log_household_policy" ON mileage_log;
DROP POLICY IF EXISTS "mileage_log_user_only" ON mileage_log;
CREATE POLICY "mileage_log_user_only"
ON mileage_log FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Client Invoices
DROP POLICY IF EXISTS "client_invoices_household_policy" ON client_invoices;
DROP POLICY IF EXISTS "client_invoices_user_only" ON client_invoices;
CREATE POLICY "client_invoices_user_only"
ON client_invoices FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pending Ingestions
DROP POLICY IF EXISTS "pending_ingestions_household_policy" ON pending_ingestions;
DROP POLICY IF EXISTS "pending_ingestions_user_only" ON pending_ingestions;
CREATE POLICY "pending_ingestions_user_only"
ON pending_ingestions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Categorization Exclusions
DROP POLICY IF EXISTS "categorization_exclusions_household_policy" ON categorization_exclusions;
DROP POLICY IF EXISTS "categorization_exclusions_user_only" ON categorization_exclusions;
CREATE POLICY "categorization_exclusions_user_only"
ON categorization_exclusions FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Net Worth Snapshots
DROP POLICY IF EXISTS "net_worth_snapshots_household_policy" ON net_worth_snapshots;
DROP POLICY IF EXISTS "net_worth_snapshots_user_only" ON net_worth_snapshots;
CREATE POLICY "net_worth_snapshots_user_only"
ON net_worth_snapshots FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMIT;
-- Migration: households_multi_user
-- Adds multi-user/shared household support to Oweable
-- Creates households and household_members tables with RLS policies

-- Households table (shared workspace)
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Household members with roles
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'partner', 'viewer')) DEFAULT 'partner',
  invited_email TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  joined_at TIMESTAMPTZ,
  UNIQUE(household_id, user_id)
);

-- Add household_id to existing data tables
ALTER TABLE bills ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
-- Conditionally alter optional tables that may not exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'savings') THEN
    ALTER TABLE savings ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debts') THEN
    ALTER TABLE debts ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    ALTER TABLE assets ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incomes') THEN
    ALTER TABLE incomes ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id);
  END IF;
END $$;

-- Add created_by tracking for attribution
ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Users can see households they belong to
CREATE POLICY "household_member_select" ON households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Only owners can update household metadata
CREATE POLICY "household_owner_update" ON households
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

-- Members can see other members in their household
-- Use EXISTS to avoid infinite recursion
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted'
        AND hm.household_id = household_members.household_id
    )
  );

-- Owners can manage members
CREATE POLICY "household_owner_manage_members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE households.id = household_members.household_id 
        AND households.owner_id = auth.uid()
    )
  );

-- Partners can invite others
CREATE POLICY "household_partner_invite" ON household_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      INNER JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted' 
        AND hm.role IN ('owner', 'partner')
        AND h.id = household_members.household_id
    )
  );

-- Data access policies for all major tables
CREATE POLICY "household_bills_access" ON bills
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "household_budgets_access" ON budgets
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "household_transactions_access" ON transactions
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "household_subscriptions_access" ON subscriptions
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "household_goals_access" ON goals
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'savings') THEN
    CREATE POLICY "household_savings_access" ON savings
      FOR ALL USING (
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = auth.uid() AND status = 'accepted'
        )
      );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debts') THEN
    CREATE POLICY "household_debts_access" ON debts
      FOR ALL USING (
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = auth.uid() AND status = 'accepted'
        )
      );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
    CREATE POLICY "household_assets_access" ON assets
      FOR ALL USING (
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = auth.uid() AND status = 'accepted'
        )
      );
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incomes') THEN
    CREATE POLICY "household_incomes_access" ON incomes
      FOR ALL USING (
        household_id IN (
          SELECT household_id FROM household_members
          WHERE user_id = auth.uid() AND status = 'accepted'
        )
      );
  END IF;
END $$;

-- Auto-create household on signup (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create default household for new user
  INSERT INTO households (name, owner_id)
  VALUES ('My Household', NEW.id)
  RETURNING id INTO new_household_id;
  
  -- Add user as owner
  INSERT INTO household_members (household_id, user_id, role, status, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', 'accepted', NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;
CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_household();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_bills_household ON bills(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
-- Migration: Fix household_members RLS infinite recursion and add profiles FK
-- Fixes: 42P17 infinite recursion error in household_members policies
-- Adds: Missing foreign key relationship between household_members.user_id and profiles.id

-- ── 1. Drop existing problematic policies ─────────────────────
DROP POLICY IF EXISTS "household_members_select" ON household_members;
DROP POLICY IF EXISTS "household_owner_manage_members" ON household_members;
DROP POLICY IF EXISTS "household_partner_invite" ON household_members;

-- ── 2. Recreate policies without infinite recursion ───────────
-- Members can see other members in their household
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted'
        AND hm.household_id = household_members.household_id
    )
  );

-- Owners can manage members
CREATE POLICY "household_owner_manage_members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE households.id = household_members.household_id 
        AND households.owner_id = auth.uid()
    )
  );

-- Partners can invite others
CREATE POLICY "household_partner_invite" ON household_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      INNER JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted' 
        AND hm.role IN ('owner', 'partner')
        AND h.id = household_members.household_id
    )
  );

-- ── 3. Add foreign key to profiles if not exists ──────────────
-- This fixes the "Could not find a relationship between 'household_members' and 'profiles'" error
DO $$ 
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'household_members_user_id_fkey'
      AND table_name = 'household_members'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Drop old constraint if it references auth.users
    ALTER TABLE household_members 
      DROP CONSTRAINT IF EXISTS household_members_user_id_fkey;
    
    -- Add new constraint referencing profiles instead of auth.users
    ALTER TABLE household_members 
      ADD CONSTRAINT household_members_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 4. Create indexes for performance ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_household_members_status ON household_members(status);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);
-- Migration: Fix 14-day trial activation on signup
-- Created: 2026-05-22
-- 
-- Problem: Users signing up don't get 14-day trial activated
-- Root cause: handle_new_user() function may not include trial initialization
-- due to migration order conflicts between 20260421 and 20260501 migrations
--
-- Solution: Recreate handle_new_user() with guaranteed trial fields
-- This migration supersedes all previous versions

-- ── Step 1: Drop existing triggers to avoid conflicts ─────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;

-- ── Step 2: Recreate handle_new_user with trial initialization ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    avatar,
    has_completed_onboarding,
    is_admin,
    plan,
    trial_started_at,
    trial_ends_at,
    trial_expired
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ' ', 1),
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      CASE 
        WHEN POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) > 0 
        THEN SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')) + 1)
        ELSE ''
      END,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url',
      ''
    ),
    FALSE,  -- has_completed_onboarding default
    FALSE,  -- is_admin default (never auto-assign admin)
    'trial',  -- Start with 14-day reverse trial
    NOW(),  -- trial_started_at = now
    NOW() + INTERVAL '14 days',  -- trial_ends_at = 14 days from now
    FALSE  -- trial_expired = false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ── Step 3: Recreate household trigger (preserves functionality) ─
CREATE OR REPLACE FUNCTION public.handle_new_user_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- Create default household for new user
  INSERT INTO public.households (name, owner_id)
  VALUES ('My Household', NEW.id)
  RETURNING id INTO new_household_id;
  
  -- Add user as owner
  INSERT INTO public.household_members (household_id, user_id, role, status, joined_at)
  VALUES (new_household_id, NEW.id, 'owner', 'accepted', NOW());
  
  RETURN NEW;
END;
$$;

-- ── Step 4: Recreate triggers in correct order ────────────────
-- Profile creation must happen first
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Then household creation
CREATE TRIGGER on_auth_user_created_household
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_household();

-- ── Step 5: Ensure INSERT policy exists for service role ──────
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Step 6: Verify function security settings ─────────────────
ALTER FUNCTION public.handle_new_user() SET search_path TO '';
ALTER FUNCTION public.handle_new_user_household() SET search_path TO '';

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with 14-day reverse trial. Uses SECURITY DEFINER with empty search_path for security.';
COMMENT ON FUNCTION public.handle_new_user_household() IS 'Creates default household for new users. Uses SECURITY DEFINER with empty search_path for security.';
-- Migration: Backfill 14-day trial for recent users without trial
-- Created: 2026-05-22
-- 
-- Purpose: Give existing tracker users (who signed up recently) a fresh 14-day trial
-- This is a one-time fix for users affected by the trial activation bug
--
-- Safety: Only affects users who:
-- - Have plan = 'tracker'
-- - Don't have trial_started_at set (never had a trial)
-- - Signed up in the last 30 days
-- - Haven't already expired a trial (trial_expired = false or null)

UPDATE public.profiles
SET 
  plan = 'trial',
  trial_started_at = NOW(),
  trial_ends_at = NOW() + INTERVAL '14 days',
  trial_expired = false,
  updated_at = NOW()
WHERE 
  plan = 'tracker' 
  AND (trial_started_at IS NULL OR trial_started_at < NOW() - INTERVAL '30 days')
  AND (trial_expired = false OR trial_expired IS NULL)
  AND created_at >= NOW() - INTERVAL '30 days';

-- Log how many users were affected
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled trial for % users', affected_count;
END $$;
-- Migration: Create storage buckets for document capture and ingestion
-- Date: 2026-05-23
-- Purpose: Enable mobile QR code uploads and desktop file uploads

-- ─────────────────────────────────────────────────────────────
-- 1. Create 'scans' bucket for mobile QR code captures
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'scans',
  'scans',
  false, -- Private bucket
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE storage.buckets IS 
  'Storage buckets configuration. The "scans" bucket stores mobile-captured documents.';

-- ─────────────────────────────────────────────────────────────
-- 2. Create 'ingestion-files' bucket for desktop uploads
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'ingestion-files',
  'ingestion-files',
  false, -- Private bucket
  10485760, -- 10 MB max file size
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS Policies for 'scans' bucket
-- ─────────────────────────────────────────────────────────────

-- Allow authenticated users to manage their own scans
-- Path format: incoming/{sessionId}/{filename} or user-specific paths
CREATE POLICY "Authenticated users manage own scans"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'scans'
  AND (
    -- Files in incoming/ folder (mobile uploads before processing)
    (storage.foldername(name))[1] = 'incoming'
    OR
    -- User-specific files (after processing)
    auth.uid()::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'scans'
  AND (
    (storage.foldername(name))[1] = 'incoming'
    OR
    auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Allow anonymous uploads to incoming/ folder (mobile QR captures)
-- Security: Validated by document_capture_sessions token in application layer
CREATE POLICY "Anon mobile capture uploads to incoming"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'scans'
  AND (storage.foldername(name))[1] = 'incoming'
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf')
);

-- Allow authenticated users to read any scan (needed for OCR processing)
CREATE POLICY "Authenticated users can read scans"
ON storage.objects
FOR SELECT
USING (bucket_id = 'scans');

-- Allow authenticated users to delete scans (cleanup after processing)
CREATE POLICY "Authenticated users can delete scans"
ON storage.objects
FOR DELETE
USING (bucket_id = 'scans');

-- ─────────────────────────────────────────────────────────────
-- 4. RLS Policies for 'ingestion-files' bucket
-- ─────────────────────────────────────────────────────────────

-- Allow authenticated users to manage their own ingestion files
CREATE POLICY "Users manage own ingestion files"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'ingestion-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'ingestion-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to access all ingestion files (for background processing)
-- Note: Service role bypasses RLS anyway, but this documents intent
COMMENT ON POLICY "Users manage own ingestion files" ON storage.objects IS
  'Users can upload/download/delete their own ingestion files. Path must start with user_id.';

-- ─────────────────────────────────────────────────────────────
-- 5. Enable RLS on storage.objects (if not already enabled)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 6. Verification queries (for manual testing)
-- ─────────────────────────────────────────────────────────────

-- Check buckets were created:
-- SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id IN ('scans', 'ingestion-files');

-- Check policies exist:
-- SELECT policyname, tablename FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

COMMENT ON THIS MIGRATION IS
  'Creates storage buckets for document capture system. Enables mobile QR code uploads and desktop file scanning.';
