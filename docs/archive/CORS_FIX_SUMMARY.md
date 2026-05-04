# CORS Fix for Supabase Edge Functions

## Problem
Supabase Edge Function `trial-welcome-email` was blocking requests from localhost with CORS preflight errors.

## Solution Applied

### 1. Enhanced Environment Detection (`supabase/functions/_shared/cors.ts`)
Updated `isProductionEnvironment()` to detect local Supabase instances:

```typescript
function isProductionEnvironment(): boolean {
  const env = Deno.env.get('DENO_ENV')?.toLowerCase();
  const supabaseEnv = Deno.env.get('SUPABASE_ENV')?.toLowerCase();
  
  // Only treat as production if explicitly set AND not running locally
  const isLocalSupabase = Deno.env.get('SUPABASE_URL')?.includes('127.0.0.1') || 
                          Deno.env.get('SUPABASE_URL')?.includes('localhost');
  if (isLocalSupabase) return false;
  
  return env === 'production' || supabaseEnv === 'production';
}
```

### 2. Existing CORS Configuration (Already Working)
The function already had proper CORS setup:

✅ **Imported corsHeaders** from shared module
✅ **OPTIONS preflight handling** - Returns 200 'ok' before main logic
✅ **CORS headers applied to all responses** - Success and error responses
✅ **Dynamic origin validation** - Allows localhost in dev, production URLs in prod

## How It Works

### Request Flow:
1. Browser sends OPTIONS preflight request
2. Function checks origin against allowlist
3. If localhost + local Supabase → allowed
4. Returns 200 with CORS headers
5. Browser sends actual POST request
6. Function processes email and returns response with CORS headers

### Allowed Origins:
- **Development**: localhost:3000, 5173, 5174, 4173, etc.
- **Production**: oweable.com, www.oweable.com
- **Vercel Previews**: *.vercel.app (if whitelisted)

## Testing

### Local Development:
```bash
# Start local dev server
npm run dev

# Call the edge function from browser
fetch('http://localhost:54321/functions/v1/trial-welcome-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', firstName: 'Test' })
})
```

### Verify CORS Headers:
Open DevTools → Network tab → Check response headers:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, ...
Access-Control-Allow-Methods: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Max-Age: 86400
Vary: Origin
```

## Deployment

After deploying to Supabase cloud, the function will automatically switch to production mode and only allow:
- https://oweable.com
- https://www.oweable.com
- Whitelisted Vercel preview URLs

## Files Modified
- `/Users/vladimirv/Desktop/Owebale/supabase/functions/_shared/cors.ts`

## Related Functions Using Same CORS Config
All edge functions import from `_shared/cors.ts`, so this fix applies to:
- trial-welcome-email ✅
- plaid-webhook ✅
- admin-actions ✅
- Any other edge functions ✅
