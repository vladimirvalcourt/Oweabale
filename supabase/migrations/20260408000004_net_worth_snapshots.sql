-- Migration: net_worth_snapshots
-- One row per user per day — written by the frontend on every fetchData() call.
-- Provides a genuine historical timeline of net worth, unlike forward projections.

CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  net_worth  DECIMAL(14,2) NOT NULL,
  assets     DECIMAL(14,2) NOT NULL,
  debts      DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots"
  ON net_worth_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
