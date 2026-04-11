-- Migration: move_extensions_to_extensions_schema
-- Moves extensions out of public to reduce attack surface (namespace confusion with
-- malicious objects in public). Safe for this app: no SQL references extension
-- functions by unqualified name in migrations. Roles receive USAGE on schema extensions.

CREATE SCHEMA IF NOT EXISTS extensions;

GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
DECLARE
  ext text;
BEGIN
  FOREACH ext IN ARRAY ARRAY['pg_trgm', 'fuzzystrmatch', 'pg_net', 'postgis']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext) THEN
      BEGIN
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext);
        RAISE NOTICE 'Moved extension % to schema extensions', ext;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Could not move extension %: %', ext, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Extension % not installed; skip', ext;
    END IF;
  END LOOP;
END $$;
