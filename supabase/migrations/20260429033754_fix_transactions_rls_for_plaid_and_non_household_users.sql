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
  IS 'Users can access their own transactions (including Plaid sync with NULL household_id) and household transactions if they are members.';