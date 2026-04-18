-- Budget guardrails: allow none/soft/hard overspend handling.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS lock_mode text NOT NULL DEFAULT 'none';

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.budgets'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%lock_mode%'
  LOOP
    EXECUTE format('ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_lock_mode_check
  CHECK (lock_mode IN ('none', 'soft', 'hard'));
