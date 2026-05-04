-- Create profiles table (required before running other migrations)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'dark',
  phone TEXT DEFAULT '',
  timezone TEXT DEFAULT 'America/New_York',
  language TEXT DEFAULT 'en',
  notification_prefs JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_expired BOOLEAN DEFAULT FALSE,
  credit_score INTEGER,
  credit_last_updated TIMESTAMPTZ,
  plaid_linked_at TIMESTAMPTZ,
  plaid_institution_name TEXT,
  plaid_last_sync_at TIMESTAMPTZ,
  plaid_needs_relink BOOLEAN DEFAULT FALSE,
  tax_state TEXT DEFAULT 'CA',
  tax_rate NUMERIC DEFAULT 9.5,
  has_completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
