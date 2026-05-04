# Reverse Trial Deployment Checklist

## ✅ Pre-Deployment Verification

### Database & Backend
- [x] Migration `20260501000000_add_reverse_trial_fields.sql` deployed
- [x] Migration `20260501000001_set_trial_on_signup.sql` deployed
- [x] Auth trigger updated to set trial on new user creation
- [x] Expire-trials Edge Function deployed
- [x] Email functions deployed (trial-welcome, trial-warning, trial-expiry)
- [x] Vercel cron job configured (`.vercel/cron.json`)
- [x] API route created (`api/cron/expire-trials.ts`)

### Environment Variables
- [x] `VITE_PRICING_MONTHLY_DISPLAY=10.99` (Vercel + local)
- [x] `VITE_PRICING_YEARLY_DISPLAY=92.32` (Vercel + local)
- [x] `RESEND_API_KEY` set in Supabase secrets
- [x] `EXPIRE_TRIALS_CRON_SECRET` set in Supabase secrets
- [x] Email config vars set (`ADMIN_ALERTS_FROM_EMAIL`, etc.)

### Frontend Components
- [x] TrialBanner component created and integrated
- [x] TrialExpiryModal component created and integrated
- [x] useFullSuiteAccess hook updated with trial checking
- [x] trialHelpers.ts created with utility functions
- [x] Layout.tsx updated with trial components
- [x] Pricing page updated with trial messaging
- [x] Homepage pricing cards updated with trial info

---

## 🧪 Testing Checklist

### 1. New User Signup Flow
```
Steps:
1. Visit https://www.oweable.com/onboarding
2. Sign up with email or Google
3. Complete onboarding (no credit card requested ✓)
4. Check database: profiles table should show:
   - plan = 'trial'
   - trial_started_at = NOW()
   - trial_ends_at = NOW() + 14 days
   - trial_expired = false
```

**Expected Results:**
- ✅ No credit card collection during signup
- ✅ User redirected to dashboard after onboarding
- ✅ Trial banner appears at top of dashboard
- ✅ Full Suite features accessible

### 2. Trial Banner Display
```
Check in browser console:
- Days remaining calculated correctly
- Banner shows yellow (normal) or amber (≤4 days)
- "View plans →" link goes to /pricing
- Banner dismissible? (No - should persist until expiry)
```

**Expected Copy:**
- Normal (>4 days): "Full Suite trial — X days left. Upgrade to keep access"
- Urgent (≤4 days): "X day(s) left on your trial — your debt planner and income tools will lock. Keep them for $10/mo"

### 3. Feature Access During Trial
```
Test these features work for trial users:
- [ ] Debt Payoff Engine (/dashboard?tab=debt)
- [ ] Income Ledger (/income)
- [ ] Tax Estimation (/taxes)
- [ ] Budgets (/budgets)
- [ ] Analytics (/reports)
- [ ] Bank sync via Plaid (if enabled)
```

**Verification:**
```typescript
// In browser console (while logged in as trial user):
const { hasFullSuite } = useFullSuiteAccess();
console.log(hasFullSuite); // Should be true
```

### 4. Pricing Page
```
Visit: https://www.oweable.com/pricing
Check:
- [ ] Hero mentions "14-day Full Suite trial, no credit card required"
- [ ] Tracker tier CTA says "Start free — includes 14-day Full Suite trial"
- [ ] Full Suite shows $10.99/month
- [ ] Annual option shows $92.32/year ($7.69/mo effective)
- [ ] FAQ includes trial questions
```

### 5. Homepage
```
Visit: https://www.oweable.com/
Check:
- [ ] Hero copy mentions trial
- [ ] Pricing cards show trial messaging
- [ ] Free Tracker card: "Includes 14-day Full Suite trial — no card needed"
- [ ] Full Suite card: "Start with 14-day free trial, then $10.99/mo or $92.32/yr (save 30%)"
```

### 6. Email Sequence (Manual Test)
```
Day 0 Email (Trial Welcome):
- Triggered on new user signup
- Subject: "Your 14-day Full Suite trial has started"
- Contains feature overview and CTA to dashboard

Day 10 Email (Warning):
- Manually trigger: POST to trial-warning-email function
- Subject: "4 days left on your Full Suite trial"
- Contains upgrade pricing and urgency

Day 14 Email (Expiry):
- Sent automatically by expire-trials cron
- Subject: "Your Full Suite trial has ended"
- Lists what's still available on free tier
```

**Test Day 14 Email:**
```bash
curl -X POST https://hjgrslcapdmmgxeppguu.supabase.co/functions/v1/trial-expiry-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "Test"}'
```

### 7. Trial Expiry (Simulated)
```
To test expiry without waiting 14 days:

1. Update a test user in Supabase:
UPDATE profiles 
SET trial_ends_at = NOW() - INTERVAL '1 day',
    plan = 'trial',
    trial_expired = false
WHERE email = 'test@example.com';

2. Manually run expire-trials function:
POST https://hjgrslcapdmmgxeppguu.supabase.co/functions/v1/expire-trials
Headers: Authorization: Bearer YOUR_CRON_SECRET

3. Verify:
- User downgraded to plan = 'tracker'
- trial_expired = true
- Expiry modal appears on next login
- Full Suite features locked
```

### 8. Post-Expiry Modal
```
After trial expires:
- [ ] Modal appears once (tracked via localStorage)
- [ ] Shows "Your Full Suite trial has ended"
- [ ] Two CTAs: "Upgrade to Full Suite" and "Continue with free Tracker"
- [ ] Dismissing sets localStorage key
- [ ] Modal doesn't reappear after dismissal
```

