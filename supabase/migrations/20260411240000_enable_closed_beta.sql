-- Turn on closed-beta enforcement (allowlist required for new signups).

UPDATE public.app_config
SET value = 'true'::jsonb, updated_at = now()
WHERE key = 'closed_beta';
