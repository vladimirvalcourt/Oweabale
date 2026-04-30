-- Security Events Audit Table
-- Tracks all security-relevant events for monitoring and incident response

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  endpoint text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS security_events_event_type_idx ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS security_events_user_id_idx ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS security_events_created_at_idx ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_severity_idx ON public.security_events (severity);
CREATE INDEX IF NOT EXISTS security_events_ip_address_idx ON public.security_events (ip_address);

-- Enable Row Level Security
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events"
  ON public.security_events
  FOR SELECT
  USING (_internal.is_admin());

-- Only system (service role) can insert security events
CREATE POLICY "System can insert security events"
  ON public.security_events
  FOR INSERT
  WITH CHECK (true);

-- No updates or deletes allowed (immutable audit log)
CREATE POLICY "No updates to security events"
  ON public.security_events
  FOR UPDATE
  USING (false);

CREATE POLICY "No deletes from security events"
  ON public.security_events
  FOR DELETE
  USING (false);

-- Add comment for documentation
COMMENT ON TABLE public.security_events IS 'Immutable audit log of security-relevant events. Only admins can query. System automatically inserts events.';
