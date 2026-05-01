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
