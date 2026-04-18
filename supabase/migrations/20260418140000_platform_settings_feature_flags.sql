-- Global feature flags for admin-controlled rollouts (JSON map of string -> boolean).
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.platform_settings.feature_flags IS 'Admin-editable boolean flags (e.g. owe_ai_enabled); merged in app with defaults.';
