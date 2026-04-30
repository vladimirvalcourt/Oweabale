# Security Fixes Deployment Checklist

## ✅ Completed (Committed & Pushed)

- [x] Input validation framework (validators.ts)
- [x] Security event logging (securityLogger.ts)
- [x] Configuration validator (configValidator.ts)
- [x] Rate limiting enhancements
- [x] CSP hardening (vercel.json)
- [x] Database migration for security_events table
- [x] Comprehensive documentation

**Commit:** `41e281e` - feat(security): implement comprehensive security audit fixes  
**Pushed to:** main branch ✓

---

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration
```bash
npx supabase db push
```

This creates the `security_events` table with:
- Immutable audit log structure
- RLS policies (admin-only read, system-only write)
- Indexes for efficient querying

**Verify:**
```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'security_events';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'security_events';
```

---

### Step 2: Add New Environment Variables

In **Supabase Dashboard** → Project Settings → Edge Functions → Secrets, add:

```
ADMIN_ALERTS_TO_EMAIL=support@oweable.com
ADMIN_ALERTS_FROM_EMAIL=alerts@oweable.com
```

These are used by the security logger to send email alerts for high/critical events.

---

### Step 3: Deploy Updated Edge Functions

The following functions were modified and need redeployment:

```bash
# Functions with new rate limiting imports
npx supabase functions deploy plaid-exchange --project-ref YOUR_REF
npx supabase functions deploy stripe-checkout-session --project-ref YOUR_REF

# All functions can now use new shared utilities (no redeploy needed unless modified)
```

**Note:** The new shared utilities (`validators.ts`, `securityLogger.ts`, `configValidator.ts`) are automatically available to all Edge Functions - no individual deployment needed.

---

### Step 4: Test CSP Changes

The CSP header was modified to remove `'unsafe-inline'` from `style-src`.

**Test thoroughly:**
1. Load all pages in browser
2. Open DevTools Console
3. Look for CSP violation warnings
4. Check that all styles render correctly
5. Test dynamic style injection (if any)

**If styles break:**
- Option A: Add specific nonces or hashes for inline styles
- Option B: Move inline styles to external CSS files
- Option C: Revert the change (keep `'unsafe-inline'`) if impact is too high

**Current status:** You reverted this change in vercel.json. Consider re-applying after testing in staging.

---

### Step 5: Verify Security Event Logging

After deployment, test the logging system:

```typescript
// In any Edge Function, add test log:
import { logSecurityEvent } from '../_shared/securityLogger.ts';

await logSecurityEvent(supabaseAdmin, {
  eventType: 'auth_failure',
  ipAddress: '127.0.0.1',
  endpoint: '/test',
  metadata: { test: true },
  severity: 'low',
});
```

**Verify in database:**
```sql
SELECT * FROM security_events ORDER BY created_at DESC LIMIT 10;
```

**Check email alerts:**
- Trigger a high-severity event
- Verify alert email received at ADMIN_ALERTS_TO_EMAIL

---

### Step 6: Monitor Security Metrics

Set up monitoring queries (run daily/weekly):

```sql
-- Authentication failures by IP (last 24 hours)
SELECT ip_address, COUNT(*) as failure_count
FROM security_events
WHERE event_type = 'auth_failure'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY failure_count DESC;

-- Rate limit violations (last 7 days)
SELECT DATE(created_at) as date, COUNT(*) as violations
FROM security_events
WHERE event_type = 'rate_limit_exceeded'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- High/Critical severity events (last 30 days)
SELECT event_type, severity, COUNT(*) as count
FROM security_events
WHERE severity IN ('high', 'critical')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type, severity
ORDER BY count DESC;
```

---

## 🧪 Testing Checklist

Before considering deployment complete:

- [ ] Database migration applied successfully
- [ ] security_events table exists with correct schema
- [ ] RLS policies working (admin can query, non-admin cannot)
- [ ] Environment variables set in Supabase Dashboard
- [ ] Edge Functions deployed without errors
- [ ] Test auth failure logging works
- [ ] Test rate limit logging works
- [ ] Email alerts received for high-severity events
- [ ] CSP changes tested (if re-applied)
- [ ] No regressions in Plaid link flow
- [ ] No regressions in Stripe checkout flow
- [ ] Zod validation rejects malformed inputs
- [ ] Config validation catches missing env vars

---

## 📊 Success Metrics

Track these metrics post-deployment:

1. **Security Events Captured:** Should see auth failures, rate limits, etc.
2. **Alert Response Time:** Time from event to admin notification
3. **False Positive Rate:** Legitimate requests blocked by validation
4. **Validation Error Rate:** % of requests rejected by Zod schemas
5. **Config Validation Failures:** Should be 0 after initial setup

---

## ⚠️ Rollback Plan

If issues arise:

1. **Revert database changes:**
   ```bash
   npx supabase db reset --local  # Only if critical issues
   ```

2. **Revert Edge Functions:**
   ```bash
   git revert 41e281e
   git push origin main
   npx supabase functions deploy plaid-exchange
   npx supabase functions deploy stripe-checkout-session
   ```

3. **Revert CSP (already done):**
   - Already reverted in vercel.json
   - Keep `'unsafe-inline'` until thorough testing completed

---

## 🎯 Next Steps (Post-Deployment)

### Week 1:
- Monitor security_events table daily
- Review alert emails for false positives
- Adjust rate limits if too aggressive/lenient

### Week 2:
- Implement pending medium-priority items:
  - Idempotency keys for Stripe payments
  - Response sanitization (DTO transformers)
  - Trial abuse prevention

### Month 1:
- Conduct penetration testing
- Review security events for patterns
- Update incident response procedures
- Schedule next quarterly audit

---

## 📞 Support

If you encounter issues during deployment:

1. Check Supabase Edge Function logs:
   ```bash
   npx supabase functions logs plaid-exchange --project-ref YOUR_REF
   ```

2. Review security_events table for errors:
   ```sql
   SELECT * FROM security_events 
   WHERE metadata->>'error' IS NOT NULL 
   ORDER BY created_at DESC LIMIT 20;
   ```

3. Contact security team lead for review

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  
**Status:** ☐ In Progress ☐ Complete ☐ Issues Found
