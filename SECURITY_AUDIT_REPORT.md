# SECURITY_AUDIT_REPORT

**Audit date:** April 24, 2026  
**Scope:** Full repo audit (frontend, Edge Functions, cron API routes, Supabase migrations/schema, server tooling)  
**Assumption:** App handles sensitive financial + personal data.

## A. Executive Summary

Overall posture is **moderate but uneven**: core auth and several webhook paths are strong, but there were critical/high issues in anonymous capture-session authorization, invite privilege boundaries, and cron authentication fail-closed behavior.

### Top 5 risks
1. **Critical BOLA in mobile capture RLS** — anonymous users could access/update any active document capture session due to permissive `USING (TRUE)` policy shape in applied migration stream.
2. **High household role-escalation path** — invite API trusted caller-provided `role` without server-side role constraints.
3. **High cron auth fail-open** — if `CRON_SECRET` is unset, trial-expiry/warning cron endpoints become publicly triggerable.
4. **Medium support contact abuse risk** — no server-side rate limit or payload bounds; can be abused for spam/cost amplification.
5. **Medium internal error detail leakage** — household-invite returned raw exception detail to clients.

### Immediate ship blockers
- Critical capture-session RLS issue.  
- High cron fail-open auth and household privilege-escalation issue.

---

## B. Findings Table

| ID | Title | Severity | CWE/OWASP | Affected files | Proof from code | Why vulnerable | Realistic attack scenario | Business impact | Exact remediation |
|---|---|---|---|---|---|---|---|---|---|
| F-001 | Anonymous capture-session BOLA due to permissive RLS | **Critical** | CWE-284 / OWASP A01 Broken Access Control | `supabase/migrations/20260502000000_fix_mobile_capture_session_rls.sql`, `src/lib/supabase_schema.sql` | Policy allowed anon `FOR ALL` with no request-token equality check | Any anon caller could enumerate/update rows in active states | Attacker probes capture session IDs/timing, marks sessions complete/error, or points uploads to attacker-controlled paths | Document-capture integrity loss, user data exposure risk, workflow disruption | Added migration `20260424160000_resecure_document_capture_session_anon_policy.sql` to replace permissive policy with header-token-bound SELECT/UPDATE policies and scoped checks; aligned schema file to token-bound policy model |
| F-002 | Household invite role trust enables vertical privilege escalation | **High** | CWE-863 / OWASP A01 | `supabase/functions/household-invite/index.ts` | Request body `role` inserted directly; no server-side restriction by inviter role | Partner caller could invite with elevated role values | Compromised partner account invites attacker as privileged role to gain control over household data/actions | Unauthorized privilege expansion, data manipulation, account takeover in shared household context | Enforced strict role allowlist (`partner`/`viewer`) and server-side rule: partners can invite viewers only; normalized email and removed dynamic role trust |
| F-003 | Cron endpoints fail open when CRON_SECRET missing | **High** | CWE-306 | `api/cron/expire-trials.ts`, `api/cron/trial-warning.ts` | Authorization check was conditional on secret presence | Misconfigured env turns protected endpoint into public trigger | Internet caller repeatedly invokes expensive trial jobs and outbound email sends | Cost amplification, operational instability, user-impacting state churn | Made both endpoints fail-closed: return 500 when secret missing and always require matching bearer token |
| F-004 | Support contact endpoint abuse surface (spam/cost DoS) | **Medium** | CWE-770 / OWASP API4 | `supabase/functions/support-contact/index.ts` | No request throttling; unbounded message lengths | Public endpoint can be scripted to spam and inflate email provider costs | Botnet floods support endpoint, creating mail abuse and queue overload | Email reputation damage, support disruption, increased costs | Added server-side rate limiting and strict max lengths for name/subject/message |
| F-005 | Internal error detail leakage in household invite handler | **Medium** | CWE-209 | `supabase/functions/household-invite/index.ts` | 500 response returned `details: error.message` | Internal failure details can aid attacker recon | Attackers trigger edge-case failures and mine backend error details | Recon value for follow-on attacks | Removed error detail from client response; kept server-side logging |

---

## C. Prioritized Fix Plan

### Fix immediately before deploy
- F-001 capture-session RLS re-hardening migration + schema alignment.
- F-002 household invite privilege boundary enforcement.
- F-003 cron fail-closed auth enforcement.

### Fix this week
- F-004 support endpoint abuse controls (rate limits + payload bounds).
- F-005 internal error response sanitization consistency sweep across Edge functions.

### Hardening improvements
- Add replay/nonces for support/public form flows (Turnstile or signed challenge).
- Add centralized security tests asserting no permissive anon RLS regressions in migrations.
- Add deployment guardrail: reject deploy if `CRON_SECRET` missing in prod.

---

## D. Residual Risk / Not Fully Verifiable From Code Alone

1. **Runtime env hygiene**: cannot verify actual production secret presence/rotation, only code paths.
2. **Supabase live policy drift**: local migrations indicate intent, but live DB could still diverge without schema drift checks in CI.
3. **Email abuse protections upstream**: provider-level reputation, domain SPF/DKIM/DMARC not verifiable from repo.
4. **Admin/RBAC data quality**: code checks roles/permissions, but correctness depends on production seed/backfill completeness.
5. **External integrations**: Stripe/Plaid dashboard-side restrictions (IP allowlists, webhook settings) are out-of-repo.

