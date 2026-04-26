# Email Integration Deployment Checklist

## Pre-Deployment Setup

### 1. Vercel Environment Variables ⚠️ REQUIRED

Add these to Vercel Dashboard → Settings → Environment Variables:

```bash
# Production Environment
NEXT_PUBLIC_CONTACT_EMAIL=hello@oweable.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@oweable.com
RESEND_FROM_EMAIL=noreply@oweable.com
RESEND_API_KEY=REDACTED_RESEND_API_KEY  # Mark as SENSITIVE
ADMIN_ALERTS_FROM_EMAIL=alerts@oweable.com
ADMIN_ALERTS_TO_EMAIL=support@oweable.com
SUPPORT_EMAIL=support@oweable.com
VITE_SUPPORT_EMAIL=support@oweable.com
```

**Repeat for Preview and Development environments as needed.**

📖 **Full Guide:** See `docs/VERCEL_ENV_VARIABLES.md`

---

### 2. DNS Records Configuration ⚠️ REQUIRED

Add these DNS records in Vercel Dashboard → Settings → Domains → DNS:

#### MX Records (Mail Exchange)
```
Type: MX    Name: @    Value: mx01.mail.icloud.com.    Priority: 10
Type: MX    Name: @    Value: mx02.mail.icloud.com.    Priority: 10
```

#### TXT Records
```
Type: TXT   Name: @    Value: apple-domain=XY9t8t4YOhaXsF8K
Type: TXT   Name: @    Value: v=spf1 include:icloud.com ~all
```

#### CNAME Record (DKIM)
```
Type: CNAME Name: sig1._domainkey    Value: sig1.dkim.www.oweable.com.at.icloudmailadmin.com.
```

⏱️ **Propagation Time:** Up to 48 hours (usually faster)

📖 **Full Guide:** See `docs/ICLOUD_MAIL_DNS_SETUP.md`

---

### 3. Resend Domain Verification ⚠️ REQUIRED

1. Log into [Resend Dashboard](https://resend.com)
2. Go to **Domains** section
3. Verify `oweable.com` is added and verified
4. Ensure `noreply@oweable.com` is configured as an allowed sender
5. Check domain DNS records match what Resend requires

---

## Deployment Steps

### Step 1: Commit Changes
```bash
git add .
git commit -m "feat: integrate domain emails with obfuscation and security"
git push origin main
```

### Step 2: Deploy to Vercel
Vercel will automatically deploy when you push to `main` branch.

Or manually trigger:
```bash
vercel --prod
```

### Step 3: Wait for Build
Monitor deployment at: https://vercel.com/dashboard

---

## Post-Deployment Verification

### ✅ Functional Tests

- [ ] **Support Form Submission**
  - Visit `/support` page
  - Fill out and submit the contact form
  - Verify email arrives at `support@oweable.com`
  - Check it's sent from `noreply@oweable.com`

- [ ] **Trial Welcome Email**
  - Create a new test account
  - Verify welcome email arrives
  - Confirm sender is `noreply@oweable.com`

- [ ] **Contact Button Functionality**
  - Click "Get Help" button on Support page
  - Verify mailto link opens email client
  - Check correct email address in mailto

- [ ] **Email Obfuscation Check**
  - Right-click → View Page Source on Support page
  - Search for "@oweable.com"
  - Should find ZERO results in raw HTML
  - Emails should only appear after JavaScript execution

### ✅ Security Checks

- [ ] **No Raw Emails in Source**
  ```bash
  # Check rendered HTML
  curl https://www.oweable.com/support | grep -i "@oweable.com"
  # Should return nothing
  
  curl https://www.oweable.com/privacy | grep -i "@oweable.com"
  # Should return nothing
  
  curl https://www.oweable.com/security | grep -i "@oweable.com"
  # Should return nothing
  ```

- [ ] **Environment Variables Secure**
  - Verify `RESEND_API_KEY` is marked as Sensitive in Vercel
  - Check `.env.local` is in `.gitignore`
  - Confirm no env vars committed to Git

- [ ] **DNS Records Active**
  ```bash
  dig oweable.com MX
  dig oweable.com TXT
  dig sig1._domainkey.oweable.com CNAME
  ```

### ✅ Accessibility Tests

- [ ] **Screen Reader Compatibility**
  - Test with VoiceOver (Mac) or NVDA (Windows)
  - Verify aria-labels read full email addresses
  - Check buttons are properly labeled

- [ ] **Keyboard Navigation**
  - Tab through all contact buttons
  - Verify focus states visible
  - Test Enter/Space activation

### ✅ Cross-Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Android Chrome)

---

## Monitoring & Maintenance

### First Week After Deployment

- [ ] Monitor Resend dashboard for delivery rates
- [ ] Check for bounced emails
- [ ] Review support ticket volume
- [ ] Verify no spam complaints
- [ ] Check email open rates (if tracking enabled)

### Ongoing

- [ ] Monthly: Review email deliverability metrics
- [ ] Quarterly: Audit email obfuscation effectiveness
- [ ] As needed: Update email addresses via environment variables

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Revert Environment Variables**
   - Restore previous values in Vercel dashboard
   - Redeploy

3. **Common Issues & Fixes**
   
   **Issue:** Emails not sending
   - Check `RESEND_API_KEY` is correct
   - Verify domain verification in Resend
   - Check Vercel function logs
   
   **Issue:** DNS not propagating
   - Wait up to 48 hours
   - Verify records in Vercel DNS settings
   - Use `dig` commands to check status
   
   **Issue:** Obfuscation breaking UX
   - Check browser console for errors
   - Verify `emailObfuscation.tsx` imports correctly
   - Test with JavaScript disabled (graceful degradation)

---

## Success Criteria

Deployment is successful when:

✅ All transactional emails send from `noreply@oweable.com`  
✅ No raw email addresses visible in HTML source  
✅ Contact buttons work correctly on all pages  
✅ Support form submissions arrive correctly  
✅ DNS records fully propagated  
✅ Resend domain verified and active  
✅ No accessibility regressions  
✅ All tests passing  

---

## Emergency Contacts

- **Resend Support:** https://resend.com/docs/support
- **Vercel Support:** https://vercel.com/support
- **iCloud Mail Admin:** https://www.icloud.com/mail

---

**Created:** 2026-04-25  
**Last Updated:** 2026-04-25  
**Project:** Oweable
