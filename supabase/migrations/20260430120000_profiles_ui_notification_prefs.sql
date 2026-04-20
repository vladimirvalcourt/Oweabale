-- Display preferences (currency, date format, etc.) and notification toggles stored on profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ui_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.ui_preferences IS 'User UI prefs: currency, dateFormat, fiscalYearStart, defaultDashboardView, monthlySpendingLimit (strings).';
COMMENT ON COLUMN public.profiles.notification_prefs IS 'Boolean map of notification preference keys (email, push, smart alerts).';
