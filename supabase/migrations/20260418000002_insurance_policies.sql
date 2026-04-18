-- Track user insurance policies across all coverage types.
CREATE TABLE IF NOT EXISTS public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('health', 'life', 'auto', 'renters', 'homeowners', 'disability', 'umbrella', 'dental', 'vision', 'other')),
  provider TEXT NOT NULL,
  premium NUMERIC NOT NULL DEFAULT 0 CHECK (premium >= 0),
  frequency TEXT NOT NULL DEFAULT 'Monthly' CHECK (frequency IN ('Weekly', 'Bi-weekly', 'Monthly', 'Yearly')),
  coverage_amount NUMERIC,
  deductible NUMERIC,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own insurance policies" ON public.insurance_policies;
CREATE POLICY "Users can manage own insurance policies"
  ON public.insurance_policies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage insurance policies" ON public.insurance_policies;
CREATE POLICY "Admins can manage insurance policies"
  ON public.insurance_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE));

CREATE INDEX IF NOT EXISTS insurance_policies_user_id_idx
  ON public.insurance_policies (user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_insurance_policies_updated_at ON public.insurance_policies;
    CREATE TRIGGER update_insurance_policies_updated_at
      BEFORE UPDATE ON public.insurance_policies
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
