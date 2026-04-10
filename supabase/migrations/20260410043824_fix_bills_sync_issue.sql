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
