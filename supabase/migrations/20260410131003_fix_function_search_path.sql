-- Migration: fix_function_search_path
-- Mitigates search_path injection for SECURITY DEFINER and trigger helpers by pinning
-- search_path to public + pg_catalog. Applies to every public overload of the listed names.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'fn_audit_trigger',
        'process_audit_log',
        'handle_new_user',
        'update_updated_at_column',
        'set_platform_settings_updated_at',
        'generate_ticket_number',
        'prevent_document_capture_session_user_change',
        'request_x_session_token'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path TO public, pg_catalog', r.fn);
  END LOOP;
END $$;
