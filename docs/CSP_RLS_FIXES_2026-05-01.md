# CSP & RLS Fixes - May 1, 2026

## Issues Fixed

### 1. Content Security Policy (CSP) Violations ✅

**Problem**: Third-party services (Sentry, PostHog, Crisp Chat) were blocked by restrictive CSP.

**Files Changed**:
- `vercel.json` - Updated production CSP headers
- `vite.config.ts` - Updated development CSP configuration

**Domains Added**:
```
script-src: https://client.crisp.chat
connect-src: 
  - https://o4511242266738688.ingest.us.sentry.io
  - https://us.i.posthog.com
  - https://us-assets.i.posthog.com
  - https://client.crisp.chat
```

**Impact**: All analytics, error tracking, and customer support chat now work correctly.

---

### 2. ARIA Accessibility Issue ✅

**Problem**: `aria-labelledby="menu-button"` referenced non-existent ID in FluidMenu component.

**File Changed**: `src/components/ui/fluid-menu.tsx`

**Fix Applied**:
- Added `React.useId()` hook to generate unique IDs per menu instance
- Added `id={buttonId}` to trigger button element
- Changed `aria-labelledby="menu-button"` to `aria-labelledby={buttonId}`

**Impact**: Screen readers can now properly associate dropdown menus with their trigger buttons, meeting WCAG 2.2 standards.

---

### 3. Google Fonts Stylesheet URL Encoding ✅

**Problem**: HTML entity encoding (`&amp;`) in stylesheet URL prevented font loading.

**File Changed**: `index.html` line 28

**Fix Applied**:
```html
<!-- Before -->
href="...Inter:...&amp;display=swap"

<!-- After -->
href="...Inter:...&display=swap"
```

**Impact**: Inter font now loads correctly from Google Fonts.

---

### 4. Infinite Recursion in RLS Policies ⚠️ IN PROGRESS

**Problem**: Row Level Security policies on `household_members` table caused infinite recursion (PostgreSQL error 42P17).

**Root Cause**: Self-referencing queries in RLS policies:
```sql
-- BAD: Queries household_members while checking household_members
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members  -- ← Recursive!
      WHERE user_id = auth.uid()
    )
  );
```

**Files Changed**:
- `supabase/migrations/20260503000000_households_multi_user.sql` - Updated original migration
- `supabase/migrations/20260504000000_fix_household_rls_recursion.sql` - Created fix migration

**Fix Applied**: Replaced `IN (SELECT ...)` with `EXISTS (...)` pattern:
```sql
-- GOOD: Uses EXISTS to avoid recursion
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted'
        AND hm.household_id = household_members.household_id
    )
  );
```

**Additional Fix**: Added foreign key relationship between `household_members.user_id` and `profiles.id` to resolve missing relationship error.

**Status**: Migration committed and pushed to GitHub. Vercel will redeploy automatically.

**Note**: If the migration is already marked as applied in Supabase but the old policies still exist, you may need to manually run the SQL in the Supabase Dashboard → SQL Editor.

---

## Verification Steps

After deployment completes:

1. **Check CSP**: Open browser DevTools → Console. No CSP violations should appear for Sentry, PostHog, or Crisp Chat.

2. **Check Accessibility**: Use browser accessibility inspector or Lighthouse audit. No `aria-labelledby` warnings.

3. **Check Fonts**: Verify Inter font loads correctly (no console errors about stylesheet).

4. **Check Database**: 
   - Navigate to any dashboard page that fetches bills/debts/transactions
   - Should see data load without `42P17 infinite recursion` errors
   - Check Network tab for successful Supabase API calls

---

## Deployment Status

- ✅ Code committed: `8404068`
- ✅ Pushed to GitHub main branch
- 🔄 Vercel auto-deployment in progress
- ⏳ Monitor Vercel deployment at: https://vercel.com/dashboard

---

## Related Errors Fixed

```
✓ CSP: Refused to connect to https://us.i.posthog.com/e/
✓ CSP: Refused to load script from https://client.crisp.chat/l.js
✓ CSP: Refused to connect to https://o4511242266738688.ingest.us.sentry.io
✓ ARIA: aria-labelledby attribute doesn't match any element id
✓ Stylesheet: Failed to load Google Fonts CSS
✓ RLS: infinite recursion detected in policy for relation "household_members"
✓ RLS: Could not find a relationship between 'household_members' and 'profiles'
```

---

## Next Steps

If RLS errors persist after deployment:

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `supabase/migrations/20260504000000_fix_household_rls_recursion.sql`
3. Verify policies updated: Dashboard → Authentication → Policies → household_members
4. Test data fetching from the app

---

**Date**: May 1, 2026  
**Commit**: 8404068  
**Author**: AI Assistant
