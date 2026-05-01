# Infinite Loading Loop Debugging Guide - /pro/bills

**Date:** 2026-05-01  
**Issue:** Page stuck on "Syncing financial data" loading screen  
**Status:** 🔍 Diagnostic logs added, ready for debugging  

---

## Problem Summary

The `/pro/bills` route (Obligations component) is displaying the `AppLoader` with message "Syncing financial data" indefinitely and never resolving to show the actual content.

### Tech Stack
- **Framework:** Vite + React (NOT Next.js - this is a SPA)
- **Auth:** Supabase Auth with Google OAuth
- **Database:** Supabase PostgreSQL
- **Financial Data:** Plaid integration
- **State Management:** Zustand store
- **Data Sync:** Custom `useDataSync` hook

---

## Root Cause Analysis

Based on code review, the infinite loop is likely caused by one of these issues:

### 1. ❌ Middleware Redirect Loop - NOT APPLICABLE
**Status:** This is a Vite SPA, not Next.js. There's no middleware.ts file.
**Verdict:** Not the issue.

### 2. ⚠️ OAuth Token Handoff - POSSIBLE
**Symptoms:** 
- Google OAuth callback succeeds but session token isn't properly stored
- `authUserId` remains null even after successful login
- `useDataSync` keeps waiting for valid user ID

**Where to check:**
- Browser console for auth state changes
- Supabase dashboard → Authentication → Users
- LocalStorage/SessionStorage for supabase auth tokens

### 3. ⚠️ Plaid Handshake Failure - POSSIBLE
**Symptoms:**
- Plaid `public_token` exchange fails silently
- Database queries hang waiting for Plaid data
- `fetchData` Promise.all never resolves

**Where to check:**
- Console logs for Plaid errors
- Supabase logs for failed RPC calls
- Network tab for 401/403 errors

### 4. ✅ React useEffect / State Loop - MOST LIKELY
**Symptoms:**
- `fetchData` called repeatedly without completing
- `isLoading` set to true but never set back to false
- Missing error handling causes silent failures

**Identified Issues:**
- No timeout on Supabase queries (can hang indefinitely)
- Error in Promise.all might not be caught properly
- Race condition between auth state changes and data fetching

---

## Diagnostic Console Logs Added

I've added comprehensive logging to trace exactly where the data flow stops:

### Log Output You Should See (Normal Flow)

```javascript
// 1. Auth loading
[useDataSync] Auth still loading, waiting...

// 2. User authenticated
[useDataSync] User authenticated: abc-123-def-456
[useDataSync] Triggering fetchData for user: abc-123-def-456

// 3. Fetch starts
[fetchData] starting fetch for user: abc-123-def-456
[fetchData] Total fetch time: 0ms (timer start)

// 4. Phase 1 queries execute
[fetchData] Executing phase1 queries...
[fetchData] Phase 1 queries: 245ms (timer end)
[fetchData] Phase 1 complete - bills: 5 debts: 2 transactions: 150

// 5. Phase 1 state updated
[fetchData] Setting phase1 state...
[fetchData] Phase 1 state updated, starting phase2...

// 6. Phase 2 queries execute
[fetchData] Phase 2 queries: 189ms (timer end)
[fetchData] Phase 2 complete - goals: 3 citations: 1

// 7. Success
[fetchData] All data loaded successfully, clearing loading state...
[fetchData] Total fetch time: 434ms (timer end)

// 8. Cleanup
[fetchData] Finally block - clearing isLoading
[fetchData] Setting isLoading to false
```

### If Stuck, Look For These Patterns

#### Pattern A: Auth Never Resolves
```javascript
[useDataSync] Auth still loading, waiting...
[useDataSync] Auth still loading, waiting...
[useDataSync] Auth still loading, waiting...
// ...repeats forever
```
**Fix:** Check Supabase auth configuration and Google OAuth setup

#### Pattern B: fetchData Starts But Never Completes
```javascript
[useDataSync] User authenticated: abc-123
[fetchData] starting fetch for user: abc-123
[fetchData] Executing phase1 queries...
// ...silence, no more logs
```
**Fix:** One of the Phase 1 queries is hanging. Check Supabase connection and RLS policies.

#### Pattern C: Phase 1 Succeeds But Phase 2 Hangs
```javascript
[fetchData] Phase 1 complete - bills: 5 debts: 2
[fetchData] Phase 1 state updated, starting phase2...
[fetchData] Phase 2 queries: 0ms (timer start)
// ...silence
```
**Fix:** One of the Phase 2 queries is failing. Check database tables exist.

