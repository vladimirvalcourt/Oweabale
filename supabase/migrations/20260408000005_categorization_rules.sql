-- Migration: categorization_rules
-- Stores user-defined rules that auto-assign categories to incoming transactions.
-- Rule engine runs in the frontend (addTransaction) before every DB insert.

CREATE TABLE IF NOT EXISTS categorization_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type  TEXT        NOT NULL
                          CHECK (match_type IN ('contains', 'exact', 'starts_with', 'ends_with')),
  match_value TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  priority    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categorization rules"
  ON categorization_rules FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_categorization_rules_user ON categorization_rules (user_id, priority DESC, created_at DESC);
