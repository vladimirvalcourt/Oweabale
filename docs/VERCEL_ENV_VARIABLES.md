# Vercel Environment Variables Setup Guide

## Email Configuration Variables

Add these environment variables to your Vercel project settings:

### Steps to Add in Vercel Dashboard:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Oweable** project
3. Click **Settings** → **Environment Variables**
4. Add each variable below for **Production**, **Preview**, and **Development** environments as needed
5. Mark sensitive variables (API keys) as **Sensitive** (encrypted)

---

## Required Variables

### Email Addresses (Public - Safe to expose)
```
NEXT_PUBLIC_CONTACT_EMAIL=hello@oweable.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@oweable.com
```
- **Environments:** Production, Preview, Development
- **Type:** Regular (not sensitive)
- **Purpose:** Used in frontend for contact/support links with obfuscation

### Resend Configuration (Server-side only)
```
RESEND_FROM_EMAIL=noreply@oweable.com
RESEND_API_KEY=re_T42pByXQ_EpZR21RAaFYoCkAkmgMR5ECF
```
- **Environments:** Production, Preview
- **Type:** 
  - `RESEND_FROM_EMAIL`: Regular
  - `RESEND_API_KEY`: **SENSITIVE** (encrypt this!)
- **Purpose:** Transactional emails from Resend (password reset, trial emails, receipts)

### Admin Alerts (Server-side only)
```
ADMIN_ALERTS_FROM_EMAIL=alerts@oweable.com
ADMIN_ALERTS_TO_EMAIL=support@oweable.com
```
- **Environments:** Production, Preview
- **Type:** Regular
- **Purpose:** Internal admin alert emails

### Support Email (Both frontend and backend)
```
SUPPORT_EMAIL=support@oweable.com
VITE_SUPPORT_EMAIL=support@oweable.com
```
- **Environments:** Production, Preview, Development
- **Type:** Regular
- **Purpose:** Support contact routing

---

## Complete List Summary

Copy-paste ready for Vercel CLI or dashboard:

```bash
# Public email addresses (frontend)
NEXT_PUBLIC_CONTACT_EMAIL=hello@oweable.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@oweable.com

# Resend email service
RESEND_FROM_EMAIL=noreply@oweable.com
RESEND_API_KEY=re_T42pByXQ_EpZR21RAaFYoCkAkmgMR5ECF  # MARK AS SENSITIVE

# Admin alerts
ADMIN_ALERTS_FROM_EMAIL=alerts@oweable.com
ADMIN_ALERTS_TO_EMAIL=support@oweable.com

# Support routing
SUPPORT_EMAIL=support@oweable.com
VITE_SUPPORT_EMAIL=support@oweable.com
```

---

## Using Vercel CLI

You can also set these via the Vercel CLI:

```bash
# Public variables
vercel env add NEXT_PUBLIC_CONTACT_EMAIL production
vercel env add NEXT_PUBLIC_CONTACT_EMAIL preview
vercel env add NEXT_PUBLIC_CONTACT_EMAIL development

vercel env add NEXT_PUBLIC_SUPPORT_EMAIL production
vercel env add NEXT_PUBLIC_SUPPORT_EMAIL preview
vercel env add NEXT_PUBLIC_SUPPORT_EMAIL development

# Server-side variables
vercel env add RESEND_FROM_EMAIL production
vercel env add RESEND_FROM_EMAIL preview

vercel env add ADMIN_ALERTS_FROM_EMAIL production
vercel env add ADMIN_ALERTS_FROM_EMAIL preview

vercel env add ADMIN_ALERTS_TO_EMAIL production
vercel env add ADMIN_ALERTS_TO_EMAIL preview

vercel env add SUPPORT_EMAIL production
vercel env add SUPPORT_EMAIL preview
vercel env add SUPPORT_EMAIL development

vercel env add VITE_SUPPORT_EMAIL production
vercel env add VITE_SUPPORT_EMAIL preview
vercel env add VITE_SUPPORT_EMAIL development

# Sensitive variables (use --sensitive flag)
vercel env add RESEND_API_KEY production --sensitive
vercel env add RESEND_API_KEY preview --sensitive
```

---

## Important Notes

⚠️ **Never commit `.env.local` to Git** - It's already in `.gitignore`

⚠️ **Mark API keys as Sensitive** in Vercel Dashboard to encrypt them at rest

✅ **Test after deployment** - Verify emails are sent correctly from `noreply@oweable.com`

✅ **DNS records required** - Make sure you've added the iCloud Mail DNS records (see `docs/ICLOUD_MAIL_DNS_SETUP.md`)

✅ **Resend domain verification** - Ensure `oweable.com` is verified in your Resend account and `noreply@oweable.com` is a valid sender

---

## Verification Checklist

After adding these variables:

- [ ] All variables added to Vercel (Production environment)
- [ ] `RESEND_API_KEY` marked as Sensitive
- [ ] Redeployed the application
- [ ] Tested contact form submission
- [ ] Verified transactional emails come from `noreply@oweable.com`
- [ ] Checked that no raw email addresses appear in HTML source
- [ ] Confirmed DNS records are configured (MX, TXT, CNAME)

---

**Last Updated:** 2026-04-25  
**Project:** Oweable  
**Domain:** oweable.com
