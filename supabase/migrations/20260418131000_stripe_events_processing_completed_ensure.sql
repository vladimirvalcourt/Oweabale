-- Ensures processing_completed exists when an older push recorded the same version as another file
-- or the column was never applied. Safe to run multiple times.
ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS processing_completed boolean NOT NULL DEFAULT false;

-- Historical rows predating claim-before-handle were only inserted after successful handling.
UPDATE public.stripe_events SET processing_completed = true;
