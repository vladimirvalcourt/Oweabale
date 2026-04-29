# Admin Panel Deep Audit - 2026-04-29

## Executive summary

The admin panel is real and partially useful: `/admin` is protected by auth, an admin guard, RBAC route gates, active Supabase Edge Functions, and real production tables. The live hosted project `hjgrslcapdmmgxeppguu` has the expected admin tables and deployed functions.

The panel is not production-complete. Two visible workflows are broken or misleading, several sensitive mutations bypass the centralized `admin-actions` audit/rate-limit layer, and access control still mixes hardcoded sole-operator email checks with RBAC. The most valuable areas today are user lookup/case files, audit log reading, telemetry, and data inspection. The least trustworthy areas are campaigns, PDF reports, broad data explorer edits/deletes, and compliance/moderation queues that are currently empty shells unless upstream data exists.

No production data was mutated during this audit.

## Evidence gathered

- Repo surface: `src/features/admin/*`, `src/components/guards/AdminGuard.tsx`, `supabase/functions/admin-actions/index.ts`, `supabase/functions/admin-reports/index.ts`, and admin-related migrations.
- Live Supabase: project `hjgrslcapdmmgxeppguu` is linked as `Oweable`; `admin-actions`, `admin-reports`, and `admin-alerts` are deployed and active.
- Live table counts with service-role read-only checks:
  - `profiles`: 8
  - `admin_roles`: 6
  - `admin_permissions`: 13
  - `admin_role_permissions`: 25
  - `admin_user_roles`: 1
  - `audit_log`: 142
  - `platform_settings`: 1
  - `plaid_items`: 1
  - `billing_subscriptions`: 2
  - `system_notifications`, `moderation_queue`, `support_tickets`, `admin_broadcasts`, `user_sessions`, `admin_email_blasts`, `user_compliance_status`, `flagged_transactions`: 0
- Live function checks without auth correctly returned non-2xx for `admin-actions`, `admin-reports`, and `admin-alerts`.
- Browser verification: unauthenticated `http://localhost:3001/admin` redirects to `/auth?redirect=%2Fadmin`. Authenticated page-by-page click verification was blocked because no admin browser session was available in the audit browser.

## Feature inventory

| Area | Route | Permission | Data / function source | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Admin shell | `/admin/*` | `AuthGuard` + `AdminGuard` | `profiles`, `admin_user_roles`, env email | Partially wired | Auth redirect works. Access policy is split between hardcoded email and RBAC. |
| Ops home | `/admin` | nav requires `dashboard.view`; route has no explicit gate | Direct Supabase table reads | Working but weak | Shows activation signals from real tables, but direct reads can silently undercount when RLS changes. |
| Case files | `/admin/user`, `/admin/user/:userId` | `users.read` | `admin-actions`: `user_detail`, `user_timeline`, `impersonate`, `revoke_sessions` | Useful | Best admin workflow. Needs click testing with admin session. |
| Data explorer | `/admin/data` | `users.manage` | Direct table reads/writes plus `admin-actions` for profile bulk actions | Too risky | Allows direct edits/deletes across operational tables outside central audit/rate limits. |
| Audit log | `/admin/audit-logs` | `audit.read` | Direct `audit_log` read | Useful | Live table has 142 rows. Export is useful. |
| Moderation | `/admin/moderation` | `moderation.manage` | Direct `moderation_queue` read/update | Empty shell | Live queue is empty. Updates bypass `admin-actions`. |
| Sessions | `/admin/sessions` | `users.manage` | `admin-actions:list`, direct `user_sessions`, `admin-actions:revoke_sessions` | Partially wired | Provider revocation is centralized, but local `user_sessions` marking is direct. Live table is empty. |
| Reports | `/admin/reports` | `dashboard.view` | Direct tables plus `admin-reports` | Broken / misleading | CSV is plausible. PDF export is not a real PDF and the function checks the wrong role shape. |
| Compliance | `/admin/compliance` | `compliance.read` | `admin-actions`: compliance actions | Empty shell | Tables exist but live rows are empty. Needs upstream compliance data before it is operationally useful. |
| Telemetry | `/admin/telemetry` | `telemetry.read` | `admin-actions:telemetry_overview` | Useful | Compact health view for Plaid, Stripe, admin edge activity. |
| Campaigns | `/admin/email-blast` | `moderation.manage` | Direct `admin_email_blasts`; missing `admin-actions` action | Broken | UI calls `send_email_blast`, but backend allowed actions do not include it. |

