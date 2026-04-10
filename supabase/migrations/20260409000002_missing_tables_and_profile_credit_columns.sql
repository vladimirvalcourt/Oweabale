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
