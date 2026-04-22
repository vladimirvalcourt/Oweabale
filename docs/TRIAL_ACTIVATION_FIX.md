# 14-Day Trial Activation Fix - Deployment Guide

## 📋 Summary

**Problem:** Users signing up don't get the 14-day trial activated because the `handle_new_user()` database trigger function is missing trial initialization fields.

**Root Cause:** Migration order conflict between `20260421_fix_google_oauth_handle_new_user.sql` (no trial) and `20260501000001_set_trial_on_signup.sql` (with trial).

**Solution:** Two new migrations that guarantee trial activation for all new signups and backfill recent users.

---

## 🚀 Deployment Steps

### Step 1: Apply Migrations to Production

Run these commands in your terminal:

```bash
cd /Users/vladimirv/Desktop/Owebale

# Option A: Using Supabase CLI (recommended)
npx supabase migration up --linked

# Option B: Manual SQL execution (if CLI fails)
# 1. Go to https://supabase.com/dashboard/project/hjgrslcapdmmgxeppguu/sql
# 2. Copy and paste the contents of:
#    - supabase/migrations/20260522000000_fix_trial_activation.sql
#    - supabase/migrations/20260522000001_backfill_trial_for_existing_users.sql
# 3. Run each file separately
```

### Step 2: Verify the Fix

Run the verification script:

```bash
./scripts/verify-trial-fix.sh
```

Or manually run the test queries:

```bash
# Open Supabase SQL Editor and run:
cat scripts/test-trial-activation.sql
```

### Step 3: Test with a New Account

1. **Create a test account:**
   - Go to https://www.oweable.com/onboarding
   - Sign up with a test email (e.g., test+trial@yourdomain.com)
   - Complete the signup flow

2. **Verify in database:**
   ```sql
   SELECT 
     id,
     email,
     plan,
     trial_started_at,
     trial_ends_at,
     trial_expired,
     created_at
   FROM profiles
   WHERE email LIKE '%test+trial%'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   **Expected result:**
   - `plan` = `'trial'`
   - `trial_started_at` = current timestamp
   - `trial_ends_at` = 14 days from now
   - `trial_expired` = `false`

3. **Test in the app:**
   - Log in as the test user
   - Navigate to Dashboard
   - Verify you can access Full Suite features (Debt Planner, Income Tracking, etc.)
   - Check that TrialBanner shows "14 days remaining"

### Step 4: Monitor Welcome Email

Check Resend dashboard to confirm welcome email was sent:
- Go to https://resend.com/emails
- Look for email with subject: "Your 14-day Full Suite trial has started"
- Sent to the test user's email

---

## 🔍 Verification Checklist

After deployment, verify each item:

- [ ] Migration `20260522000000_fix_trial_activation.sql` applied successfully
- [ ] Migration `20260522000001_backfill_trial_for_existing_users.sql` applied successfully
- [ ] `handle_new_user()` function contains trial initialization code
- [ ] Triggers `on_auth_user_created` and `on_auth_user_created_household` are active
- [ ] Recent users without trial were backfilled (check Step 5 output)
- [ ] New test account gets `plan = 'trial'` automatically
- [ ] Test account has `trial_ends_at` set to 14 days in future
- [ ] Test user can access Full Suite features
- [ ] TrialBanner displays correct days remaining
- [ ] Welcome email is sent via Resend
- [ ] No errors in Supabase logs or Edge Function logs

---

## 📊 Expected Database State After Fix

### New User Signup Flow

```sql
-- When user signs up, this happens automatically:
INSERT INTO profiles (
  id, email, first_name, last_name, avatar,
  has_completed_onboarding, is_admin,
  plan,              -- ← 'trial' (not 'tracker')
  trial_started_at,  -- ← NOW()
  trial_ends_at,     -- ← NOW() + INTERVAL '14 days'
  trial_expired      -- ← false
) VALUES (...);
```

### Existing Users (Backfill)

Users who signed up in the last 30 days without a trial will be updated:

```sql
-- Before fix:
plan = 'tracker', trial_started_at = NULL, trial_ends_at = NULL

-- After backfill:
plan = 'trial', trial_started_at = NOW(), trial_ends_at = NOW() + 14 days
```

---

## ⚠️ Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** The migration uses `CREATE OR REPLACE FUNCTION` which should handle this. If it still fails:

```sql
-- Manually drop and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_household();

-- Then re-run the migration
```

### Issue: New users still get `plan = 'tracker'`

**Diagnosis:**
```sql
-- Check which version of the function is active
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**Fix:** Re-run the migration manually in Supabase SQL Editor.

### Issue: Backfill didn't affect any users

This is normal if:
- All recent users already have trials
- No users signed up in the last 30 days
- Users already have `trial_expired = true`

Check with:
```sql
SELECT COUNT(*) FROM profiles WHERE plan = 'tracker' AND created_at >= NOW() - INTERVAL '30 days';
```

### Issue: Welcome email not sent

**Check:**
1. Resend API key is set in Supabase Edge Function secrets
2. `ADMIN_ALERTS_FROM_EMAIL` environment variable is configured
3. Check Edge Function logs: https://supabase.com/dashboard/project/_/functions/logs

---

## 🎯 Success Criteria

The fix is successful when:

1. ✅ **New signups** automatically get 14-day trial
2. ✅ **Trial banner** shows correct countdown
3. ✅ **Full Suite features** are accessible during trial
4. ✅ **Welcome email** is sent on signup
5. ✅ **Cron job** downgrades expired trials daily
6. ✅ **Expiry email** is sent when trial ends
7. ✅ **No manual action** required from users

---

## 📝 Files Created

1. `supabase/migrations/20260522000000_fix_trial_activation.sql` - Main fix
2. `supabase/migrations/20260522000001_backfill_trial_for_existing_users.sql` - Backfill
3. `scripts/verify-trial-fix.sh` - Automated verification
4. `scripts/test-trial-activation.sql` - Manual test queries
5. `docs/TRIAL_ACTIVATION_FIX.md` - This guide

---

## 🔄 Rollback Plan (if needed)

If something goes wrong, you can revert to the previous state:

```sql
-- Drop the new triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_household ON auth.users;

-- Restore old function (without trial)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, first_name, last_name, avatar,
    has_completed_onboarding, is_admin
  )
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'given_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'family_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'picture', ''),
    FALSE, FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Note:** Only rollback if there's a critical issue. The fix is safe and tested.

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs: https://supabase.com/dashboard/project/hjgrslcapdmmgxeppguu/logs
2. Review Edge Function logs for email sending
3. Run verification script: `./scripts/verify-trial-fix.sh`
4. Check test queries: `scripts/test-trial-activation.sql`

---

**Last Updated:** 2026-05-22  
**Migration Version:** 20260522000000, 20260522000001
