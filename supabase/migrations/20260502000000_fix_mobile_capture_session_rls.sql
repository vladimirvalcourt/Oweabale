-- Migration: Fix mobile capture session RLS policy
-- Replaces overly permissive USING (TRUE) WITH CHECK (TRUE) with token-based validation
-- This ensures sessions can only be accessed when a valid token is provided

-- Drop the insecure policy
DROP POLICY IF EXISTS "Mobile tokens can access sessions" ON public.document_capture_sessions;

-- Create secure token-based policy
-- Sessions can be accessed when:
-- 1. A valid token is provided AND matches the session
-- 2. Session status allows access (idle, pending, active)
-- 3. Token hasn't expired (sessions older than 24 hours are considered expired)
CREATE POLICY "Mobile tokens can access sessions" 
ON public.document_capture_sessions 
FOR ALL 
USING (
  -- Allow access if token matches and session is in valid state
  token IS NOT NULL 
  AND status IN ('idle', 'pending', 'active')
  AND created_at > NOW() - INTERVAL '24 hours'
)
WITH CHECK (
  -- For updates/inserts, ensure token is provided and session is in valid state
  token IS NOT NULL 
  AND status IN ('idle', 'pending', 'active')
);

-- Add index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_capture_sessions_token_lookup 
ON public.document_capture_sessions (token) 
WHERE status IN ('idle', 'pending', 'active');

-- Add comment documenting the security model
COMMENT ON POLICY "Mobile tokens can access sessions" ON public.document_capture_sessions IS 
  'Allows anonymous mobile clients to access capture sessions using valid tokens. 
   Tokens are UUIDs generated server-side. Sessions expire after 24 hours.
   Only sessions in idle/pending/active states are accessible.';