## Priority findings

### P0 - Security and data-risk fixes

1. Data explorer performs direct destructive mutations.
   - Evidence: `AdminDataTablesPage.tsx` deletes with `supabase.from(config.table).delete()` and edits with `supabase.from(config.table).update()`.
   - Risk: deletes/edits bypass `admin-actions` permission checks, rate limits, consistent audit metadata, and action-specific validation.
   - Fix: move every data explorer mutation behind explicit `admin-actions` operations or make non-profile tables read-only until a safe action exists.

2. RBAC timeout fallback grants access from `profiles.is_admin`.
   - Evidence: `AdminPermissionGate.tsx` waits 3 seconds, then renders children for `isAdminProfile` while RBAC is unresolved.
   - Risk: a transient RBAC/function outage broadens access based on a legacy flag, exactly when the permission system cannot prove scope.
   - Fix: fail closed on timeout, show retry/error, and keep only `rbac_context` or server-side function permission as the source of truth.

3. Admin identity policy is hardcoded to one frontend email plus backend secret.
   - Evidence: `AdminGuard.tsx` requires `VITE_ADMIN_EMAIL`; `admin-actions` also reads `ADMIN_ALLOWED_EMAIL`; live secrets include `ADMIN_ALLOWED_EMAIL`; local env has `VITE_ADMIN_REQUIRE_MFA=false`.
   - Risk: RBAC exists but cannot fully govern admin access; frontend env drift can lock out valid admins or keep stale access assumptions.
   - Fix: keep `ADMIN_ALLOWED_EMAIL` only as optional emergency break-glass if desired, but make RBAC/super-admin role the primary gate. Turn on admin MFA for production.

### P1 - Broken or misleading workflows

4. Campaign sending is broken.
   - Evidence: UI calls `admin-actions` with `action: 'send_email_blast'`; `ALLOWED_ACTIONS` has 35 actions and does not include `send_email_blast`; live `admin_email_blasts` count is 0.
   - Fix: either remove/disable the send UI until backend exists, or implement `send_email_blast` in `admin-actions` with audience resolution, suppression/unsubscribe enforcement, Resend sending/queueing, rate limits, and audit rows.

5. PDF reports are not real PDFs and likely reject valid super admins.
   - Evidence: `admin-reports` queries `admin_roles.select('role').eq('user_id', user.id)`, but schema uses `admin_user_roles` joined to `admin_roles(key)`; it then returns base64 text while the UI downloads it as `application/pdf`.
   - Fix: replace role check with the shared `admin-actions` RBAC pattern or fold report export into `admin-actions`; generate real PDF bytes or rename the export to `.txt`.

6. Reports revenue uses wrong tables and estimates important numbers.
   - Evidence: reports read `payments` and `subscriptions`, while the admin function uses `billing_payments` and `billing_subscriptions`; MRR is hardcoded as active subscriptions x `$17`.
   - Fix: standardize on billing tables and label/remove estimates unless backed by Stripe amounts.

### P2 - Useful but incomplete surfaces

7. Moderation and compliance are queue UIs without live data.
   - Evidence: live `moderation_queue`, `user_compliance_status`, and `flagged_transactions` are all 0 rows.
   - Fix: either wire upstream producers or label these pages as empty setup surfaces. Route moderation status changes through `admin-actions`.

8. Sessions page mixes auth-provider state and local device logs.
   - Evidence: user list comes from `admin-actions:list`, device rows come from `user_sessions`, and local revocation markers are updated directly.
   - Fix: centralize session inventory/revoke into one Edge action that both signs out users and marks local session rows with audit context.

9. Overview and audit pages rely on direct table reads.
   - Evidence: overview reads `profiles`, `plaid_items`, `bills`, `budgets`, and `goals` directly; audit logs read `audit_log` directly.
   - Fix: acceptable for read-only dashboards if RLS is stable, but more reliable as `admin-actions` summary endpoints with explicit permission checks.

### P3 - Product usefulness gaps

10. Missing admin must-haves:
    - Support ticket operations: assign, status transitions, response history, SLA/escalation.
    - Billing controls: Stripe subscription lookup, refund/portal links, trial extension history, entitlement timeline.
    - User lifecycle: ban/unban reason codes, restore path, account deletion review, risk notes.
    - Admin governance: role management UI, admin invite flow, MFA status, permission audit.
    - Incident tools: feature flag controls, maintenance/broadcast editor, webhook replay/error queue.
    - Communications governance: templates, test send, suppression list, unsubscribe compliance, send preview, recipient estimate, rate-limited queue.

