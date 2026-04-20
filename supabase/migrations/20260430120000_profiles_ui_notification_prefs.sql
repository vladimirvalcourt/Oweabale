-- Notification toggles (email, push, smart alerts) stored on profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_prefs IS 'Boolean map of notification preference keys (email, push, smart alerts).';
