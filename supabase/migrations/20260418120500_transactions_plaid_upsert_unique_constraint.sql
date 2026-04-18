-- Plaid sync uses PostgREST upsert: onConflict 'user_id,plaid_transaction_id'.
-- PostgreSQL cannot infer a PARTIAL unique INDEX for ON CONFLICT (user_id, plaid_transaction_id),
-- so inserts failed with: "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- A non-partial UNIQUE constraint still allows many manual rows per user (plaid_transaction_id NULL
-- does not collide in PostgreSQL UNIQUE semantics).
--
-- Drop constraint first (if it already exists from a prior apply); then any orphaned partial index.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_plaid_txn_unique;
DROP INDEX IF EXISTS transactions_user_plaid_txn_unique;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_plaid_txn_unique
  UNIQUE (user_id, plaid_transaction_id);
