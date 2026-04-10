-- ============================================================
-- Migration: Fix Audit Log Schema
-- Purpose: Ensure audit_log table has correct columns for triggers
-- Date: 2026-04-10
-- Issue: "column record_id of relation audit_log does not exist"
-- ============================================================

-- 1. Ensure audit_log table exists with correct schema
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id  TEXT,
  action     TEXT NOT NULL,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add record_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_log' AND column_name = 'record_id'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN record_id TEXT;
    RAISE NOTICE 'Added missing record_id column to audit_log';
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Recreate RLS policy
DROP POLICY IF EXISTS "Admins view audit log" ON audit_log;
CREATE POLICY "Admins view audit log" 
  ON audit_log 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- 5. Recreate the audit trigger function (ensures it's up to date)
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recreate triggers on all audited tables
DROP TRIGGER IF EXISTS trg_audit_bills ON bills;
CREATE TRIGGER trg_audit_bills 
  AFTER INSERT OR UPDATE OR DELETE ON bills 
  FOR EACH ROW 
  EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_debts ON debts;
CREATE TRIGGER trg_audit_debts 
  AFTER INSERT OR UPDATE OR DELETE ON debts 
  FOR EACH ROW 
  EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions 
  AFTER INSERT OR UPDATE OR DELETE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_assets ON assets;
CREATE TRIGGER trg_audit_assets 
  AFTER INSERT OR UPDATE OR DELETE ON assets 
  FOR EACH ROW 
  EXECUTE FUNCTION process_audit_log();

-- 7. Verify
DO $$
BEGIN
  RAISE NOTICE 'Audit log schema fixed successfully';
  RAISE NOTICE 'All audit triggers recreated';
END $$;
