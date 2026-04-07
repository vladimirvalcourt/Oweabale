ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN public.profiles.has_completed_onboarding IS 'Tracks if the user has finished the initial setup flow.';
