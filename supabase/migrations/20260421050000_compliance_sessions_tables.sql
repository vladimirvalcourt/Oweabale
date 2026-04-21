-- New tables for GDPR/Compliance features
-- data_deletion_requests: tracks GDPR deletion requests
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  notes text
);

-- RLS: only admins can read/write
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "admin_full_access_deletion_requests"
  ON public.data_deletion_requests
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- tos_acceptances: tracks ToS acceptance log
CREATE TABLE IF NOT EXISTS public.tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- RLS: admins can read all; users can read their own
ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_read_tos" ON public.tos_acceptances;
CREATE POLICY "admin_read_tos"
  ON public.tos_acceptances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    OR auth.uid() = user_id
  );
DROP POLICY IF EXISTS "user_insert_tos" ON public.tos_acceptances;
CREATE POLICY "user_insert_tos"
  ON public.tos_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- admin_email_blasts: sent email log (ADD 7)
CREATE TABLE IF NOT EXISTS public.admin_email_blasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  audience_filter text NOT NULL DEFAULT 'all',
  recipient_count int NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

ALTER TABLE public.admin_email_blasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_email_blasts" ON public.admin_email_blasts;
CREATE POLICY "admin_full_access_email_blasts"
  ON public.admin_email_blasts
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- user_sessions: for IP/Device tracking (ADD 8)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_read_own_sessions" ON public.user_sessions;
CREATE POLICY "admin_full_access_user_sessions"
  ON public.user_sessions
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "user_read_own_sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user_id ON public.tos_acceptances(user_id);

DO $$ BEGIN
  RAISE NOTICE '✓ Compliance & sessions tables created/updated';
END $$;
