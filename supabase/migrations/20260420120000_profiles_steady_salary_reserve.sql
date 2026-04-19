-- Planning fields: pay-yourself target and % of gig gross to reserve for taxes (UI-only guidance).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tax_reserve_percent numeric(5, 2) NOT NULL DEFAULT 30
  CHECK (tax_reserve_percent >= 0 AND tax_reserve_percent <= 100);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS steady_salary_target numeric(14, 2) NOT NULL DEFAULT 0
  CHECK (steady_salary_target >= 0);

COMMENT ON COLUMN public.profiles.tax_reserve_percent IS 'Percent of self-employed gross income to set aside for taxes (user planning preference).';
COMMENT ON COLUMN public.profiles.steady_salary_target IS 'Target monthly amount to transfer to personal checking as a steady salary (planning).';
