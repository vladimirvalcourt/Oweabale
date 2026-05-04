-- Migration: add token column to document_capture_sessions
-- The mobile capture page validates this token on every request.
-- Sessions without a matching token are rejected even if the session ID is known.
-- NOTE: This table was dropped in 20260428180411_remove_mobile_capture_flow.sql
-- Skip this migration if the table doesn't exist

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_capture_sessions'
  ) THEN
    ALTER TABLE document_capture_sessions
      ADD COLUMN IF NOT EXISTS token TEXT NOT NULL DEFAULT gen_random_uuid()::text;

    CREATE INDEX IF NOT EXISTS idx_capture_sessions_token
      ON document_capture_sessions (id, token);
  END IF;
END $$;
