# SECURITY_FIX_LOG

**Date:** April 24, 2026

## Issue: F-001 (Critical) — Capture-session anonymous access control bypass
- **Files changed:**
  - `supabase/migrations/20260424160000_resecure_document_capture_session_anon_policy.sql`
  - `src/lib/supabase_schema.sql`
- **What changed:**
  - Added corrective migration that drops permissive mobile policy and reinstates token-bound anonymous policies using `request_x_session_token()`.
  - Enforced anon access only when header token matches row token and session status/expiry constraints are met.
  - Updated schema reference to match secure policy shape.
- **Why fix is correct:**
  - Access now depends on a secret bearer-like token bound to request headers and row token, closing cross-session anonymous read/update paths.
- **Follow-up:**
  - Run `supabase db push` in each environment and verify policy list in production.

## Issue: F-002 (High) — Household invite role escalation
- **Files changed:**
  - `supabase/functions/household-invite/index.ts`
- **What changed:**
  - Added strict role validation (`partner` or `viewer` only).
  - Added server-side enforcement: partner inviters may only invite `viewer`.
  - Normalized invite email before lookup/insert/invite dispatch.
- **Why fix is correct:**
  - Eliminates trusted-client role assignment and blocks privilege escalation regardless of frontend behavior.
- **Follow-up:**
  - Add acceptance-flow checks to ensure invited role cannot be mutated during acceptance.

## Issue: F-003 (High) — Cron auth fail-open on missing secret
- **Files changed:**
  - `api/cron/expire-trials.ts`
  - `api/cron/trial-warning.ts`
- **What changed:**
  - Enforced fail-closed behavior when `CRON_SECRET` is unset.
  - Always require valid `Authorization: Bearer <CRON_SECRET>`.
- **Why fix is correct:**
  - Prevents accidental public exposure from env misconfiguration.
- **Follow-up:**
  - Add CI/runtime startup checks to block deploy when required cron secrets are missing.

## Issue: F-004 (Medium) — Support endpoint abuse surface
- **Files changed:**
  - `supabase/functions/support-contact/index.ts`
- **What changed:**
  - Added server-side rate limit enforcement.
  - Added strict payload length limits for fields.
- **Why fix is correct:**
  - Reduces spam/cost amplification and resource abuse from public endpoint automation.
- **Follow-up:**
  - Add Turnstile verification requirement in production.

## Issue: F-005 (Medium) — Internal error detail leakage
- **Files changed:**
  - `supabase/functions/household-invite/index.ts`
- **What changed:**
  - Removed raw exception message from 500 responses.
- **Why fix is correct:**
  - Preserves observability in logs while reducing attacker reconnaissance via client responses.

