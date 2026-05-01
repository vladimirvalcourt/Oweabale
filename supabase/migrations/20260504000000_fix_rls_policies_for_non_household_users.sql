-- Fix RLS policies for users without households
-- Problem: Household policies require household_id, but most users don't have one
-- Solution: Allow access if user owns the row OR is in the same household

-- Transactions: Fix to support both individual users AND household members
DROP POLICY IF EXISTS "users_select_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "users_write_own_transactions_full_suite" ON public.transactions;
DROP POLICY IF EXISTS "household_transactions_access" ON public.transactions;

CREATE POLICY "transactions_select_policy"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    -- Individual users can see their own transactions
    auth.uid() = user_id
    OR
    -- Household members can see household transactions
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "transactions_write_policy"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    -- Individual users can write their own transactions (if they have full suite)
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    -- Household members can write household transactions (if they have full suite)
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  )
  WITH CHECK (
    -- Same logic for INSERT/UPDATE checks
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  );

-- Debts: Fix to support both individual users AND household members
DROP POLICY IF EXISTS "users_select_own_debts" ON public.debts;
DROP POLICY IF EXISTS "users_write_own_debts_full_suite" ON public.debts;
DROP POLICY IF EXISTS "household_debts_access" ON public.debts;

CREATE POLICY "debts_select_policy"
  ON public.debts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "debts_write_policy"
  ON public.debts
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  )
  WITH CHECK (
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  );

-- Bills: Fix to support both individual users AND household members
DROP POLICY IF EXISTS "Users can manage their own bills" ON public.bills;
DROP POLICY IF EXISTS "household_bills_access" ON public.bills;

CREATE POLICY "bills_select_policy"
  ON public.bills
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "bills_write_policy"
  ON public.bills
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

-- Incomes: Fix to support both individual users AND household members
DROP POLICY IF EXISTS "users_select_own_incomes" ON public.incomes;
DROP POLICY IF EXISTS "users_write_own_incomes_full_suite" ON public.incomes;

CREATE POLICY "incomes_select_policy"
  ON public.incomes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "incomes_write_policy"
  ON public.incomes
  FOR ALL
  TO authenticated
  USING (
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  )
  WITH CHECK (
    (auth.uid() = user_id AND public.has_full_suite_access(auth.uid()))
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      AND public.has_full_suite_access(auth.uid())
    )
  );

-- Assets: Add RLS if not exists
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select_policy" ON public.assets;
DROP POLICY IF EXISTS "assets_write_policy" ON public.assets;

CREATE POLICY "assets_select_policy"
  ON public.assets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "assets_write_policy"
  ON public.assets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Subscriptions: Add RLS if not exists
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_write_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "household_subscriptions_access" ON public.subscriptions;

CREATE POLICY "subscriptions_select_policy"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "subscriptions_write_policy"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goals: Add RLS if not exists
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_policy" ON public.goals;
DROP POLICY IF EXISTS "goals_write_policy" ON public.goals;
DROP POLICY IF EXISTS "household_goals_access" ON public.goals;

CREATE POLICY "goals_select_policy"
  ON public.goals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "goals_write_policy"
  ON public.goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Budgets: Add RLS if not exists
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_select_policy" ON public.budgets;
DROP POLICY IF EXISTS "budgets_write_policy" ON public.budgets;
DROP POLICY IF EXISTS "household_budgets_access" ON public.budgets;

CREATE POLICY "budgets_select_policy"
  ON public.budgets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    (
      household_id IS NOT NULL
      AND household_id IN (
        SELECT household_id FROM household_members
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
    )
  );

CREATE POLICY "budgets_write_policy"
  ON public.budgets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
