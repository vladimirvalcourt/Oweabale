# 🚀 Quick Deploy: 14-Day Trial Fix

## TL;DR - Fix in 2 Minutes

### Step 1: Apply Fix (Choose ONE method)

**Method A: Supabase Dashboard (Easiest)**
1. Go to: https://supabase.com/dashboard/project/hjgrslcapdmmgxeppguu/sql/new
2. Open file: `scripts/apply-trial-fix-manual.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click "Run"
6. Verify you see: `✅ SUCCESS: Trial activation is configured`

**Method B: CLI (If configured)**
```bash
cd /Users/vladimirv/Desktop/Owebale
npx supabase migration up --linked
```

### Step 2: Test It Works

1. Create test account: https://www.oweable.com/onboarding
2. Use email: `test+trial@oweable.com`
3. After signup, run this SQL:

```sql
SELECT plan, trial_ends_at, trial_expired 
FROM profiles 
WHERE email = 'test+trial@oweable.com' 
ORDER BY created_at DESC LIMIT 1;
```

**Expected result:**
- `plan` = `'trial'` ✅
- `trial_ends_at` = 14 days from now ✅
- `trial_expired` = `false` ✅

### Step 3: Backfill Existing Users (Optional)

If you want to give recent users a trial too, run this in SQL Editor:

```sql
UPDATE public.profiles
SET 
  plan = 'trial',
  trial_started_at = NOW(),
  trial_ends_at = NOW() + INTERVAL '14 days',
  trial_expired = false
WHERE 
  plan = 'tracker' 
  AND trial_started_at IS NULL
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

## ✅ Verification Checklist

After deploying, check these boxes:

- [ ] Ran the fix SQL in Supabase dashboard
- [ ] Saw "✅ SUCCESS" message
- [ ] Created test account
- [ ] Test account has `plan = 'trial'`
- [ ] Test account can access Full Suite features
- [ ] TrialBanner shows "14 days remaining"
- [ ] Welcome email received (check Resend)

---

## 🆘 Something Wrong?

**Problem:** Still getting `plan = 'tracker'` on new signups

**Fix:** Re-run the SQL from Step 1, make sure there are no errors

---

**Problem:** Backfill affected 0 users

**This is normal** if:
- No users signed up in last 30 days
- All recent users already have trials
- Users already expired their trials

---

**Problem:** Welcome email not sending

**Check:**
1. Resend API key set in Supabase Edge Function secrets
2. Edge Function logs: https://supabase.com/dashboard/project/_/functions/logs
3. Email might be in spam folder

---

## 📞 Need Help?

- Full guide: `docs/TRIAL_ACTIVATION_FIX.md`
- Detailed report: `docs/TRIAL_FIX_REPORT.md`
- Test queries: `scripts/test-trial-activation.sql`
- Auto verification: `./scripts/verify-trial-fix.sh`

---

**That's it!** The fix should take less than 5 minutes total.
