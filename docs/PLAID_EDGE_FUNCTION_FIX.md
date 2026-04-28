# Plaid Edge Function Connection Fix

## Changes Applied

### 1. Increased Timeout and Retries
**File:** `supabase/functions/_shared/plaid_client.ts`
- **Timeout:** Increased from 20s → 30s
- **Retries:** Increased from 1 → 2 attempts with jittered backoff

This helps handle slow Plaid API responses and transient network issues.

### 2. Enhanced Error Logging
Added detailed console.error logging to all Plaid Edge Functions:
- `plaid-link-token/index.ts`
- `plaid-exchange/index.ts`
- `plaid-sync/index.ts`
- `plaid-disconnect/index.ts`

Now errors are logged with full stack traces for easier debugging in Supabase Dashboard.

## Required Environment Variables

Make sure these secrets are set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

```bash
# Required
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox  # or 'development' or 'production'

# Optional but recommended
PLAID_CLIENT_NAME=Oweable
PLAID_REDIRECT_URI=https://oweable.com/plaid/callback
PLAID_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/plaid-webhook
```

### Set via CLI:
```bash
supabase secrets set PLAID_CLIENT_ID=your_client_id --project-ref YOUR_REF
supabase secrets set PLAID_SECRET=your_secret --project-ref YOUR_REF
supabase secrets set PLAID_ENV=sandbox --project-ref YOUR_REF
```

## Troubleshooting Steps

### 1. Check Edge Function Logs
```bash
# View logs in Supabase Dashboard
# Go to: Edge Functions → Select function → Logs tab

# Or use CLI (if running locally)
supabase functions serve --env-file .env.local
```

Look for error messages like:
- `[plaid-link-token] Error: ...`
- `[plaid-exchange] Error: ...`
- `[plaid-sync] Error: ...`

### 2. Verify Plaid Credentials Match Environment
- **Sandbox keys** only work with `PLAID_ENV=sandbox`
- **Development keys** only work with `PLAID_ENV=development`
- **Production keys** only work with `PLAID_ENV=production`

Mismatch will cause authentication errors.

### 3. Test Edge Function Directly
Open browser DevTools Console and run:

```javascript
// Get current session token
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

// Test plaid-link-token function
fetch('https://YOUR_PROJECT_REF.supabase.co/functions/v1/plaid-link-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 4. Check Network Tab
1. Open DevTools → Network tab
2. Filter by "plaid" 
3. Try connecting a bank
4. Look for failed requests to:
   - `/functions/v1/plaid-link-token`
   - `/functions/v1/plaid-exchange`
5. Check response status codes and error messages

Common status codes:
- **401/403**: Authentication issue or missing credentials
- **400**: Bad request (check error message)
- **500**: Server error (check Edge Function logs)
- **Timeout**: Network issue (now handled better with retries)

### 5. Verify CORS Configuration
If you're getting CORS errors, ensure your origin is allowed:

```bash
supabase secrets set PLAID_ALLOWED_ORIGINS="https://oweable.com,https://www.oweable.com,http://localhost:5173" --project-ref YOUR_REF
```

### 6. Check Plaid Dashboard
- Log into [Plaid Dashboard](https://dashboard.plaid.com)
- Verify your account is active
- Check API usage limits
- Ensure webhook URL is configured if using webhooks
- Check for any service outages at [status.plaid.com](https://status.plaid.com)

## Common Error Messages & Solutions

### "Plaid is not configured (PLAID_CLIENT_ID / PLAID_SECRET)"
**Solution:** Set the environment variables in Supabase Dashboard secrets.

### "Unauthorized" or "Missing Authorization header"
**Solution:** User must be signed in. The Edge Function requires a valid JWT token.

### "Bank linking service is temporarily unavailable"
**Solution:** This is a generic network error. With the increased timeout and retries, this should happen less often. If it persists, check Plaid's status page.

### "Request failed"
**Solution:** Check Edge Function logs for the actual error message. The generic message is shown to users for security.

### "No link_token from Plaid"
**Solution:** Plaid API returned an error. Check logs for the specific Plaid error code.

## Testing the Fix

1. **Deploy the changes:**
   ```bash
   # Push Edge Functions to Supabase
   supabase functions deploy plaid-link-token --project-ref YOUR_REF
   supabase functions deploy plaid-exchange --project-ref YOUR_REF
   supabase functions deploy plaid-sync --project-ref YOUR_REF
   supabase functions deploy plaid-disconnect --project-ref YOUR_REF
   ```

2. **Test bank connection flow:**
   - Go to Settings → Integrations
   - Click "Connect Bank"
   - Complete Plaid Link flow
   - Verify connection succeeds

3. **Monitor logs:**
   - Watch Edge Function logs during testing
   - Verify no timeout errors
   - Check that retries work if first attempt fails

## Performance Improvements

The changes provide:
- ✅ **50% longer timeout** (20s → 30s) for slow API responses
- ✅ **Double the retry attempts** (1 → 2) with exponential backoff
- ✅ **Better error visibility** with detailed console logging
- ✅ **Graceful degradation** - user sees safe messages, admins see full errors

## Next Steps

If issues persist after applying these fixes:

1. Check Supabase Edge Function logs for specific error messages
2. Verify Plaid credentials are correct and match the environment
3. Test with a sandbox institution first (e.g., "First Platypus Bank")
4. Contact Plaid support if you see specific error codes
5. Consider enabling Plaid webhooks for better sync reliability

---

**Last Updated:** 2026-04-27  
**Functions Modified:** plaid-link-token, plaid-exchange, plaid-sync, plaid-disconnect, plaid_client
