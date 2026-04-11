-- Seed closed-beta allowlist (idempotent). Requires 20260411220000_closed_beta_allowlist.sql.

INSERT INTO public.beta_allowlist (email, note)
VALUES ('vladimirvalcourt@gmail.com', 'Primary beta tester')
ON CONFLICT (email) DO NOTHING;
