-- Email Intelligence: Zapier webhook only (no in-app Gmail OAuth).

DELETE FROM public.email_scan_findings;
DELETE FROM public.email_connections;

-- Drop legacy provider CHECK (name varies by Postgres version).
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'email_connections'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.email_connections DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.email_connections
  ALTER COLUMN encrypted_refresh_token DROP NOT NULL;

ALTER TABLE public.email_connections
  ADD COLUMN IF NOT EXISTS zapier_ingest_secret_hash text,
  ADD COLUMN IF NOT EXISTS zapier_ingest_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.email_connections
  ADD CONSTRAINT email_connections_provider_check CHECK (provider = 'zapier');

ALTER TABLE public.email_connections ALTER COLUMN provider SET DEFAULT 'zapier';

CREATE INDEX IF NOT EXISTS email_connections_zapier_secret_hash_idx
  ON public.email_connections (zapier_ingest_secret_hash)
  WHERE zapier_ingest_secret_hash IS NOT NULL;

COMMENT ON TABLE public.email_connections IS 'Zapier Email Intelligence: hashed webhook secret; no provider mail tokens.';
COMMENT ON COLUMN public.email_connections.encrypted_refresh_token IS 'Legacy Gmail OAuth ciphertext; NULL for Zapier.';
COMMENT ON COLUMN public.email_connections.zapier_ingest_secret_hash IS 'SHA-256 hex of secret + server pepper; used to authenticate Zapier webhooks.';
COMMENT ON COLUMN public.email_connections.zapier_ingest_enabled IS 'True after user has generated a webhook secret via Edge Function.';

-- Inserts only via Edge Functions (service role); block direct client inserts.
DROP POLICY IF EXISTS "email_connections_insert_own" ON public.email_connections;
