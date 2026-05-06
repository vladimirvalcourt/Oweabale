-- Migration: Add missing indexes for performance
-- Created: 2026-05-05
-- Tables: profiles, billing_subscriptions, entitlements

-- profiles: frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles (plan);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles (trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- billing_subscriptions: admin dashboard sorting
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_created_at ON public.billing_subscriptions (created_at DESC);

-- entitlements: entitlement checks by end date
CREATE INDEX IF NOT EXISTS idx_entitlements_ends_at ON public.entitlements (ends_at) WHERE ends_at IS NOT NULL;
