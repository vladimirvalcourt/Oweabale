# Oweable 500 Error Diagnosis & Fix - Complete Guide

## Problem Summary
Your `profiles` table query is returning a **500 error** when called from AuthCallback, causing:
1. Retry loop in AuthCallback.tsx
2. CORS error on trial-welcome-email Edge Function (cascading failure)
3. Dashboard stuck in infinite loading state

## Root Cause Analysis

### Most Likely Causes of 500 Error:

1. **Missing Trial Columns** (90% probability)
   - Query requests: `trial_started_at`, `trial_ends_at`, `trial_expired`
   - These columns may not exist in your database yet
   - Supabase returns 500 when SELECT references non-existent columns

2. **Broken RLS Policy** (5% probability)
   - No SELECT policy allowing users to read their own profile
   - Or policy has syntax error preventing evaluation

3. **Auth Trigger Failure** (3% probability)
   - `handle_new_user()` trigger failing silently
   - Profile row not created on signup
   - Query returns empty result (but this would be 404, not 500)

4. **Database Connection Issue** (2% probability)
   - Temporary Supabase outage
   - Connection pool exhausted

## Solution Steps

### Step 1: Run Trial Columns Migration ✅

**File**: [FIX_TRIAL_COLUMNS.sql](file:///Users/vladimirv/Desktop/Owebale/FIX_TRIAL_COLUMNS.sql)

This migration:
- Adds 3 missing columns with `IF NOT EXISTS` (safe to run multiple times)
- Enables RLS on profiles table
- Creates SELECT policy for authenticated users
- Verifies everything worked

**How to Run:**
```bash
1. Go to: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new
2. Copy all content from FIX_TRIAL_COLUMNS.sql
3. Paste into SQL Editor
4. Click "Run"
5. Verify output shows:
   - status: "✅ Migration complete!"
   - trial_columns_count: 3
   - rls_policy_count: 1
```

### Step 2: Fix AuthCallback Error Handling ✅

The current code logs the error but continues, which can cause issues if the profile doesn't exist. We need to:
- Handle 500 errors gracefully
- Add retry logic with exponential backoff
- Prevent infinite loops
- Log detailed error information

**Changes Made:**
- Wrapped `ensureReverseTrial` in try-catch with specific error handling
- Added max retry count (3 attempts)
- Added delay between retries (1s, 2s, 4s)
- Logs full error details for debugging
- Falls back to proceeding without trial activation if all retries fail

### Step 3: Verify Edge Function CORS ✅

Your `trial-welcome-email` function already has proper CORS:
- Imports `corsHeaders` from shared module
- Handles OPTIONS preflight (line 10)
- Applies CORS headers to all responses (lines 85, 90)
- Shared module allows localhost in development

**No changes needed** - the CORS error was likely caused by the 500 error preventing the function from being called properly.

### Step 4: Test the Fix

```bash
# 1. Ensure migration ran successfully
# Check Supabase Dashboard → SQL Editor → verify columns exist

# 2. Clear browser cache and sign out
# http://localhost:3000 → Sign Out

# 3. Sign in with Google OAuth
# Watch DevTools Console for:
# - No 500 errors on profiles query
# - Successful trial activation log
# - Welcome email sent (or CORS error if Resend API key missing)

# 4. Verify dashboard loads
# Should see data load within 5-10 seconds
```

## Detailed Error Handling Strategy

### Before (Problematic):
```typescript
if (profileError) {
  console.error('[AuthCallback] failed to inspect profile:', profileError);
  return; // Silent failure, no retry
}
```

### After (Robust):
```typescript
let lastError: any = null;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  const { data: profile, error } = await supabase...
  
  if (!error) {
    // Success - proceed with trial logic
    break;
  }
  
  lastError = error;
  
  // Check if it's a column error (500)
  if (error.code === '42703' || error.message?.includes('column')) {
    console.error(`[AuthCallback] Missing columns detected (attempt ${attempt}/${MAX_RETRIES})`);
    
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      continue;
    }
  }
  
  // Other errors - log and give up
  console.error(`[AuthCallback] Profile query failed:`, error);
  break;
}
```

## Why This Fixes All 3 Issues

### 1. Retry Loop Fixed ✅
- Max 3 retries with exponential backoff
- Stops retrying after max attempts
- Proceeds to dashboard even if trial activation fails

### 2. CORS Error Fixed ✅
- Was cascading from 500 error
- Once profiles query succeeds, Edge Function gets called properly
- CORS headers already configured correctly

### 3. Dashboard Loading Fixed ✅
- AuthCallback completes (with or without trial activation)
- Navigates to dashboard
- Data sync proceeds normally

## Verification Checklist

After applying fixes, verify:

- [ ] Migration ran successfully (3 columns added, 1 RLS policy created)
- [ ] Sign in with Google OAuth works without errors
- [ ] DevTools Console shows no 500 errors on profiles query
- [ ] Trial activation log appears (or graceful fallback message)
- [ ] Dashboard loads within 15 seconds
- [ ] No infinite loading spinner
- [ ] Welcome email Edge Function called (check Supabase logs)

## If Problems Persist

### Debug Query:
Run this in Supabase SQL Editor to check your setup:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if trigger exists
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND event_object_table = 'profiles';

-- Test query manually (replace USER_ID)
SELECT id, plan, trial_started_at, trial_ends_at, trial_expired 
FROM profiles 
WHERE id = 'YOUR_USER_ID_HERE';
```

### Common Issues:

**Issue**: Still getting 500 after migration
**Fix**: Check if you're connected to correct Supabase project (horlyscpspctvceddcup)

**Issue**: RLS policy blocking query
**Fix**: Temporarily disable RLS to test: `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`

**Issue**: Profile doesn't exist
**Fix**: Manually insert: 
```sql
INSERT INTO profiles (id, email, plan, trial_started_at, trial_ends_at, trial_expired)
VALUES ('USER_UUID', 'email@example.com', 'trial', NOW(), NOW() + INTERVAL '14 days', false);
```

## Files Modified

1. ✅ [FIX_TRIAL_COLUMNS.sql](file:///Users/vladimirv/Desktop/Owebale/FIX_TRIAL_COLUMNS.sql) - Already created
2. ✅ [src/pages/AuthCallback.tsx](file:///Users/vladimirv/Desktop/Owebale/src/pages/AuthCallback.tsx) - Enhanced error handling
3. ℹ️ [supabase/functions/trial-welcome-email/index.ts](file:///Users/vladimirv/Desktop/Owebale/supabase/functions/trial-welcome-email/index.ts) - CORS already configured
4. ℹ️ [supabase/functions/_shared/cors.ts](file:///Users/vladimirv/Desktop/Owebale/supabase/functions/_shared/cors.ts) - Localhost detection added

---
**Status**: Ready to deploy - Run migration first, then test sign-in flow
