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
