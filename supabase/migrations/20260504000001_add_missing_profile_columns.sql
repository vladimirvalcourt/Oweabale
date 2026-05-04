-- Fix: add columns dropped by 20260503030451_cleanup_and_setup.sql
-- The cleanup migration recreated the profiles table but omitted columns
-- that had been added in earlier migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_reserve_percent NUMERIC(5, 2) NOT NULL DEFAULT 30
  CHECK (tax_reserve_percent >= 0 AND tax_reserve_percent <= 100);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS steady_salary_target NUMERIC(14, 2) NOT NULL DEFAULT 0
  CHECK (steady_salary_target >= 0);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alert_preferences JSONB NOT NULL DEFAULT '{"bill_due_days":[1,3],"over_budget":true,"low_cash":true,"debt_due":true}'::jsonb;
