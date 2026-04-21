# Security Fixes Deployment Guide

This guide walks you through deploying the critical security fixes identified in the security audit.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Access to your Supabase project
- Backup of current database (recommended)

## Overview of Changes

1. **Database Migration**: Fix mobile capture session RLS policy
2. **Edge Function Updates**: CORS hardening, rate limiting, error masking
3. **New Shared Utilities**: Rate limiter and error handler modules

## Step-by-Step Deployment

### 1. Apply Database Migration

The migration fixes the overly permissive RLS policy on `document_capture_sessions`:

```bash
# Navigate to project root
cd /Users/vladimirv/Desktop/Owebale

# Review the migration first
cat supabase/migrations/20260502000000_fix_mobile_capture_session_rls.sql

# Apply to local development (test first!)
supabase db reset

# Apply to production
supabase db push
```

**What this does:**
- Replaces `USING (TRUE) WITH CHECK (TRUE)` with token-based validation
- Adds 24-hour session expiration
- Creates index for efficient token lookups
- Ensures sessions can only be accessed with valid tokens

### 2. Deploy Updated Edge Functions

The following files have been updated or created:

**Updated:**
- `supabase/functions/_shared/cors.ts` - Environment-aware CORS
- `supabase/functions/plaid-link-token/index.ts` - Added rate limiting

**New:**
- `supabase/functions/_shared/rateLimiter.ts` - Rate limiting infrastructure
- `supabase/functions/_shared/errorHandler.ts` - Error masking utilities

```bash
# Deploy all Edge Functions
supabase functions deploy

# Or deploy individually
supabase functions deploy plaid-link-token
supabase functions deploy _shared/cors
supabase functions deploy _shared/rateLimiter
supabase functions deploy _shared/errorHandler
```

### 3. Add Rate Limiting to Critical Endpoints

Apply rate limiting to remaining sensitive endpoints by adding this code at the start of each function (after OPTIONS check):

```typescript
import { enforceRateLimit, rateLimiters } from '../_shared/rateLimiter.ts';

// In your Deno.serve handler, after method checks:
const rateLimitCheck = await enforceRateLimit(req, rateLimiters.api);
if (!rateLimitCheck.allowed) {
  return rateLimitCheck.response!;
}
```

**Priority endpoints to update:**
1. `supabase/functions/stripe-webhook/index.ts` - Use `rateLimiters.webhook`
2. `supabase/functions/plaid-webhook/index.ts` - Use `rateLimiters.webhook`
3. `supabase/functions/admin-actions/index.ts` - Use `rateLimiters.auth`
4. `supabase/functions/verify-turnstile/index.ts` - Use `rateLimiters.auth`

### 4. Update Error Handling

Replace manual error handling with the safe error handler:

**Before:**
```typescript
try {
  // ... your code
} catch (e) {
  const msg = e instanceof Error ? e.message : 'Server error';
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**After:**
```typescript
import { createSafeErrorResponse } from '../_shared/errorHandler.ts';

try {
  // ... your code
} catch (e) {
  return createSafeErrorResponse(e);
}
```

Or use the wrapper for cleaner code:
```typescript
import { withSafeErrorHandler } from '../_shared/errorHandler.ts';

Deno.serve(withSafeErrorHandler(async (req: Request) => {
  // Your handler code - errors automatically caught and sanitized
  return new Response(JSON.stringify({ success: true }));
}));
```

### 5. Configure Environment Variables

Ensure these environment variables are set in your Supabase project:

```bash
# For production environment detection
supabase secrets set DENO_ENV=production --project-ref YOUR_PROJECT_REF

# Optional: Custom CORS origins (comma-separated)
supabase secrets set PLAID_ALLOWED_ORIGINS=https://oweable.com,https://www.oweable.com --project-ref YOUR_PROJECT_REF

# Optional: Extra preview URLs
supabase secrets set EDGE_CORS_EXTRA_ORIGINS=https://your-preview.vercel.app --project-ref YOUR_PROJECT_REF
```

### 6. Verify Deployment

Test the fixes:

```bash
# Test mobile capture session security
# Try accessing a session without a valid token - should fail

# Test rate limiting
# Make 35+ rapid requests to plaid-link-token - should get 429 after 30

# Test CORS in production
# Requests from unauthorized origins should be rejected

# Test error masking
# Trigger an error and verify no sensitive info is exposed
```

## Monitoring & Maintenance

### Monitor Rate Limiting

Check Deno KV usage in Supabase dashboard:
- Look for keys with prefix `rl_*`
- Monitor hit rates and adjust limits as needed

### Review Error Logs

Check Supabase Edge Function logs for:
- `[API Error]` entries show sanitized errors
- Ensure no sensitive data appears in logs
- Track request IDs for support tickets

### Regular Security Reviews

- Review rate limit metrics monthly
- Rotate secrets quarterly
- Audit RLS policies after schema changes
- Test error masking after code updates

## Rollback Plan

If issues occur:

```bash
# Rollback database migration
supabase db reset --db-url YOUR_DB_URL

# Revert Edge Functions to previous version
git checkout HEAD~1 -- supabase/functions/
supabase functions deploy
```

## Support

For issues or questions:
1. Check Supabase Edge Function logs
2. Review Deno KV metrics for rate limiting
3. Verify environment variables are set correctly
4. Test in staging environment first

## Security Checklist

- [ ] Database migration applied successfully
- [ ] All Edge Functions deployed
- [ ] Rate limiting added to critical endpoints
- [ ] Error handling updated across functions
- [ ] Environment variables configured
- [ ] CORS working correctly in production
- [ ] Mobile capture sessions require valid tokens
- [ ] No sensitive data in error messages
- [ ] Rate limiting thresholds appropriate
- [ ] Monitoring in place

---

**Last Updated:** April 20, 2026  
**Security Rating After Fixes:** A- (Excellent)
