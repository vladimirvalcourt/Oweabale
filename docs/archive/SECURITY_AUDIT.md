# Backend Security Audit — Oweable
**Date:** 2026-04-07  
**Branch:** `claude/audit-backend-security-TCUum`  
**Auditor:** Claude (automated)

---

## Executive Summary

| Severity | Count | Fixed |
|---|---|---|
| Critical | 2 | 2 ✅ |
| High | 2 | 2 ✅ |
| Medium | 3 | 3 ✅ (constraints + admin gate + profiles DELETE; see migrations) |
| Low | 2 | — (acceptable) |

Overall posture is **good**. The Supabase RLS layer is correctly configured, auth tokens use `sessionStorage` (not `localStorage`), file uploads are validated, and URLs are sanitized in the security library. Four bugs were found and fixed in this audit.

---

## Critical Findings (Fixed)

### C-1: `/admin` Route Publicly Accessible
- **File:** `src/App.tsx:80`  
- **Before:** `<Route path="/admin" ...>` was placed outside the `<Route element={<AuthGuard />}>` wrapper — anyone could visit `/admin` without being logged in.
- **Impact:** Unauthenticated access to admin controls (`platform_settings`, maintenance mode toggle, user list query).
- **Fix:** Moved `/admin` inside the `AuthGuard` block. **Committed.**
- **Follow-up:** `AdminGuard` (`src/components/AdminGuard.tsx`) loads `profiles.is_admin` from Supabase (RLS-backed); `/admin` is wrapped with `AdminGuard`. **`is_admin`** column and admin RLS policies are in migrations (e.g. `20260407000002_amount_check_constraints_and_profile_fixes.sql`, `20260411144758_fix_rls_profiles_select_recursion.sql`).

### C-2: `paymentUrl` Rendered as Raw `href` (Stored XSS)
- **File:** `src/pages/Dashboard.tsx:601`  
- **Before:** `<a href={selectedCitation.paymentUrl}>` — user-supplied URL inserted directly into the DOM with no validation. A `javascript:alert(1)` value would execute on click.
- **Impact:** Stored XSS via the citation payment URL field.
- **Fix:** Wrapped with `sanitizeUrl()` from `src/lib/security.ts`. If the URL is not a valid `https:` URL, the link is replaced with a disabled placeholder. **Committed.**

---

## High Findings (Fixed)

