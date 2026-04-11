-- Closed beta: block new auth.users rows unless email is on beta_allowlist (when closed_beta is on).
-- Toggle via public.app_config; manage allowlist via SQL Editor (service role) or Supabase CLI.

CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.app_config IS 'Internal feature flags. closed_beta: jsonb boolean.';

INSERT INTO public.app_config (key, value)
VALUES ('closed_beta', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.beta_allowlist (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  note text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.beta_allowlist IS 'Lowercase emails allowed to register when closed_beta is true.';

ALTER TABLE public.beta_allowlist ENABLE ROW LEVEL SECURITY;

-- Expose whether closed beta is on (for sign-in page copy). Does not leak allowlist.
CREATE OR REPLACE FUNCTION public.get_closed_beta_public()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value = 'true'::jsonb) FROM public.app_config WHERE key = 'closed_beta'),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.get_closed_beta_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_closed_beta_public() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_closed_beta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_on boolean;
  em text;
BEGIN
  SELECT COALESCE(
    (SELECT (value = 'true'::jsonb) FROM public.app_config WHERE key = 'closed_beta'),
    false
  )
  INTO beta_on;

  IF beta_on IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  em := lower(trim(COALESCE(NEW.email, '')));
  IF em = '' THEN
    RAISE EXCEPTION 'Closed beta: a verified email is required.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM public.beta_allowlist WHERE email = em) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This email is not on the closed beta list. Contact the team if you were invited.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_closed_beta_before_auth_user_insert ON auth.users;
CREATE TRIGGER enforce_closed_beta_before_auth_user_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_closed_beta();
