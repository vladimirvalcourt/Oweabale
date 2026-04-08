
# Skill: Security — Master Reference

## Type
Rigid — every section is mandatory. No steps may be skipped or reordered.

## Trigger
Load this skill whenever ANY of the following are true:
- Authentication, authorization, sessions, or tokens are being created or modified
- Supabase RLS policies are written, updated, or removed
- Payment, financial, or sensitive user data is handled
- API routes, edge functions, or webhooks are created
- New packages or dependencies are being added
- User input is being read, stored, or processed
- The user says: "is this secure?", "audit this", or "check this", "review this"
- A new feature touches the database schema

---

## Section 1 — Authentication

1. Verify all routes and API endpoints require authentication
2. Confirm JWTs are validated server-side on every protected request
3. Confirm session expiry and refresh token rotation are implemented
4. Ensure logout invalidates server-side sessions, not just client tokens
5. Never store raw passwords — always use bcrypt or Argon2 with a salt
6. MFA must be available for any account with elevated privileges
7. Always use `supabase.auth.getSession()` for reading the current session (local, fast). Use `supabase.auth.getUser()` only when server-verified identity is required (security-critical operations)
8. Listen to auth state changes with `onAuthStateChange`. Do not poll `getSession()`
9. Never store auth tokens manually — let the Supabase client handle storage
10. On sign-out, clear all local app state that contains user data
11. For OAuth flows, configure redirect URLs per environment (dev/staging/prod). Never hardcode `localhost` in production config

## Section 2 — Authorization & RLS

1. Every Supabase table MUST have Row Level Security (RLS) enabled — no exceptions
2. Verify users can ONLY read, write, or delete their own data unless explicitly granted
3. Admin-only actions must be gated with a role check server-side, never client-side
4. Never trust user-supplied IDs for ownership checks — always verify via session
5. After any schema change, re-audit all RLS policies that touch that table
6. Test every RLS policy with a non-owner user before shipping
7. Default policy = deny all. Add explicit policies for SELECT, INSERT, UPDATE, DELETE
8. Standard user-scoped policy pattern:
   ```sql
   CREATE POLICY "Users can only access their own rows"
   ON table_name
   FOR ALL
   USING (auth.uid() = user_id);
   ```
9. Test RLS policies by querying as an anonymous role and as a different user. Confirm data is not leaked
10. Service role key must never be exposed to the client — Edge Functions only
11. Always filter by `user_id` in client queries even when RLS is enabled — defense in depth

## Section 3 — Input Validation & Sanitization

1. All user input must be validated on the server — client-side validation is UX only
2. Sanitize every field before it hits the database (strip HTML, trim whitespace)
3. Check for SQL injection vectors in any raw query or dynamic filter
4. Validate file uploads: type allowlist, max size, virus scan if possible
5. Reject and log any request with unexpected or malformed payload shapes
6. Use parameterized queries or ORM methods — never string-concatenated SQL
7. Validate file type and size on the client before uploading — do not rely on storage policies alone

## Section 4 — Data Exposure

1. API responses must never include: passwords, tokens, internal UUIDs, full PII
2. Strip sensitive fields at the query level, not the component level
3. Financial data must be encrypted at rest (Supabase Vault or equivalent)
4. All data in transit must use HTTPS/TLS — never HTTP in production
5. Environment variables must never be logged, committed, or exposed to the client
6. Search the codebase for hardcoded secrets before every commit
7. Select only the columns you need: `.select('id, name, amount')` not `.select('*')` in performance-sensitive paths
8. Use signed URLs for private files. Never expose the raw storage URL for private buckets
9. Store files under a path that includes `user_id`: `{user_id}/{filename}`

## Section 5 — Dependency & Package Security

1. Before installing any new package, check for known CVEs (`npm audit` / OSV)
2. Flag any package that is unmaintained (>2 years without update)
3. Pin exact versions for production dependencies — no wildcards (`^`, `~`) in prod
4. Never install packages that request unnecessary native permissions
5. Run `npm audit` after every dependency change and resolve Critical/High findings

## Section 6 — Payments & Financial Logic

1. All payment logic must live server-side — never trust client-side amounts
2. Verify webhook signatures (Stripe, RevenueCat, etc.) before processing
3. Idempotency keys must be used on all payment mutations to prevent double-charges
4. Log every financial event with: user ID, amount, timestamp, result, and IP
5. Test refund, failure, and cancellation paths as thoroughly as the success path
6. Never log full card numbers, CVVs, or bank account details

## Section 7 — Edge Functions & Webhooks

1. Use Edge Functions for: server-side secrets, third-party webhooks, operations requiring service role, scheduled jobs
2. Always verify the caller's JWT at the start of every Edge Function:
   ```typescript
   const authHeader = req.headers.get('Authorization');
   const { data: { user }, error } = await supabase.auth.getUser(
     authHeader?.replace('Bearer ', '')
   );
   if (error || !user) return new Response('Unauthorized', { status: 401 });
   ```
3. Return structured JSON responses with appropriate HTTP status codes
4. Webhook endpoints must validate the signature of every inbound request before acting

## Section 8 — Audit & Findings Report

After completing all sections above, produce a written Security Report using this format:

```
### Security Report — [Date]

#### 🔴 Critical Findings
- [Description] — [File:Line] — Status: FIXED / OPEN

#### 🟡 High Findings
- [Description] — [File:Line] — Status: FIXED / OPEN

#### 🟢 Medium / Low Findings
- [Description] — [File:Line] — Status: NOTED / SCHEDULED

#### Summary
X Critical (N fixed), Y High (N fixed), Z Medium/Low (N noted)
```

---

## Rules
- Never treat a Critical or High finding as optional — fix before any other work
- Never hardcode secrets, tokens, or API keys — always use environment variables
- Never disable RLS on a Supabase table without explicit documented justification
- If in doubt, fail secure — deny access rather than allow it
- Never merge or ship a feature with an open Critical finding

## Verification
This skill is working if:
- Every auth/payment/RLS code change triggers this skill automatically
- A written Security Report is produced after every audit
- No Critical or High finding is left unresolved before feature delivery
- Every Supabase response destructures and checks `error`
- No service role key exists in client-side code
