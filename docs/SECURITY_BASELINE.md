# Oweable Security Baseline

This document defines required security controls for Oweable.

## 1) CI-Enforced Controls (must pass on every PR)

- `npm run security:edge-auth-gate`
  - Every `verify_jwt=false` edge function must include explicit auth/signature/secret checks.
- `npm run security:edge-log-hygiene`
  - Prevent sensitive identifiers/tokens/secrets from being logged.
- `npm run security:edge-baseline`
  - Enforce explicit HTTP method guards and CORS preflight handling where applicable.
- `npm run security:migrations-rls`
  - Any new `public` table in migrations must enable RLS and define at least one policy.
- `npm audit --omit=dev --audit-level=high`
  - CI fails on high/critical runtime dependency vulnerabilities.

## 2) Runtime Controls (must be configured in each environment)

- `MCP_ENFORCE_ALLOWLIST=true`
- `MCP_ALLOWED_USER_IDS=<comma-separated UUIDs>`
- `ADMIN_ALLOWED_EMAIL=<single approved admin email>`
- `REENGAGEMENT_CRON_SECRET=<random secret>`
- `EMAIL_SCAN_CRON_SECRET=<random secret>`
- `FINANCIAL_ALERTS_CRON_SECRET=<random secret>`
- `RISC_REGISTER_SECRET=<random secret>`
- `STRIPE_WEBHOOK_SECRET=<Stripe endpoint signing secret>`

## 3) Secret Management Policy

- Never commit production secrets.
- Store secrets only in environment secret stores (Supabase/Vercel/GitHub).
- Rotate immediately after any leak suspicion.
- Minimum rotation cadence: every 90 days for operational secrets.

## 4) Admin and Privileged Access Rules

- Admin edge functions require:
  - Valid JWT
  - `profiles.is_admin = true`
  - Primary admin email allowlist check where implemented
- Privileged MCP tools must only run on trusted hosts with OS-level access controls.

## 5) Webhook and Third-Party Inbound Verification

- Stripe: verify `stripe-signature`.
- Plaid: verify `plaid-verification` JWT/body hash.
- Google RISC: verify security event JWT against Google issuer/JWKS.

## 6) Logging Rules

- Never log:
  - full tokens, secrets, cookies, auth headers
  - push endpoints or cryptographic key material
  - raw user identifiers unless redacted
- Prefer redacted IDs (`abcd...wxyz`) and status codes.

## 7) Release Checklist (required before deploy)

1. CI green for `CI` and `Security` workflows.
2. `supabase db push --linked --yes` reviewed for migration intent.
3. New edge functions reviewed for auth path and method guard.
4. Secret changes applied in all environments.
5. Rollback and incident contact path verified.
