-- Plaid scheduled sync is not defined in SQL (URL and secrets are environment-specific).
--
-- Configure in Supabase Dashboard → Edge Functions → `plaid-sync` → Cron (or Integrations → Cron):
--   Method: POST
--   URL:    https://<PROJECT_REF>.supabase.co/functions/v1/plaid-sync
--   Header: Authorization: Bearer <PLAID_CRON_SECRET>
--   Body:   {}
-- Suggested schedule: every 6 hours (0 */6 * * *).
--
-- Set secret `PLAID_CRON_SECRET` on the Edge Function and use the same value in the cron job.

DO $$
BEGIN
  NULL;
END $$;
