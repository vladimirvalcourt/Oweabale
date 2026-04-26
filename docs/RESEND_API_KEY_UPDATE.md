# Resend API Key Update - Action Required

## ✅ Local Configuration Updated

Your `.env.local` file has been updated with the new Resend API key:
```
RESEND_API_KEY=re_HVdmNvYm_4fVX9WmzgaNiJ1mLH32qh1et
```

---

## ⚠️ Manual Updates Required

Since `.env.local` is not committed to Git (for security), you need to manually update these services:

### 1. Vercel Environment Variables

**Go to:** https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Update or Add:**
```
RESEND_API_KEY=re_HVdmNvYm_4fVX9WmzgaNiJ1mLH32qh1et
```

**Settings:**
- **Environment:** Production, Preview (and Development if needed)
- **Type:** Mark as **SENSITIVE** 🔒 (encrypted)
- Click "Save"

**Or use Vercel CLI:**
```bash
vercel env add RESEND_API_KEY production --sensitive
vercel env add RESEND_API_KEY preview --sensitive
```

---

### 2. Supabase Edge Function Secrets

**Go to:** https://app.supabase.com → Your Project → Edge Functions → Secrets

**Update or Add:**
```
RESEND_API_KEY = re_HVdmNvYm_4fVX9WmzgaNiJ1mLH32qh1et
```

**Steps:**
1. Find existing `RESEND_API_KEY` secret
2. Click "Edit" or "Update"
3. Paste the new key
4. Save

**Or use Supabase CLI:**
```bash
supabase secrets set RESEND_API_KEY=re_HVdmNvYm_4fVX9WmzgaNiJ1mLH32qh1et --project-ref hjgrslcapdmmgxeppguu
```

---

### 3. Verify Domain Setup in Resend

**Go to:** https://resend.com/domains

**Check:**
- [ ] Domain `oweable.com` is verified
- [ ] DNS records are properly configured
- [ ] Status shows "Verified" (green checkmark)

**If domain is not verified yet:**
1. Click on `oweable.com`
2. Copy the DNS records Resend provides
3. Add them to your DNS provider (Vercel DNS settings)
4. Wait for verification (can take up to 48 hours)

---

### 4. Configure Email Sender

**In Resend Dashboard:**
1. Go to **Domains** → Select `oweable.com`
2. Ensure `noreply@oweable.com` is listed as an allowed sender
3. If not, add it manually under "Email Addresses" or "Senders"

---

## 🧪 Testing Checklist

After updating all services:

1. **Redeploy to Vercel** (if you haven't already)
   ```bash
   vercel --prod
   ```

2. **Test Email Sending:**
   - Submit the support contact form at `/support`
   - Create a test account to trigger welcome email
   - Check Resend dashboard for sent emails: https://resend.com/emails

3. **Verify Sender:**
   - Emails should come from: `noreply@oweable.com`
   - Check email headers to confirm

4. **Monitor Delivery:**
   - Check Resend dashboard for delivery status
   - Look for any bounces or failures
   - Monitor spam folder during testing

---

## 🔐 Security Notes

✅ **Good:** `.env.local` is gitignored  
✅ **Good:** API key marked as sensitive in Vercel  
⚠️ **Remember:** Never commit `.env.local` to Git  
⚠️ **Rotate regularly:** Update API keys periodically for security  

---

## 📞 Need Help?

- **Resend Docs:** https://resend.com/docs
- **Resend Support:** https://resend.com/docs/support
- **Vercel Env Vars:** https://vercel.com/docs/projects/environment-variables
- **Supabase Secrets:** https://supabase.com/docs/guides/functions/secrets

---

**Updated:** 2026-04-25  
**New API Key:** `re_HVdmNvYm_4fVX9WmzgaNiJ1mLH32qh1et`  
**From Email:** `noreply@oweable.com`