**Verify localStorage:**
```javascript
// In browser console:
localStorage.getItem('trial-expiry-modal-seen-YOUR_USER_ID');
// Should be 'true' after dismissing
```

### 9. Cron Job Activation
```
After Vercel deployment:
1. Check Vercel Dashboard → Settings → Cron Jobs
2. Verify "/api/cron/expire-trials" is listed
3. Schedule: "0 0 * * *" (daily at midnight UTC)
4. Check logs after first run
```

**Monitor cron execution:**
```bash
# Check Vercel deployment logs
vercel logs --follow

# Or check Supabase function logs
supabase functions logs expire-trials
```

### 10. Stripe Integration (Future)
```
TODO - When ready to accept payments:
- [ ] Create annual price in Stripe: $92.32/year
- [ ] Update STRIPE_PRICE_PRO_YEARLY secret
- [ ] Test checkout flow
- [ ] Verify subscription activation updates profile.plan to 'full_suite'
```

---

## 🔍 Troubleshooting

### Issue: Trial banner not showing
**Check:**
1. User's profile has `plan = 'trial'`
2. `trial_ends_at` is in the future
3. `trial_expired = false`
4. Browser console for errors

**Fix:**
```sql
-- Reset test user to active trial
UPDATE profiles 
SET plan = 'trial',
    trial_started_at = NOW(),
    trial_ends_at = NOW() + INTERVAL '14 days',
    trial_expired = false
WHERE email = 'your@email.com';
```

### Issue: Features locked for trial user
**Check:**
1. `useFullSuiteAccess()` returns `hasFullSuite = true`
2. Profile query includes trial fields
3. No TypeScript errors in console

**Debug:**
```javascript
// In browser console while logged in:
import { useStore } from './store/useStore';
const user = useStore.getState().user;
console.log('User ID:', user?.id);

// Then check the hook directly
const result = await fetch('/api/check-access'); // if you create one
```

### Issue: Emails not sending
**Check:**
1. RESEND_API_KEY is set in Supabase secrets
2. Function logs show successful Resend API calls
3. Email addresses are valid

**Test manually:**
```bash
curl -X POST https://hjgrslcapdmmgxeppguu.supabase.co/functions/v1/trial-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "Test"}'
```

### Issue: Cron job not running
**Check:**
1. `.vercel/cron.json` exists and is valid JSON
2. Vercel deployment completed successfully
3. API route `/api/cron/expire-trials.ts` exists
4. EXPIRE_TRIALS_CRON_SECRET matches in both places

**Verify cron registration:**
- Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
- Should see "/api/cron/expire-trials" with schedule "0 0 * * *"

---

## 📊 Monitoring & Metrics

### Key Metrics to Track
1. **Trial Conversion Rate**: % of trial users who upgrade to paid
2. **Trial Completion Rate**: % who reach Day 14
3. **Churn After Trial**: % who downgrade vs stay on free tier
4. **Email Open Rates**: Day 0, Day 10, Day 14 emails
5. **Feature Usage During Trial**: Which features drive conversions

### Database Queries for Monitoring
```sql
-- Active trials count
SELECT COUNT(*) FROM profiles WHERE plan = 'trial' AND trial_expired = false;

-- Trials expiring in next 7 days
SELECT COUNT(*) FROM profiles 
WHERE plan = 'trial' 
  AND trial_expired = false 
  AND trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';

-- Conversion rate (trial → full_suite)
SELECT 
  COUNT(CASE WHEN plan = 'full_suite' THEN 1 END) * 100.0 / 
  NULLIF(COUNT(CASE WHEN plan IN ('trial', 'full_suite') THEN 1 END), 0) AS conversion_rate
FROM profiles
WHERE trial_started_at IS NOT NULL;

-- Average trial duration before conversion
SELECT AVG(EXTRACT(DAY FROM (updated_at - trial_started_at))) AS avg_days_to_convert
FROM profiles
WHERE plan = 'full_suite' AND trial_started_at IS NOT NULL;
```

---

## 🚀 Go-Live Checklist

Before announcing to users:

- [ ] All migrations deployed and verified
- [ ] Test user signup flow end-to-end
- [ ] Verify trial banner displays correctly
- [ ] Confirm all Full Suite features accessible during trial
- [ ] Test pricing page displays correct amounts
- [ ] Verify homepage trial messaging
- [ ] Send test emails (all 3 types)
- [ ] Simulate trial expiry and verify downgrade
- [ ] Confirm expiry modal appears and dismisses correctly
- [ ] Check Vercel cron job is registered
- [ ] Monitor first 24 hours for errors
- [ ] Set up alerts for cron job failures
- [ ] Prepare support docs for trial questions

---

## 📞 Support Preparation

### Common Questions & Answers

**Q: Do I need a credit card to start the trial?**
A: No. You get 14 days of Full Suite completely free, no credit card required.

**Q: What happens after 14 days?**
A: You'll automatically move to our free Tracker tier (bill tracking + ticket/fine management). You can upgrade anytime to keep Full Suite.

**Q: Can I extend my trial?**
A: The 14-day trial is available once per account. After it ends, you can upgrade to Full Suite or continue with the free Tracker tier.

**Q: Will I be charged automatically?**
A: No. We never collect your credit card during the trial. You must actively choose to upgrade and provide payment details.

**Q: What do I lose when the trial ends?**
A: You'll lose access to Debt Payoff Planner, Income Ledger, Tax Estimation, Budgets, and Analytics. You'll keep bill tracking, due-date alerts, and ticket/fine management forever.

---

## ✅ Final Sign-Off

**Completed By:** _________________  
**Date:** _________________  
**Status:** ☐ Ready for Launch | ☐ Needs Fixes | ☐ Blocked

**Notes:**
_________________________________
_________________________________
_________________________________
