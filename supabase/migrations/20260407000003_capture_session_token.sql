-- Migration: add token column to document_capture_sessions
-- The mobile capture page validates this token on every request.
-- Sessions without a matching token are rejected even if the session ID is known.

ALTER TABLE document_capture_sessions
  ADD COLUMN IF NOT EXISTS token TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- Index for fast lookup on (id, token) pairs
CREATE INDEX IF NOT EXISTS idx_capture_sessions_token
  ON document_capture_sessions (id, token);