## What is useful today

- Case files are the highest-value operational surface because they consolidate profile, billing, entitlements, Plaid, tickets, compliance, timeline, impersonation, and session revocation through `admin-actions`.
- Audit log is useful and has live data.
- Telemetry is useful for Plaid/Stripe/admin edge health if the endpoint is healthy.
- Data explorer is useful for read-only inspection, but its mutation controls should be treated as unsafe until centralized.

## What is hardcoded or one-off

- `VITE_ADMIN_EMAIL` and `ADMIN_ALLOWED_EMAIL` sole-operator gating.
- `VITE_ADMIN_REQUIRE_MFA=false` locally; production MFA intent needs verification/enforcement.
- Reports MRR/ARR estimate uses `$17/mo` instead of billing source-of-truth amounts.
- `admin-reports` has its own auth/RBAC logic instead of reusing the hardened `admin-actions` context.
- Campaign permissions are tied to `moderation.manage`, not a dedicated `communications.manage`.
- Data explorer table/column allowlist is hardcoded in the component.

## Verification results

| Check | Result |
| --- | --- |
| `./node_modules/.bin/tsc --noEmit` | Passed |
| `npm run security:migrations-rls` | Passed across 130 migration files |
| `npm run security:edge-auth-gate` | Failed: `verify-turnstile` has `verify_jwt=false` and no detectable auth/secret guard |
| `npm run security:edge-log-hygiene` | Failed: sensitive logging patterns in Plaid link token and RISC receiver |
| `npm run security:edge-error-leakage` | Failed: trial email functions may return raw errors |
| `npm run security:edge-baseline` | Failed: `admin-reports`, `expire-trials`, `warn-trials` missing method guards; `verify-turnstile` auth gate issue |
| `supabase functions list --project-ref hjgrslcapdmmgxeppguu` | Passed: admin functions are active |
| Browser `/admin` unauthenticated | Passed: redirects to `/auth?redirect=%2Fadmin` |

The failed security checks are not all admin-panel-specific, but `admin-reports` is directly relevant and should be fixed with the admin remediation batch.

## Recommended fix order

1. Disable or repair Campaigns before any operator uses it.
2. Remove the RBAC timeout pass-through and make admin route gates fail closed.
3. Convert Data Explorer mutations and moderation/session local updates to audited `admin-actions` operations, or make them read-only.
4. Replace `admin-reports` with a real RBAC check and honest export format.
5. Normalize admin access around RBAC plus production MFA, then demote `VITE_ADMIN_EMAIL` to display/self-protection only.
6. Add a dedicated communications permission and backend send pipeline before re-enabling broad email sends.
7. Add useful support/billing/admin-governance workflows once the safety issues above are closed.

## Remediation implemented locally

- Campaign sends are disabled in the UI until a real backend sender exists; the broken `send_email_blast` call path was removed.
- Admin route gating now fails closed when RBAC times out, instead of falling back to `profiles.is_admin`.
- `AdminGuard` no longer requires the frontend `VITE_ADMIN_EMAIL` match and recognizes both `admin` and `super_admin` RBAC roles.
- Data Explorer is now read-first: direct row edits and deletes were removed from the UI. Profile bulk ban/unban remains routed through `admin-actions`.
- Moderation status updates now call `admin-actions:update_moderation_status`, with permission checks, rate limiting, and audit logging.
- Session revocation now marks `user_sessions.revoked_at` inside `admin-actions:revoke_sessions`, not directly from the browser.
- Reports now export CSV or honest `.txt`; the fake PDF download path was removed. `admin-reports` also received a method guard and corrected super-admin RBAC lookup.
- Focused edge security gates were cleaned up: trial cron method guards, Turnstile auth-gate detection, trial-email error leakage, and sensitive logging in Plaid/RISC functions.

## Verification after remediation

| Check | Result |
| --- | --- |
| `./node_modules/.bin/tsc --noEmit` | Passed |
| `npm run build` | Passed |
| `npm run security:edge-baseline` | Passed |
| `npm run security:edge-auth-gate` | Passed |
| `npm run security:edge-log-hygiene` | Passed |
| `npm run security:edge-error-leakage` | Passed |
| `npm run security:migrations-rls` | Passed |

Remaining work: this remediation is local code only. Supabase Edge Function changes still need deployment before they affect production.
