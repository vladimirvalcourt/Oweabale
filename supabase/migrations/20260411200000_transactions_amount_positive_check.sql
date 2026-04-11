-- Ensure transaction amounts stay positive (matches Plaid sync Math.abs behavior and UI).
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_positive;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);