### H-1: `resetData()` Reads User ID from Stale Store State
- **File:** `src/store/useStore.ts:798`  
- **Before:** `const userId = get().user.id` — reads from the Zustand store, which could be empty or stale (e.g., if `fetchData()` hasn't run yet).
- **Impact:** `resetData()` silently no-ops if `user.id` is an empty string, leaving DB rows intact while the UI resets locally — data inconsistency.
- **Fix:** Changed to `supabase.auth.getUser()` — the authoritative source of the current user's identity. **Committed.**

### H-2: `deleteAccount()` Does Not Delete the Auth User Record
- **File:** `src/store/useStore.ts:843`  
- **Before:** Deleted all financial data rows and called `signOut()`, but the `auth.users` record remained. The user could sign back in and recover no data (empty state), which is confusing and violates GDPR "right to erasure."
- **Impact:** Incomplete account deletion; auth identity persists.
- **Fix:** Added `supabase.rpc('delete_user')` call after data deletion. A new migration (`supabase/migrations/20260407000001_add_delete_user_rpc.sql`) creates the `SECURITY DEFINER` function that deletes `auth.uid()` from `auth.users`. **Committed. Migration must be applied.**

---

## Medium Findings

### M-1: `AdminDashboard` Queries All User Profiles
- **File:** `src/pages/AdminDashboard.tsx`  
- **Code:** Selects multiple columns from `profiles` for the user table (admin tooling).
- **Impact:** Only users with **`is_admin`** on their profile can read other profiles (RLS + `_internal.is_admin()`); the route is additionally gated by **`AdminGuard`**. Service-role operations (e.g. `admin-actions` Edge Function) require a valid JWT and `is_admin` on the caller’s profile.
- **Status:** Addressed via `is_admin`, RLS, `AdminGuard`, and server-side checks.

### M-2: `amount > 0` Constraints Absent from Schema
- **Migrations:** `20260407000002_amount_check_constraints_and_profile_fixes.sql` adds `CHECK` constraints for `bills`, `debts` (including `remaining >= 0`), `assets`, `subscriptions`, `goals`, `incomes`, `budgets`, `citations`, `deductions`. **`20260411200000_transactions_amount_positive_check.sql`** adds `transactions.amount > 0` (aligned with Plaid sync using absolute amounts).
- **Impact:** Invalid amounts are rejected at the database layer once migrations are applied.
- **Note:** Regenerate or update `src/lib/supabase_schema.sql` from the live schema when convenient so docs match reality.

### M-3: `profiles` Table Missing `DELETE` Policy
- **Migration:** `20260407000002_amount_check_constraints_and_profile_fixes.sql` — policy **`Users can delete their own profile`** on `profiles` for `DELETE` where `auth.uid() = id`.
- **Status:** Implemented in migration (apply via `supabase db push`).

---

## Follow-up (2026-04-11)

| Item | Change |
|------|--------|
| Maintenance mode | `MaintenanceGuard` + `MaintenancePage` — when `platform_settings.maintenance_mode` is true, signed-in **non-admin** users see maintenance (admins retain access). |
| `admin-actions` CORS | Uses `../_shared/cors.ts` (same allowlist as Plaid functions; override with `PLAID_ALLOWED_ORIGINS`). |
| Ingestion preview URLs | `sanitizeUrl()` for signed storage URLs in `href` / `iframe` / `img`; blob previews for local files unchanged. |

---

## Low Findings (Accepted)

### L-1: `Math.random()` for Temporary IDs
- **Files:** `useStore.ts` (many locations)
- `Math.random().toString(36)` is used to generate local IDs before Supabase returns a real UUID. These IDs are temporary — they are replaced by DB-generated UUIDs on the next fetch.
- **Assessment:** Acceptable. No security-sensitive decision is made on these IDs before they are replaced.

### L-2: MCP Server Has No Auth on `get_account_summary`
- **File:** `server/server.ts:13`  
- The MCP tool accepts any `userId` string and returns mock data. No real DB query is made — it always returns hardcoded values.
- **Assessment:** Low risk because it returns mock data only. When real DB queries are added, authentication must be enforced (verify the caller's identity via a signed token before querying).

---

## What Is Working Well

- **RLS on all 12 tables** — every table has `ENABLE ROW LEVEL SECURITY` and granular `SELECT/INSERT/UPDATE/DELETE` or `ALL` policies.
- **Session storage for auth tokens** — `supabase.ts` correctly uses `window.sessionStorage`, preventing token persistence after browser close.
- **Zustand persist uses sessionStorage** — financial data is scoped to the browser session, not permanently stored in `localStorage`.
- **File upload validation** — `src/lib/security.ts` validates MIME types, extensions, and file sizes for all ingestion paths.
- **URL sanitization library exists** — `sanitizeUrl()` correctly blocks non-`https:` schemes. (Was just not applied to `paymentUrl` — now fixed.)
- **Idle timeout** — `useAuth.ts` signs users out after 15 minutes of inactivity.
- **Back/forward cache re-validation** — `pageshow` handler forces a reload on bfcache restore, preventing stale session bypass.
- **`rel="noreferrer"` on external links** — now also `noopener` added to the payment link fix.
- **`onAuthStateChange` listener** in `AuthCallback.tsx` correctly drives post-OAuth redirects.
- **`AuthGuard` component** protects all dashboard routes with a clean loading state.

---

## Migration Checklist

Before production:

- [ ] Apply pending migrations via `supabase db push` (including `20260407000001_add_delete_user_rpc.sql`, `20260407000002_amount_check_constraints_and_profile_fixes.sql`, `20260411200000_transactions_amount_positive_check.sql`, and later RLS recursion fixes as required by your branch)
- [x] `CHECK` constraints on core financial tables — see `20260407000002_*` + `20260411200000_*`
- [x] `DELETE` policy on `profiles` — `20260407000002_*`
- [x] Admin role check on `/admin` — `AdminGuard` + `is_admin` + RLS
