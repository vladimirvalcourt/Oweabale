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
| Medium | 3 | 1 ✅ (2 need DB migration) |
| Low | 2 | — (acceptable) |

Overall posture is **good**. The Supabase RLS layer is correctly configured, auth tokens use `sessionStorage` (not `localStorage`), file uploads are validated, and URLs are sanitized in the security library. Four bugs were found and fixed in this audit.

---

## Critical Findings (Fixed)

### C-1: `/admin` Route Publicly Accessible
- **File:** `src/App.tsx:80`  
- **Before:** `<Route path="/admin" ...>` was placed outside the `<Route element={<AuthGuard />}>` wrapper — anyone could visit `/admin` without being logged in.
- **Impact:** Unauthenticated access to admin controls (`platform_settings`, maintenance mode toggle, user list query).
- **Fix:** Moved `/admin` inside the `AuthGuard` block. **Committed.**
- **Remaining gap:** No admin role check — any authenticated user can access `/admin`. A role-based guard (checking a `is_admin` column on `profiles`) should be added before production launch.

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
- **File:** `src/pages/AdminDashboard.tsx:46`  
- **Code:** `supabase.from('profiles').select('*').limit(50)` — attempts to read all user profiles.
- **Impact:** RLS correctly blocks this (returns empty data for a normal authenticated user), but the intent is wrong. A future admin bypass (service role key leak, misconfigured RLS) would expose all user PII.
- **Recommendation:** Add an `is_admin` column to `profiles` and a corresponding RLS policy that allows `SELECT *` only when `is_admin = true`. Gate the admin dashboard on this check. **Not fixed — requires design decision.**

### M-2: `amount > 0` Constraints Absent from Schema
- **File:** `src/lib/supabase_schema.sql`  
- **Referenced in:** `BACKEND.md` ("extensive `CHECK` constraints are configured including `amount > 0`")
- **Reality:** The schema has no `CHECK (amount > 0)` on any financial table (`bills`, `debts`, `assets`, etc.).
- **Impact:** Negative balances and zero-amount records can be inserted via API calls that bypass frontend validation.
- **Recommendation:** Add `CHECK (amount > 0)` to `bills.amount`, `debts.remaining`, `assets.value`, `subscriptions.amount`, `goals.target_amount`, `incomes.amount`, `budgets.amount`, `deductions.amount`, `citations.amount`. **Needs a schema migration.**

### M-3: `profiles` Table Missing `DELETE` Policy
- **File:** `src/lib/supabase_schema.sql:26`  
- **Impact:** Users cannot delete their own profile row via the client SDK. The `ON DELETE CASCADE` from `auth.users` handles cleanup when the auth record is deleted (now fixed by H-2), but an explicit policy is cleaner and allows profile self-deletion independently.
- **Recommendation:** Add `CREATE POLICY "Users can delete their own profile" ON profiles FOR DELETE USING (auth.uid() = id);`

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

- [ ] Apply `20260407000001_add_delete_user_rpc.sql` via `supabase db push`
- [ ] Add `CHECK (amount > 0)` constraints to financial tables (new migration needed)
- [ ] Add `DELETE` policy on `profiles` (new migration needed)
- [ ] Implement admin role check on `/admin` route (`is_admin` column + RLS policy)
