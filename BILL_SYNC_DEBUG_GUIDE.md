# Bill Sync Debugging Guide

## Problem
When adding a bill, it fails to sync to the database.

## Solution Implemented
Added comprehensive debug logging to track the entire bill synchronization process.

---

## How to Debug

### 1. Open Browser Console
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux)
- Go to the **Console** tab

### 2. Filter Logs
In the console filter box, type one of these:
- `[addBill]` - See bill insertion logs
- `[fetchData]` - See data fetching logs
- `bill` - See all bill-related logs

### 3. Add a Bill and Watch the Logs

When you add a bill, you should see these logs in order:

```
[addBill] Starting bill sync: {biller: "...", amount: ..., ...}
[addBill] User ID: abc-123-def-456
[addBill] Inserting to DB: {biller: "...", user_id: "...", ...}
[addBill] Success! New ID: xyz-789-uvw-012
[addBill] Local state updated
```

### 4. Common Error Patterns

#### ❌ Error: No User ID
```
[addBill] User ID: undefined
[addBill] No user ID found - saving locally only
```
**Fix**: You're not logged in. Sign in first.

---

#### ❌ Error: Database Constraint Violation
```
[addBill] Database error: {code: "23502", message: "null value in column..."}
```
**Fix**: A required field is missing. Check that:
- `biller` is not empty
- `amount` is greater than 0
- `dueDate` is provided

---

#### ❌ Error: RLS Policy Violation
```
[addBill] Database error: {code: "42501", message: "new row violates row-level security policy"}
```
**Fix**: The RLS policy is blocking the insert. This means:
- The `user_id` doesn't match the authenticated user
- The bills table might not have proper RLS policies

**Solution**: Run this SQL in Supabase SQL Editor:
```sql
-- Verify RLS is enabled
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Recreate the policy
DROP POLICY IF EXISTS "Users can manage their own bills" ON bills;
CREATE POLICY "Users can manage their own bills" 
  ON bills FOR ALL 
  USING (auth.uid() = user_id);
```

---

#### ❌ Error: Table Doesn't Exist
```
[addBill] Database error: {code: "42P01", message: "relation \"bills\" does not exist"}
```
**Fix**: The bills table hasn't been created yet.

**Solution**: Apply migrations:
```bash
cd /Users/vladimirv/Desktop/Owebale
supabase db push
```

Or manually run the schema from `src/lib/supabase_schema.sql` in Supabase SQL Editor.

---

#### ❌ Error: Network/Connection Issue
```
[addBill] Database error: {message: "Failed to fetch"}
```
**Fix**: Check your internet connection and Supabase credentials in `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

---

### 5. Verify Bills Are Loading

After page refresh, check the fetchData logs:

```
[fetchData] Starting data fetch for user: abc-123
[fetchData] Fetching bills...
[fetchData] Bills fetched successfully: 5 bills
```

If you see:
```
[fetchData] Bills fetch error: {...}
```

Check the error details for the root cause.

---

## Quick Diagnostic Checklist

Run through these checks:

### ✅ 1. Is the user authenticated?
```javascript
// In console:
const { data } = await supabase.auth.getSession();
console.log('User:', data.session?.user?.id);
```
Should show a UUID, not `undefined`.

---

### ✅ 2. Does the bills table exist?
```javascript
// In console:
const { data, error } = await supabase.from('bills').select('*').limit(1);
console.log('Table exists:', !error);
console.log('Error:', error);
```

---

### ✅ 3. Can you insert manually?
```javascript
// In console:
const { data: { session } } = await supabase.auth.getSession();
const { data, error } = await supabase.from('bills').insert({
  biller: 'Test Bill',
  amount: 100,
  due_date: '2026-05-01',
  frequency: 'Monthly',
  status: 'upcoming',
  auto_pay: false,
  user_id: session.user.id
}).select();

console.log('Insert result:', data);
console.log('Error:', error);
```

If this works but the UI doesn't, the issue is in the form data.
If this fails, the issue is with the database/RLS.

---

### ✅ 4. Check RLS policies
```sql
-- In Supabase SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'bills';
```

Should show:
```
policyname: "Users can manage their own bills"
cmd: ALL
roles: {authenticated}
qual: (auth.uid() = user_id)
```

---

## Most Likely Causes (Ranked)

1. **RLS Policy Missing/Wrong** (70% chance)
   - Solution: Recreate RLS policy as shown above

2. **Migrations Not Applied** (20% chance)
   - Solution: Run `supabase db push`

3. **User Not Authenticated** (5% chance)
   - Solution: Sign in again

4. **Invalid Data** (5% chance)
   - Solution: Check console for validation errors

---

## Next Steps After Debugging

Once you identify the error:

1. **Copy the full error message** from the console
2. **Share it** and I'll provide the exact fix
3. **Or try the solutions above** based on the error code

---

## Remove Debug Logs Later

When the issue is fixed, we can clean up the console logs by removing the `console.log()` statements to keep production code clean.
