-- ── user_feedback ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'feature_request', 'bug')),
  rating     INTEGER     CHECK (rating >= 1 AND rating <= 5),
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit feedback" ON user_feedback;
CREATE POLICY "Users can submit feedback"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own feedback" ON user_feedback;
CREATE POLICY "Users can read own feedback"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all feedback" ON user_feedback;
CREATE POLICY "Admins can manage all feedback"
  ON user_feedback FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

