# 🚨 Dashboard Sync Stuck - Quick Diagnostic Guide

## Immediate Checks (Do These First)

### 1. Check Browser Console for Errors
Open http://localhost:3000 → DevTools (F12) → Console tab

**Look for these errors:**
- ❌ `500` error on profiles query → **Migration not run**
- ❌ `401` or `403` error → **RLS policy blocking access**
- ❌ `SAFETY TIMEOUT` warning → **Queries hanging (network/RLS issue)**
- ❌ `Missing columns detected` → **Trial columns don't exist**

### 2. Verify Database Migration Was Run

Go to: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new

Run this verification query:
```sql
-- Check if trial columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');
```

**Expected Result**: 3 rows returned
- If 0 rows → **MIGRATION NOT RUN** (see Step 3 below)
- If 1-2 rows → **PARTIAL MIGRATION** (run full migration again)

### 3. Run the Migration (If Not Done)

**File**: [FIX_TRIAL_COLUMNS.sql](file:///Users/vladimirv/Desktop/Owebale/FIX_TRIAL_COLUMNS.sql)

```bash
1. Open: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new
2. Copy ALL content from FIX_TRIAL_COLUMNS.sql
3. Paste into SQL Editor
4. Click "Run"
5. Verify output shows:
   ✅ status: "✅ Migration complete!"
   ✅ trial_columns_count: 3
   ✅ rls_policy_count: 1
```

### 4. Check RLS Policies

Run this in Supabase SQL Editor:
```sql
-- Check all RLS policies on profiles table
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

**Expected Result**: At least these policies:
- "Users can view own profile" (SELECT)
- "Users can update own profile" (UPDATE)
- "Users can insert own profile" (INSERT)

**If NO policies exist**, run:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);
```

### 5. Test Profile Query Manually

First, get your user ID:
```sql
-- Get your user ID from auth.users
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
```

Then test the query (replace YOUR_USER_ID):
```sql
-- This should return 1 row without errors
SELECT id, plan, trial_started_at, trial_ends_at, trial_expired 
FROM profiles 
WHERE id = 'YOUR_USER_ID_HERE';
```

**If this fails with 500** → Columns missing (run migration)  
**If this returns empty** → Profile doesn't exist (auth trigger broken)  
**If this succeeds** → Database is fine, issue is frontend

---

## Common Scenarios & Fixes

### Scenario A: "Database setup incomplete" toast appears
**Cause**: Missing trial columns  
**Fix**: Run FIX_TRIAL_COLUMNS.sql migration

### Scenario B: Infinite loading spinner (>15 seconds)
**Cause**: RLS blocking queries or network timeout  
**Fix**: 
1. Check RLS policies (Step 4 above)
2. Temporarily disable RLS to test:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```
3. Refresh dashboard - if it loads, RLS is the issue
4. Re-enable and fix policies:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

### Scenario C: AuthCallback stuck in retry loop
**Cause**: Profile query returning 500 repeatedly  
**Fix**: 
1. Check browser console for error details
2. Look for error code (42703 = missing column)
3. Run migration if needed

### Scenario D: Dashboard loads but no data
**Cause**: Phase 2 queries failing (bills, transactions, etc.)  
**Fix**:
1. Check console for specific table errors
2. Verify those tables have RLS policies:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

---

## Nuclear Option: Complete Reset

If nothing else works, do a complete database reset:

### Step 1: Clean Old Tables
```bash
1. Open: https://supabase.com/dashboard/project/horlyscpspctvceddcup/sql/new
2. Copy content from: CLEANUP_OLD_TABLES.sql
3. Run it
4. Verify: remaining_tables = 0
```

### Step 2: Fresh Setup
```bash
1. Copy content from: COMPLETE_DB_SETUP.sql
2. Run it
3. Verify: 19 tables created, 23 policies created
```

### Step 3: Sign Out & Back In
```bash
1. Go to http://localhost:3000
2. Sign out completely
3. Clear browser cache (Cmd+Shift+R)
4. Sign in with Google OAuth
5. Watch console for successful trial activation
```

---

## Quick Diagnostic Commands

Copy-paste these into Supabase SQL Editor to check everything at once:

```sql
-- === COMPREHENSIVE DIAGNOSTIC ===

-- 1. Check trial columns
SELECT 'TRIAL COLUMNS' as check_name, 
       COUNT(*) as count,
       CASE WHEN COUNT(*) = 3 THEN '✅ OK' ELSE '❌ MISSING' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('trial_started_at', 'trial_ends_at', 'trial_expired');

-- 2. Check RLS enabled
SELECT 'RLS ENABLED' as check_name,
       CASE WHEN relrowsecurity THEN '✅ YES' ELSE '❌ NO' END as status
FROM pg_class 
WHERE relname = 'profiles';

-- 3. Check SELECT policy exists
SELECT 'SELECT POLICY' as check_name,
       COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT';

-- 4. Check auth trigger
SELECT 'AUTH TRIGGER' as check_name,
       COUNT(*) as count,
       CASE WHEN COUNT(*) > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 5. Count total tables
SELECT 'TOTAL TABLES' as check_name,
       COUNT(*) as count,
       CASE WHEN COUNT(*) >= 19 THEN '✅ OK' ELSE '⚠️ LOW' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 6. Count total policies
SELECT 'TOTAL POLICIES' as check_name,
       COUNT(*) as count,
       CASE WHEN COUNT(*) >= 20 THEN '✅ OK' ELSE '⚠️ LOW' END as status
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## What to Share If Still Stuck

If none of this works, share these details:

1. **Browser Console Errors** (screenshot or copy-paste)
2. **Diagnostic Query Results** (from above)
3. **Network Tab** → Filter by "profiles" → Show request/response
4. **AuthCallback Logs** → Look for `[AuthCallback]` messages
5. **Are you signed in?** → Check localStorage for `sb-*` keys

---

## Most Likely Fix (90% of cases)

**Just run the migration!** 

1. Open Supabase Dashboard SQL Editor
2. Copy FIX_TRIAL_COLUMNS.sql content
3. Run it
4. Sign out and back in
5. Dashboard should load

---

**Status**: Follow steps 1-5 above, starting with checking browser console errors
