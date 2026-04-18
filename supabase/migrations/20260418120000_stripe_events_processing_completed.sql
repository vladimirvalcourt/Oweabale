-- Webhook claim-before-handle: rows start unfulfilled until handlers succeed.
ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS processing_completed boolean NOT NULL DEFAULT false;

-- Historical rows were inserted only after successful handling in the prior flow.
UPDATE public.stripe_events SET processing_completed = true;