#### Pattern D: Repeated fetchData Calls
```javascript
[useDataSync] Triggering fetchData for user: abc-123
[fetchData] starting fetch for user: abc-123
[useDataSync] Triggering fetchData for user: abc-123  // Called again!
[fetchData] starting fetch for user: abc-123  // Restarted!
```
**Fix:** Race condition in useEffect dependencies. Need to add cleanup.

#### Pattern E: Error Thrown But Not Caught
```javascript
[fetchData] Executing phase1 queries...
[fetchData] CRITICAL ERROR: TypeError: Cannot read property 'map' of undefined
[fetchData] Error stack: ...
```
**Fix:** Null check missing for database response. Add defensive coding.

---

## Step-by-Step Debugging Plan

### Step 1: Open Browser DevTools

1. Navigate to `/pro/bills`
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. Clear console (🚫 icon)
5. Refresh page (Cmd+R or Ctrl+R)
6. Watch the logs appear

### Step 2: Identify Where It Stops

Compare your console output to the "Normal Flow" above. Note which log is the **last one** you see before it gets stuck.

### Step 3: Check Network Tab

1. Switch to **Network** tab in DevTools
2. Filter by "supabase" or look for requests to `*.supabase.co`
3. Check if any requests are:
   - **Pending** (spinning indicator) - query is hanging
   - **Failed** (red) - 401/403/500 errors
   - **Slow** (>5 seconds) - performance issue

### Step 4: Check Supabase Dashboard

