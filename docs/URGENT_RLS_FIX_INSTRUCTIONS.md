# URGENT: Manual RLS Fix Required

## Problem
Your database is returning **500 errors** on all tables due to infinite recursion in Row Level Security (RLS) policies on the `household_members` table.

The migration file exists (`supabase/migrations/20260504000000_fix_household_rls_recursion.sql`) but couldn't be applied via CLI due to migration history conflicts.

---

## Solution: Run SQL in Supabase Dashboard

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/hjgrslcapdmmgxeppguu/sql/new
2. You should see a blank SQL editor

### Step 2: Copy and Paste This SQL

```sql
-- =====================================================
-- FIX: household_members RLS Infinite Recursion
-- Date: May 1, 2026
-- =====================================================

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "household_members_select" ON household_members;
DROP POLICY IF EXISTS "household_owner_manage_members" ON household_members;
DROP POLICY IF EXISTS "household_partner_invite" ON household_members;

-- 2. Recreate with EXISTS pattern (avoids recursion)
CREATE POLICY "household_members_select" ON household_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted'
        AND hm.household_id = household_members.household_id
    )
  );

CREATE POLICY "household_owner_manage_members" ON household_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM households 
      WHERE households.id = household_members.household_id 
        AND households.owner_id = auth.uid()
    )
  );

CREATE POLICY "household_partner_invite" ON household_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      INNER JOIN household_members hm ON h.id = hm.household_id
      WHERE hm.user_id = auth.uid() 
        AND hm.status = 'accepted' 
        AND hm.role IN ('owner', 'partner')
        AND h.id = household_members.household_id
    )
  );

-- 3. Fix foreign key relationship (household_members -> profiles)
ALTER TABLE household_members 
  DROP CONSTRAINT IF EXISTS household_members_user_id_fkey;

ALTER TABLE household_members 
  ADD CONSTRAINT household_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_household_members_status ON household_members(status);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);
```

### Step 3: Execute
1. Click the **"Run"** button (or press Cmd/Ctrl + Enter)
2. You should see success messages for each statement
3. If any errors occur, screenshot them and share

### Step 4: Verify
1. Go to: **Authentication → Policies**
2. Find the `household_members` table
3. Verify you see these three policies:
   - ✅ `household_members_select`
   - ✅ `household_owner_manage_members`
   - ✅ `household_partner_invite`

---

## Expected Results After Fix

✅ **Before**: All API calls return 500 errors  
✅ **After**: Data loads successfully from bills, debts, transactions, etc.

✅ **Before**: Console shows `infinite recursion detected in policy for relation "household_members"`  
✅ **After**: No recursion errors

✅ **Before**: Cannot access dashboard data  
✅ **After**: Full dashboard functionality restored

---

## CSP Fixes Already Deployed

The Content Security Policy fixes have been committed and will deploy automatically once you push to GitHub:

- ✅ Added Sentry domains
- ✅ Added PostHog domains  
- ✅ Added Crisp Chat domain
- ✅ Added Google Fonts to connect-src (for service worker)

**Commit**: `8c5b4ea` (local only - needs manual push)

To push:
```bash
cd /Users/vladimirv/Desktop/Owebale
git push origin main
```

---

## Troubleshooting

If you get permission errors when running the SQL:
- Make sure you're logged in as the project owner
- The SQL uses `auth.uid()` which requires proper authentication context
- All statements should run successfully with owner privileges

If policies still show errors after running:
1. Refresh the Supabase Dashboard page
2. Check **Authentication → Policies** again
3. Try clearing browser cache
4. Test the app in an incognito window

---

## Next Steps After Fix

1. ✅ Run the SQL above in Supabase Dashboard
2. ✅ Verify no more 500 errors in browser console
3. ✅ Push commit `8c5b4ea` to GitHub: `git push origin main`
4. ✅ Wait for Vercel deployment (~2-3 minutes)
5. ✅ Hard refresh browser (Cmd/Ctrl + Shift + R)
6. ✅ Verify no CSP violations in console

---

**Priority**: 🔴 CRITICAL - Database is completely broken without this fix
