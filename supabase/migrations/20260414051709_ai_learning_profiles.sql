-- Persist Owe-AI teaching familiarity across sessions.
CREATE TABLE IF NOT EXISTS public.ai_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  familiarity_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (familiarity_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_style TEXT NOT NULL DEFAULT 'plain_language'
    CHECK (preferred_style IN ('plain_language', 'step_by_step', 'concise')),
  topics_covered TEXT[] NOT NULL DEFAULT '{}',
  recent_focus TEXT[] NOT NULL DEFAULT '{}',
  last_lesson_topic TEXT,
  total_lessons INTEGER NOT NULL DEFAULT 0 CHECK (total_lessons >= 0),
  total_messages INTEGER NOT NULL DEFAULT 0 CHECK (total_messages >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_learning_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can read own AI learning profile"
  ON public.ai_learning_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can insert own AI learning profile"
  ON public.ai_learning_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI learning profile" ON public.ai_learning_profiles;
CREATE POLICY "Users can update own AI learning profile"
  ON public.ai_learning_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage AI learning profiles" ON public.ai_learning_profiles;
CREATE POLICY "Admins can manage AI learning profiles"
  ON public.ai_learning_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS ai_learning_profiles_familiarity_idx
  ON public.ai_learning_profiles (familiarity_level);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_ai_learning_profiles_updated_at ON public.ai_learning_profiles;
    CREATE TRIGGER update_ai_learning_profiles_updated_at
      BEFORE UPDATE ON public.ai_learning_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
