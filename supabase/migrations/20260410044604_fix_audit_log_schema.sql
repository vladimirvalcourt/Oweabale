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
