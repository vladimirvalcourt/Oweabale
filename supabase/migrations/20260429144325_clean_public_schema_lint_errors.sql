-- Clean up linked-database lint failures from public schema.
--
-- 1. PostGIS was still installed in public in the linked project, so Supabase
--    lint treated extension-owned helper functions as app functions. This
--    PostGIS install does not support ALTER EXTENSION ... SET SCHEMA, and this
--    product has no live geospatial dependencies, so remove the unused extension.
-- 2. get_businesses_nearby belonged to a removed local-business experiment and
--    references a businesses table that no longer exists. No app code calls it.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'postgis'
      AND n.nspname = 'public'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_depend d
    WHERE d.refobjid = (SELECT oid FROM pg_extension WHERE extname = 'postgis')
      AND d.deptype <> 'e'
  ) THEN
    DROP EXTENSION postgis;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_businesses_nearby(double precision, double precision, double precision, text);
