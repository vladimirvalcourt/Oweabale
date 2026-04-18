-- Expand budget periods and support rollover behavior.
-- Safe for either enum-backed or text-backed `period` columns.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS rollover_enabled boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  period_udt text;
  c record;
BEGIN
  SELECT udt_name
    INTO period_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'budgets'
    AND column_name = 'period';

  -- If `period` is backed by a Postgres enum, extend it.
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = period_udt
      AND t.typtype = 'e'
  ) THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Weekly');
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Bi-weekly');
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', period_udt, 'Quarterly');
  ELSE
    -- If text/varchar + check constraints, replace any period checks with the expanded set.
    FOR c IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.budgets'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%period%'
    LOOP
      EXECUTE format('ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_period_check
      CHECK (period IN ('Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly'));
  END IF;
END $$;