1. Login to [Supabase Dashboard](https://app.supabase.com)
2. Go to **Logs** → **Postgres Logs**
3. Look for:
   - Slow queries (>1 second)
   - Permission denied errors
   - Connection timeouts

### Step 5: Test Auth Separately

1. Sign out completely
2. Clear browser cache and cookies
3. Sign in again with Google OAuth
4. Check if you can access `/pro/dashboard` (simpler page)
5. If dashboard works but bills doesn't → data fetching issue
6. If neither works → auth issue

---

## Common Fixes Based on Symptoms

### Fix 1: If Auth Is Not Resolving

**Check environment variables:**
```bash
# In .env file
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Verify Google OAuth is configured:**
1. Supabase Dashboard → Authentication → Providers
2. Google provider should be **Enabled**
3. Client ID and Secret should be set
4. Authorized redirect URIs should include your domain

**Test auth manually:**
```javascript
// In browser console
import { supabase } from './src/lib/api/supabase/client';

const { data, error } = await supabase.auth.getUser();
console.log('User:', data.user);
console.log('Error:', error);
```

### Fix 2: If Queries Are Hanging

**Add timeout to Supabase queries:**
```typescript
// In dataSyncSlice.ts, wrap queries with timeout
const fetchWithTimeout = async (query: any, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const result = await query;
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
};
```

**Check RLS (Row Level Security) policies:**
1. Supabase Dashboard → Table Editor → bills table
2. Click "RLS" button
3. Ensure policy exists for authenticated users:
   ```sql
   CREATE POLICY "Users can view own bills"
   ON bills FOR SELECT
   TO authenticated
   USING (auth.uid() = user_id);
   ```

### Fix 3: If Phase 2 Queries Fail

**Check if all tables exist:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'goals', 'budgets', 'categories', 'citations', 
  'deductions', 'freelance_entries', 'mileage_log',
  'client_invoices', 'pending_ingestions', 
  'categorization_rules', 'categorization_exclusions',
  'credit_fixes', 'admin_broadcasts', 'platform_settings',
  'net_worth_snapshots', 'credit_factors',
  'investment_accounts', 'insurance_policies'
);
```

If any tables are missing, run the migration:
```bash
supabase db push
```

### Fix 4: If fetchData Is Called Repeatedly

**Add debounce to prevent rapid re-fetches:**
```typescript
// In useDataSync.ts
const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (authLoading) return;
  if (!authUserId) return;
  
  // Clear any pending fetch
  if (fetchDebounceRef.current) {
    clearTimeout(fetchDebounceRef.current);
  }
  
  // Debounce fetch by 100ms
  fetchDebounceRef.current = setTimeout(() => {
    void fetchData(authUserId);
  }, 100);
  
  return () => {
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
  };
}, [authLoading, authUserId, fetchData]);
```

### Fix 5: If Error Is Silently Swallowed

**Improve error handling in fetchData:**
```typescript
// In dataSyncSlice.ts, add better error messages
} catch (err) {
  console.error('[fetchData] CRITICAL ERROR:', err);
  console.error('[fetchData] Error name:', err instanceof Error ? err.name : 'Unknown');
  console.error('[fetchData] Error message:', err instanceof Error ? err.message : String(err));
  console.error('[fetchData] Error stack:', err instanceof Error ? err.stack : 'No stack');
  
  // Show user-friendly error
  toast.error('Failed to load your financial data. Please refresh the page.');
  
  // Force clear loading state
  set({ isLoading: false, phase2Hydrated: true });
}
```

---

## Quick Diagnostic Checklist

Run through this checklist to quickly identify the issue:

- [ ] **Console shows `[useDataSync] User authenticated:`** → Auth is working
- [ ] **Console shows `[fetchData] starting fetch:`** → Data fetch initiated
- [ ] **Console shows `[fetchData] Phase 1 complete`** → First batch of queries succeeded
- [ ] **Console shows `[fetchData] Phase 2 complete`** → All queries succeeded
- [ ] **Console shows `[fetchData] Setting isLoading to false`** → Loading cleared
- [ ] **Network tab shows no pending Supabase requests** → No hanging queries
- [ ] **No red errors in console** → No unhandled exceptions
- [ ] **Page renders Obligations component** → Issue resolved!

If any checkbox is unchecked, that's where the problem is.

---

## Emergency Workaround

If you need immediate access while debugging:

### Option 1: Skip Data Sync Temporarily

```typescript
// In src/hooks/useDataSync.ts, comment out the fetchData call
useEffect(() => {
  if (authLoading) return;
  if (authUserId) {
    hadSessionRef.current = true;
    if (lastFetchedUserIdRef.current === authUserId) return;
    lastFetchedUserIdRef.current = authUserId;
    
    // TEMPORARY: Don't fetch data, just clear loading
    console.warn('[useDataSync] SKIPPING fetchData for debugging');
    useStore.setState({ isLoading: false });
    
    // void fetchData(authUserId);  // Commented out
    return;
  }
  // ... rest of code
}, [authLoading, authUserId]);
```

This will let you see the Obligations page with empty data.

### Option 2: Use Mock Data

```typescript
// In src/pages/Obligations.tsx, add mock data fallback
const { bills, debts, citations, ... } = useStore(...);

// TEMPORARY: Use mock data if real data fails to load
const mockBills = bills.length === 0 ? [
  { id: '1', biller: 'Electric Company', amount: 120, dueDate: '2026-05-15', frequency: 'Monthly' },
  { id: '2', biller: 'Internet Provider', amount: 80, dueDate: '2026-05-20', frequency: 'Monthly' },
] : bills;
```

---

## Testing The Fix

After applying a fix:

1. **Clear browser cache** (Cmd+Shift+Delete)
2. **Hard refresh** (Cmd+Shift+R or Ctrl+Shift+R)
3. **Sign out and sign back in**
4. **Navigate to `/pro/bills`**
5. **Check console logs** - should see complete flow
6. **Verify page renders** - should see Pay List details

---

## Next Steps After Diagnosis

Once you identify the root cause from the console logs:

1. **Share the console output** with me (copy/paste all logs)
2. **Share the Network tab** screenshot showing Supabase requests
3. **Tell me which pattern** matches (A, B, C, D, or E from above)
4. **I'll provide the exact fix** based on your specific issue

---

## Files Modified For Debugging

1. **src/store/slices/dataSyncSlice.ts**
   - Added timing logs for Phase 1 and Phase 2 queries
   - Added detailed error logging with stack traces
   - Added progress logs at each stage

2. **src/hooks/useDataSync.ts**
   - Added auth state change logging
   - Added user ID validation logs
   - Added duplicate fetch prevention logs

---

## Expected Outcome

With these diagnostic logs, you should be able to:

✅ **Pinpoint exactly** where the data flow stops  
✅ **Identify which query** is hanging or failing  
✅ **See authentication state** changes in real-time  
✅ **Detect race conditions** or repeated calls  
✅ **Get actionable error messages** instead of silent failures  

Once you have the console output, share it and I'll provide the exact fix!

---

**Last Updated:** 2026-05-01  
**Status:** Diagnostic mode - awaiting console output  
**Next Action:** Run app, check console, share logs
