# 🚀 Oweable 500 Error Fix - Deployment Checklist

## Quick Start (5 minutes)

### Step 1: Run Database Migration ⚡
```
1. Open: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new
2. Copy content from: FIX_TRIAL_COLUMNS.sql
3. Paste → Click "Run"
4. Verify output shows:
   ✅ Migration complete!
   trial_columns_count: 3
   rls_policy_count: 1
```

### Step 2: Test Sign-In Flow 🧪
```
1. Go to: http://localhost:3000
2. Sign out (if logged in)
3. Sign in with Google OAuth
4. Watch DevTools Console for:
   ✅ [AuthCallback] Checking profile for trial activation (attempt 1/3)
   ✅ [AuthCallback] Trial activated successfully
   ❌ NO 500 errors
   ❌ NO infinite loading
```

### Step 3: Verify Dashboard Loads ✅
```
- Should see dashboard within 5-10 seconds
- No spinning loader stuck forever
- Data sync completes normally
```

---

## What Was Fixed

### 1. Database Schema ✅
**Problem**: Missing trial columns causing 500 error
**Solution**: Added `trial_started_at`, `trial_ends_at`, `trial_expired` with safe migration

### 2. AuthCallback Error Handling ✅
**Problem**: Silent failures causing retry loops
**Solution**: 
- Max 3 retries with exponential backoff (1s, 2s, 4s)
- Specific error detection for missing columns
- Graceful fallback if all retries fail
- User-friendly toast notifications

### 3. CORS Configuration ✅
**Problem**: Edge Function blocked by CORS (cascading from 500 error)
**Solution**: Already configured correctly - issue was upstream 500 error

---

## Verification Commands

### Check Database Columns
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');
```
**Expected**: 3 rows returned

### Check RLS Policies
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```
**Expected**: At least 1 policy named "Users can view own profile"

### Test Profile Query Manually
```sql
-- Replace with your actual user ID from Supabase Auth
SELECT id, plan, trial_started_at, trial_ends_at, trial_expired 
FROM profiles 
WHERE id = 'YOUR_USER_UUID_HERE';
```
**Expected**: 1 row with trial data or NULL values

---

## Troubleshooting

### Still Getting 500 Error?

**Check 1**: Are you on the right Supabase project?
```bash
# Verify project ref in .env.local
SUPABASE_URL=https://horlyscpspctvceddcup.supabase.co
```

**Check 2**: Did migration run successfully?
```sql
-- Run this query to verify
SELECT COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');
```
Should return: `column_count: 3`

**Check 3**: Is RLS blocking the query?
```sql
-- Temporarily disable RLS to test
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Try signing in again
-- If it works, re-enable and fix policies:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);
```

### CORS Error Persists?

**Check Edge Function Logs**:
```
1. Go to: Supabase Dashboard → Edge Functions → trial-welcome-email
2. Click "Logs" tab
3. Look for CORS-related errors
4. Verify function is deployed
```

**Test Function Manually**:
```bash
curl -X POST https://horlyscpspctvceddcup.supabase.co/functions/v1/trial-welcome-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test"}'
```

### Dashboard Still Loading Forever?

**Check Data Sync**:
```javascript
// Open browser console and run:
console.log('[DataSync] Status:', {
  isLoading: useStore.getState().isLoading,
  phase2Hydrated: useStore.getState().phase2Hydrated,
  bills: useStore.getState().bills.length,
  transactions: useStore.getState().transactions.length,
});
```

**Clear Cache**:
```
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear site data: DevTools → Application → Clear storage
3. Sign out and back in
```

---

## Files Modified

1. ✅ **FIX_TRIAL_COLUMNS.sql** - Database migration (run in Dashboard)
2. ✅ **src/pages/AuthCallback.tsx** - Enhanced error handling with retries
3. ℹ️ **supabase/functions/_shared/cors.ts** - Localhost detection (already done)
4. ℹ️ **OWEABLE_500_ERROR_FIX.md** - Complete diagnosis guide

---

## Success Criteria

After deployment, you should see:

- ✅ No 500 errors in browser console
- ✅ Successful sign-in with Google OAuth
- ✅ Trial activation log message
- ✅ Dashboard loads within 15 seconds
- ✅ No infinite loading spinner
- ✅ Welcome email Edge Function called (check logs)
- ✅ All data syncs properly (bills, transactions, etc.)

---

## Rollback Plan

If something goes wrong:

1. **Revert AuthCallback changes**:
   ```bash
   git checkout HEAD -- src/pages/AuthCallback.tsx
   npm run dev
   ```

2. **Disable trial activation temporarily**:
   ```typescript
   // In AuthCallback.tsx, comment out line 110:
   // await ensureReverseTrial(session);
   ```

3. **Database rollback** (if needed):
   ```sql
   -- Remove trial columns (only if causing issues)
   ALTER TABLE profiles DROP COLUMN IF EXISTS trial_started_at;
   ALTER TABLE profiles DROP COLUMN IF EXISTS trial_ends_at;
   ALTER TABLE profiles DROP COLUMN IF EXISTS trial_expired;
   ```

---

## Next Steps After Fix

1. **Monitor logs** for 24 hours to ensure no regressions
2. **Test on production** after deploying to Vercel
3. **Set up Sentry alerts** for 500 errors on profiles endpoint
4. **Add integration tests** for trial activation flow
5. **Document trial system** in README for future reference

---

**Status**: ✅ Ready to deploy - Just run the migration and test!
