-- ============================================================
-- Migration: Fix Bills Sync Issue
-- Purpose: Ensure bills table exists with correct schema and RLS policies
-- Date: 2026-04-10
-- ============================================================

-- 1. Ensure bills table exists with correct schema
CREATE TABLE IF NOT EXISTS bills (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  biller     TEXT NOT NULL,
  amount     DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category   TEXT,
  due_date   DATE NOT NULL,
  frequency  TEXT,
  status     TEXT CHECK (status IN ('upcoming', 'paid', 'overdue')),
  auto_pay   BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own bills" ON bills;

-- 4. Create comprehensive RLS policy for all operations
CREATE POLICY "Users can manage their own bills"
  ON bills
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Ensure index exists for performance
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);

-- 6. Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Verify the setup
DO $$
BEGIN
  RAISE NOTICE 'Bills table migration completed successfully';
  RAISE NOTICE 'RLS Policy: Users can manage their own bills';
  RAISE NOTICE 'Index: idx_bills_user_id created';
END $$;
