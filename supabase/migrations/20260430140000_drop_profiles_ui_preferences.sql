-- Removed unused UI preference fields from settings (currency/date/dashboard were never wired in-app).
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS ui_preferences;
