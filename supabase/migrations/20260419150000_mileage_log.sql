-- Manual mileage log for business / medical / charity trips (IRS mileage deduction planning).
CREATE TABLE IF NOT EXISTS public.mileage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  trip_date date NOT NULL,
  start_location text NOT NULL DEFAULT '',
  end_location text NOT NULL DEFAULT '',
  miles numeric(12, 2) NOT NULL CHECK (miles > 0 AND miles <= 99999),
  purpose text NOT NULL CHECK (purpose IN ('business', 'medical', 'charity')),
  platform text NOT NULL DEFAULT '',
  irs_rate_per_mile numeric(10, 4) NOT NULL DEFAULT 0.70,
  deduction_amount numeric(14, 2) NOT NULL CHECK (deduction_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mileage_log_user_trip_date_idx
  ON public.mileage_log (user_id, trip_date DESC);

ALTER TABLE public.mileage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mileage_log_select_own"
  ON public.mileage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "mileage_log_insert_own"
  ON public.mileage_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mileage_log_update_own"
  ON public.mileage_log FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "mileage_log_delete_own"
  ON public.mileage_log FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
