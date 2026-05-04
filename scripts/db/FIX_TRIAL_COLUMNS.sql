-- ============================================
-- FIX TRIAL COLUMNS & RLS - RUN IN DASHBOARD
-- ============================================
-- Copy and paste this entire file into Supabase Dashboard SQL Editor
-- This fixes the 500 error when querying trial columns
-- ============================================

-- Step 1: Add missing trial columns (safe to run even if they exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_expired BOOLEAN DEFAULT FALSE;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate SELECT policy for authenticated users
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" 
ON profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Step 4: Verify everything worked
SELECT '✅ Migration complete!' as status;

-- Check columns exist
SELECT COUNT(*) as trial_columns_count 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');

-- Check RLS policy exists
SELECT COUNT(*) as rls_policy_count 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'Users can view own profile';
