-- Add reverse trial fields to profiles table
-- All new signups get 14-day Full Suite trial, no credit card required

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_expired boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'tracker' CHECK (plan IN ('tracker', 'trial', 'full_suite'));

-- Add index for efficient trial expiry queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry ON public.profiles (plan, trial_ends_at) WHERE plan = 'trial';

-- Comment for documentation
COMMENT ON COLUMN public.profiles.plan IS 'User subscription tier: tracker (free), trial (14-day reverse trial), full_suite (paid subscriber)';
COMMENT ON COLUMN public.profiles.trial_started_at IS 'Timestamp when 14-day reverse trial began';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Timestamp when 14-day reverse trial expires';
COMMENT ON COLUMN public.profiles.trial_expired IS 'Flag indicating if trial has expired and user was downgraded to tracker';
