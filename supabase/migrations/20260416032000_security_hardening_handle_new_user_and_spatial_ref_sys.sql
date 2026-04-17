-- Security hardening follow-up:
-- 1) Ensure SECURITY DEFINER trigger helper has immutable search_path.
-- 2) Attempt to enforce RLS on spatial_ref_sys when ownership permits.

DO $$
DECLARE
  fn regprocedure;
  tgt regclass;
BEGIN
  -- Harden handle_new_user against search_path injection.
  SELECT p.oid::regprocedure
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
  LIMIT 1;

  IF fn IS NOT NULL THEN
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_catalog', fn);
  END IF;

  -- Try to lock down spatial_ref_sys where extension ownership allows.
  SELECT c.oid
  INTO tgt
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'spatial_ref_sys'
    AND c.relkind = 'r'
    AND n.nspname IN ('public', 'extensions')
  ORDER BY (n.nspname = 'extensions') DESC
  LIMIT 1;

  IF tgt IS NOT NULL THEN
    BEGIN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tgt);
      EXECUTE format('DROP POLICY IF EXISTS spatial_ref_sys_read_authenticated ON %s', tgt);
      EXECUTE format(
        'CREATE POLICY spatial_ref_sys_read_authenticated ON %s FOR SELECT TO authenticated USING (true)',
        tgt
      );
    EXCEPTION
      WHEN SQLSTATE '42501' THEN
        RAISE NOTICE 'Skipped spatial_ref_sys RLS hardening due to owner permissions.';
    END;
  END IF;
END $$;
