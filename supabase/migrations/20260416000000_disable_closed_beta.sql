-- Disable closed-beta enforcement: open sign-ups to any Google account.

UPDATE public.app_config
SET value = 'false'::jsonb, updated_at = now()
WHERE key = 'closed_beta';
