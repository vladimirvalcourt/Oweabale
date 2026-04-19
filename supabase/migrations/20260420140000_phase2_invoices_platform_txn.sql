-- Client invoices (accounts receivable) for freelancers
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_name text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  issued_date date NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_invoices_user_due_idx
  ON public.client_invoices (user_id, due_date DESC);

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_invoices_select_own"
  ON public.client_invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "client_invoices_insert_own"
  ON public.client_invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "client_invoices_update_own"
  ON public.client_invoices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "client_invoices_delete_own"
  ON public.client_invoices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Optional gig / platform label on transactions (user-editable; Plaid sync leaves default '')
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS platform_tag text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.transactions.platform_tag IS 'User or inferred gig platform label (e.g. Uber, DoorDash).';
COMMENT ON TABLE public.client_invoices IS 'Freelancer client invoices for AR tracking and alerts.';
