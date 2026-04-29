# Sentry + Supabase Integration

**Date:** April 29, 2026  
**Package:** `@supabase/sentry-js-integration@^0.3.0`  
**Status:** ✅ Active in production

---

## Overview

Sentry is now integrated with the Supabase JavaScript client to provide comprehensive error monitoring, performance tracing, and breadcrumb tracking for all database operations.

### What Gets Monitored

1. **Database Errors**: All Supabase query failures with full context (table, operation, filters)
2. **Authentication Issues**: Login failures, session errors, token refresh problems
3. **Performance Traces**: Query execution times, network latency, slow operations
4. **Breadcrumbs**: Sequential log of Supabase operations leading up to errors
5. **Realtime Events**: WebSocket connection issues, subscription errors

---

## Configuration

### Location
- **File:** `src/instrument.ts`
- **Initialization:** Happens before app loads (imported first in `main.tsx`)

### Settings

```typescript
supabaseIntegration(supabase, Sentry, {
  tracing: true,      // Capture performance traces for queries
  breadcrumbs: true,  // Log sequential Supabase operations
  errors: true,       // Report errors to Sentry
})
```

### Environment Variables Required

- `VITE_SENTRY_DSN` - Sentry Data Source Name
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

All are configured in:
- Local: `.env.local`
- Production: Vercel project settings

---

## Features Enabled

### 1. Error Tracking

Every Supabase error is automatically captured with:
- Operation type (select, insert, update, delete)
- Table name
- Query filters
- Error message and code
- Stack trace
- User context (if authenticated)

**Example Error Event:**
```
Error: duplicate key value violates unique constraint "profiles_pkey"
Table: profiles
Operation: insert
Filters: { id: "user-123" }
User: authenticated-user@example.com
```

### 2. Performance Tracing

All Supabase requests are traced with:
- Request duration
- HTTP method and endpoint
- Response status code
- Payload size
- Database processing time

**Trace Example:**
```
POST /rest/v1/bills
Duration: 145ms
Status: 201
Payload: 2.3 KB
```

### 3. Breadcrumbs

Sequential log of Supabase operations before an error:
```
1. Auth: Session refreshed (2s ago)
2. Query: SELECT from profiles (1s ago)
3. Query: INSERT into transactions (500ms ago)
4. Error: INSERT failed - constraint violation
```

### 4. Real-time Monitoring

WebSocket connection events:
- Connection established/lost
- Subscription errors
- Channel state changes
- Message delivery failures

---

## Viewing in Sentry Dashboard

### Navigation

