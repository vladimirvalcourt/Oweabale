-- Email Intelligence: Gmail OAuth tokens (encrypted payload) + structured scan findings only (no raw bodies).

CREATE TABLE public.email_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail' CHECK (provider = 'gmail'),
  email_address text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_scan_at timestamptz,
  last_scan_after date,
  CONSTRAINT email_connections_user_provider_email_unique UNIQUE (user_id, provider, email_address)
);

CREATE INDEX email_connections_user_id_idx ON public.email_connections (user_id);

CREATE TABLE public.email_scan_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.email_connections (id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  subject_snapshot text NOT NULL DEFAULT '',
  sender_domain text NOT NULL DEFAULT '',
  biller_name text NOT NULL DEFAULT '',
  amount_due numeric,
  due_date date,
  account_last4 text,
  extracted_status text NOT NULL,
  action_required boolean NOT NULL DEFAULT true,
  extracted_category text NOT NULL,
  confidence_score numeric NOT NULL,
  suggested_destination text NOT NULL,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'high')),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'confirmed', 'skipped')),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_scan_findings_user_message_unique UNIQUE (user_id, provider_message_id)
);

CREATE INDEX email_scan_findings_user_review_idx ON public.email_scan_findings (user_id, review_status);
CREATE INDEX email_scan_findings_user_urgency_idx ON public.email_scan_findings (user_id, urgency) WHERE review_status = 'pending';

ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_scan_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_connections_select_own"
  ON public.email_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_connections_insert_own"
  ON public.email_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_connections_update_own"
  ON public.email_connections FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_connections_delete_own"
  ON public.email_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_scan_findings_select_own"
  ON public.email_scan_findings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_scan_findings_insert_own"
  ON public.email_scan_findings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_scan_findings_update_own"
  ON public.email_scan_findings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_scan_findings_delete_own"
  ON public.email_scan_findings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.email_connections IS 'Gmail (etc.) OAuth refresh tokens; ciphertext only.';
COMMENT ON TABLE public.email_scan_findings IS 'Structured fields extracted from financial emails; no raw MIME/body.';
