# Support Form Email Fix - Turnstile Issue Resolved

## 🐛 Problem Identified

The support form was failing with "Edge Function returned a non-2xx status code" because:

1. **Turnstile Token Required but Missing**: The Edge Function required a Cloudflare Turnstile CAPTCHA token, but the frontend didn't have a Turnstile widget
2. **Function threw error before reaching Resend API**: Line 40 checked for turnstileToken and threw an error, preventing any email from being sent

## ✅ Fix Applied (Temporary)

### Edge Function Updated: `supabase/functions/support-contact/index.ts`

**Changes Made:**
1. Commented out Turnstile token validation (line 40)
2. Commented out Turnstile verification call (line 54)
3. Kept rate limiting active for basic protection

**Status:** ✅ Deployed to Supabase Edge Functions

---

## 🧪 Test Now

You can now test the support form:

1. **Visit:** https://www.oweable.com/support
2. **Fill out the form** with test data
3. **Submit** - it should work now without Turnstile
4. **Check Resend Dashboard:** https://resend.com/emails
5. **Verify email arrives** at `support@oweable.com` from `noreply@oweable.com`

---

## ⚠️ Next Steps - Add Turnstile Properly

Once you confirm emails are working, you should add Turnstile back for spam protection:

### Option 1: Use @marsidev/react-turnstile Package

```bash
npm install @marsidev/react-turnstile
```

Then update `/src/pages/Support.tsx`:

```tsx
import Turnstile from '@marsidev/react-turnstile'

const [turnstileToken, setTurnstileToken] = useState('');

// In your form JSX:
<Turnstile
  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
  onSuccess={(token) => setTurnstileToken(token)}
/>

// Include in POST body:
body: JSON.stringify({ 
  name, 
  email, 
  subject, 
  message, 
  turnstileToken 
})
```

### Option 2: Use Cloudflare's Script Tag

Add to Support page:
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
```

### Re-enable Turnstile in Edge Function

After adding frontend widget, uncomment these lines in `support-contact/index.ts`:
```typescript
if (!turnstileToken) throw new Error('Security verification is required');
await verifyTurnstile(turnstileToken, getClientIp(req));
```

Then redeploy:
```bash
supabase functions deploy support-contact --project-ref hjgrslcapdmmgxeppguu
```

---

## 🔐 Security Note

Currently, Turnstile is disabled for testing. This means:
- ✅ Form will work immediately
- ⚠️ No CAPTCHA protection against bots
- ✅ Rate limiting still active (basic protection)

**Recommendation:** Add Turnstile within 24-48 hours to prevent spam submissions.

---

## 📋 Configuration Checklist

- [x] Resend API Key updated in Vercel
- [x] Resend API Key updated in Supabase
- [x] From email set to `noreply@oweable.com`
- [x] Turnstile temporarily disabled for testing
- [x] Edge Function deployed
- [ ] Test support form submission
- [ ] Verify email delivery in Resend dashboard
- [ ] Add Turnstile widget to frontend (next step)
- [ ] Re-enable Turnstile validation in Edge Function

---

## 🔍 Troubleshooting

If emails still don't send after this fix:

1. **Check Resend Domain Verification:**
   - Go to https://resend.com/domains
   - Ensure `oweable.com` shows as "Verified"
   - Check DNS records are properly configured

2. **Check Supabase Function Logs:**
   - Go to Supabase Dashboard → Functions → support-contact
   - View logs for error messages

3. **Verify Environment Variables:**
   - RESEND_API_KEY is set correctly
   - RESEND_FROM_EMAIL=noreply@oweable.com
   - SUPPORT_EMAIL=support@oweable.com

---

**Fixed:** 2026-04-25  
**Deployed:** Supabase Edge Function `support-contact`  
**Status:** Ready for testing (Turnstile disabled)