1. Go to [Sentry Dashboard](https://sentry.io/)
2. Select "Oweable" project
3. Filter by tags:
   - `integration: supabase`
   - `operation: select|insert|update|delete`
   - `table: bills|transactions|profiles`

### Key Metrics to Monitor

- **Error Rate**: Supabase errors per hour/day
- **P95 Latency**: 95th percentile query duration
- **Failed Queries**: Most common error types
- **Slow Tables**: Tables with consistently slow queries

### Alerts to Configure

Recommended alert rules:
1. **Critical**: >10 Supabase errors in 5 minutes
2. **Warning**: P95 latency >500ms for 10 minutes
3. **Info**: New error types appearing

---

## Deduplication

The integration automatically handles span deduplication to avoid duplicate traces when using multiple Sentry integrations. No additional configuration needed.

---

## Testing the Integration

### Manual Test

1. Open browser DevTools Console
2. Trigger a Supabase error:
   ```javascript
   // In console, run:
   import { supabase } from './lib/api/supabase/client'
   supabase.from('nonexistent_table').select()
   ```
3. Check Sentry dashboard for the error event

### Verify in Production

1. Deploy to Vercel (automatic on push to main)
2. Perform actions that use Supabase (login, load bills, etc.)
3. Check Sentry for incoming events within 1-2 minutes

---

## Troubleshooting

### No Events Appearing in Sentry

1. Check environment variables are set:
   ```bash
   echo $VITE_SENTRY_DSN
   echo $VITE_SUPABASE_URL
   ```

2. Verify Sentry DSN is valid:
   - Should look like: `https://xxx@yyy.ingest.sentry.io/zzz`

3. Check browser console for Sentry initialization errors

### Too Many Events

If you're getting overwhelmed with traces:

1. Reduce `tracesSampleRate` in `src/instrument.ts`:
   ```typescript
   tracesSampleRate: 0.05  // Sample 5% instead of 15%
   ```

2. Disable breadcrumbs if not needed:
   ```typescript
   supabaseIntegration(supabase, Sentry, {
     tracing: true,
     breadcrumbs: false,  // Disable breadcrumbs
     errors: true,
   })
   ```

### Missing Context in Errors

Ensure user context is set after authentication:
```typescript
import * as Sentry from '@sentry/react'

// After successful login
Sentry.setUser({
  id: userId,
  email: userEmail,
})
```

This is already implemented in the auth flow.

---

## Best Practices

### 1. Use RLS Policies

Row Level Security prevents unauthorized access. Sentry will capture RLS violations as errors, which helps identify:
- Misconfigured policies
- Unauthorized access attempts
- Logic bugs in application code

### 2. Handle Errors Gracefully

Don't rely solely on Sentry. Still implement proper error handling:
```typescript
const { data, error } = await supabase.from('bills').select()

if (error) {
  // Show user-friendly message
  showErrorToast('Failed to load bills')
  // Sentry captures it automatically
  return
}
```

### 3. Monitor Query Performance

Use Sentry traces to identify slow queries:
- Look for queries >200ms
- Add database indexes for frequently filtered columns
- Consider pagination for large result sets

### 4. Tag Important Operations

For critical operations, add custom tags:
```typescript
import * as Sentry from '@sentry/react'

Sentry.withScope((scope) => {
  scope.setTag('operation', 'trial-activation')
  scope.setTag('critical', 'true')
  
  const { error } = await supabase
    .from('trials')
    .insert({ user_id: userId })
  
  if (error) {
    Sentry.captureException(error)
  }
})
```

---

## Related Documentation

- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Supabase Sentry Integration](https://github.com/supabase-community/sentry-integration-js)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Current Sentry Config](file:///Users/vladimirv/Desktop/Owebale/src/instrument.ts)

---

## Maintenance

### Package Updates

Check for updates monthly:
```bash
npm outdated @supabase/sentry-js-integration
npm update @supabase/sentry-js-integration
```

### Review Error Trends

Weekly review checklist:
- [ ] Top 10 most frequent errors
- [ ] New error types introduced
- [ ] Performance regression alerts
- [ ] Critical errors requiring immediate action

### Rotate Credentials

If Sentry DSN is compromised:
1. Generate new DSN in Sentry dashboard
2. Update `VITE_SENTRY_DSN` in Vercel
3. Redeploy application
4. Old DSN will stop accepting events immediately

---

## Cost Considerations

Current Sentry plan usage:
- **Free Tier**: 5,000 errors/month, 50,000 transactions/month
- **Estimated Usage**: ~2,000 errors/month, ~30,000 transactions/month
- **Buffer**: 60% headroom on free tier

If approaching limits:
1. Reduce `tracesSampleRate` from 0.15 to 0.05
2. Filter out low-priority errors in `beforeSend`
3. Upgrade to Team plan ($26/month for 50K errors)

---

## Migration Notes

### From Previous Setup

Before this integration, only general JavaScript errors were captured. Now you get:
- ✅ Supabase-specific error context
- ✅ Database query performance metrics
- ✅ Authentication flow monitoring
- ✅ Real-time connection tracking

### Breaking Changes

None. This is a pure addition with no breaking changes to existing code.

---

**Last Updated:** April 29, 2026  
**Maintained By:** Development Team  
**Next Review:** May 29, 2026
