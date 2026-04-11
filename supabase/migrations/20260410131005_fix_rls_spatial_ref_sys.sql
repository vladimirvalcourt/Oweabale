-- Migration: fix_rls_spatial_ref_sys
-- PostGIS installs spatial_ref_sys (EPSG lookup). Without RLS it is readable via
-- PostgREST as any role. Enable RLS and allow SELECT only for authenticated users.
-- Table may live in public or extensions depending on where postgis was installed;
-- this migration runs after extensions move so it targets the current location.

DO $$
DECLARE
  tgt regclass;
BEGIN
  SELECT c.oid INTO tgt
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'spatial_ref_sys'
    AND c.relkind = 'r'
    AND n.nspname IN ('public', 'extensions')
  ORDER BY (n.nspname = 'extensions') DESC
  LIMIT 1;

  IF tgt IS NULL THEN
    RAISE NOTICE 'spatial_ref_sys not found; skip RLS (PostGIS may be absent).';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tgt);
  EXECUTE format('DROP POLICY IF EXISTS spatial_ref_sys_read_authenticated ON %s', tgt);
  EXECUTE format(
    $f$
    CREATE POLICY spatial_ref_sys_read_authenticated
    ON %s
    FOR SELECT
    TO authenticated
    USING (true)
    $f$,
    tgt
  );

  RAISE NOTICE 'RLS enabled on %', tgt::text;
EXCEPTION
  WHEN SQLSTATE '42501' THEN
    -- Managed PostGIS: spatial_ref_sys is often owned by supabase_admin; migration role cannot ALTER.
    RAISE NOTICE 'spatial_ref_sys RLS skipped (42501: not owner — expected on some Supabase projects).';
END $$;
