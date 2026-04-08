# Skill: Supabase Integration

## Trigger
Load this skill whenever:
- Writing or modifying Supabase queries, mutations, or subscriptions
- Setting up or changing Row Level Security (RLS) policies
- Writing Edge Functions
- Handling Supabase Auth (sign in, sign out, session, OAuth)
- Working with Supabase Storage (upload, download, signed URLs)
- Setting up Realtime subscriptions

## Type
**Flexible** — Follow these patterns by default. Deviate when the project's existing architecture or a specific Supabase feature requires it, and document the reason.

## Instructions

### Authentication
1. Always use `supabase.auth.getSession()` for reading the current session (local, fast). Use `supabase.auth.getUser()` only when you need server-verified identity (e.g., security-critical operations).
2. Listen to auth state changes with `onAuthStateChange`. Do not poll `getSession()`.
3. Never store auth tokens manually. Let the Supabase client handle storage.
4. On sign-out, clear all local app state that contains user data.
5. For OAuth flows, configure redirect URLs per environment (dev/staging/prod). Never hardcode `localhost` in production config.

### Database Queries
6. Always filter by `user_id` on every query that touches user data. Never rely on RLS alone as the only filter in client code — defense in depth.
7. Select only the columns you need: `.select('id, name, amount')` not `.select('*')` in performance-sensitive paths.
8. Use `.order()` and `.limit()` on all queries that could return large result sets.
9. Batch multiple independent queries with `Promise.all()`. Never chain them sequentially unless one depends on the other's result.
10. Handle both `data` and `error` from every Supabase response. Never destructure only `data` and ignore `error`.

### Row Level Security (RLS)
11. RLS must be enabled on every table that contains user data. No exceptions.
12. Default policy = deny all. Add explicit policies for SELECT, INSERT, UPDATE, DELETE.
13. Standard user-scoped policy pattern:
    ```sql
    CREATE POLICY "Users can only access their own rows"
    ON table_name
    FOR ALL
    USING (auth.uid() = user_id);
    ```
14. Test RLS policies by querying as an anonymous role and as a different user. Confirm data is not leaked.
15. Service role key must never be exposed to the client. Edge Functions only.

### Edge Functions
16. Use Edge Functions for: server-side secrets, third-party webhooks, operations requiring service role, scheduled jobs.
17. Always verify the caller's JWT at the start of every Edge Function:
    ```typescript
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
    if (error || !user) return new Response('Unauthorized', { status: 401 });
    ```
18. Return structured JSON responses with appropriate HTTP status codes.

### Storage
19. Store files under a path that includes `user_id`: `{user_id}/{filename}`. This makes RLS policies on buckets straightforward.
20. Use signed URLs for private files. Never expose the raw storage URL for private buckets.
21. Validate file type and size on the client before uploading. Do not rely on storage policies alone.

### Realtime
22. Subscribe to specific tables and filters, not entire database changes:
    ```typescript
    supabase.channel('bills').on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `user_id=eq.${userId}` }, handler).subscribe();
    ```
23. Always unsubscribe in cleanup functions (`useEffect` return, component unmount).
24. Do not use Realtime for data that is fetched on mount anyway — it adds connection overhead for no benefit.

### Error Handling
25. Every Supabase operation must handle errors explicitly. Use `toast.error()` for user-facing failures.
26. Log errors to the console in development. Do not swallow them silently.

## Verification
- Every query filters by `user_id`.
- Every Supabase response destructures and checks `error`.
- RLS is enabled on all user-data tables.
- No service role key exists in client-side code.
- All Realtime subscriptions have cleanup/unsubscribe logic.
