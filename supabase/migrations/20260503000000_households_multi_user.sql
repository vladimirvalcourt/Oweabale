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
