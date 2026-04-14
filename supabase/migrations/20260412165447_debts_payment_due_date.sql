-- Optional next payment due for debts (null = no scheduled due date, e.g. closed card with balance).
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS payment_due_date date;

COMMENT ON COLUMN public.debts.payment_due_date IS 'Next payment due date when applicable; NULL if none (e.g. closed revolving account).';
