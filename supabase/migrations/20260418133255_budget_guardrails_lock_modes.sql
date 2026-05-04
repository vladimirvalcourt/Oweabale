-- Budget guardrails: allow none/soft/hard overspend handling.
-- NOTE: In cleanup_and_setup.sql, lock_mode was changed to BOOLEAN
-- Only add text constraint if column is text type

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type
    INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'budgets'
    AND column_name = 'lock_mode';

  IF col_type = 'text' THEN
    ALTER TABLE public.budgets
      ADD COLUMN IF NOT EXISTS lock_mode text NOT NULL DEFAULT 'none';

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
    END;

    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_lock_mode_check
      CHECK (lock_mode IN ('none', 'soft', 'hard'));
  END IF;
END $$;
