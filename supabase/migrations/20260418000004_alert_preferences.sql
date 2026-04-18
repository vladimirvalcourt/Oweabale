-- Add alert preferences column to profiles for configurable financial notifications.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_preferences JSONB NOT NULL DEFAULT '{"bill_due_days":[1,3],"over_budget":true,"low_cash":true,"debt_due":true}'::jsonb;
