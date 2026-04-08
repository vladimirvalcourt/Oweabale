
# Skill: Security Audit

## Type
Rigid — never skip or reorder steps. Security checks are non-negotiable.

## Trigger
Load this skill whenever:
- Any authentication, authorization, or session logic is touched
- Payment, banking, or financial data is handled
- API routes, edge functions, or webhooks are created or modified
- The user says "is this secure?", "audit this", or "check for vulnerabilities"
- A new Supabase RLS policy is written

## Instructions

1. **STOP** — do not proceed with any other task until the audit is complete
2. **Scan for authentication issues**:
   - Are all routes protected?
   - Are JWTs validated correctly?
   - Is session expiry handled?
3. **Scan for authorization issues**:
   - Are RLS policies applied to every Supabase table?
   - Can a user access or mutate another user's data?
   - Are admin-only actions gated properly?
4. **Scan for input validation**:
   - Is all user input sanitized before hitting the database?
   - Are there any SQL injection or XSS vectors?
   - Are file uploads validated for type and size?
5. **Scan for data exposure**:
   - Are API responses leaking sensitive fields (passwords, tokens, internal IDs)?
   - Are environment variables never hardcoded or logged?
   - Is financial data encrypted at rest and in transit?
6. **Scan for dependency vulnerabilities**:
   - Flag any known vulnerable packages
   - Check for outdated auth libraries
7. **Categorize every finding**:
   - 🔴 **Critical** — fix immediately, block all other work
   - 🟡 **High** — fix before next release
   - 🟢 **Medium/Low** — document and schedule
8. **Fix all Critical and High findings immediately**
9. **Deliver a security report** — list every finding, its severity, and its resolution

## Rules
- Never treat a security finding as optional if it is Critical or High
- Never hardcode secrets, tokens, or API keys — always use environment variables
- Never disable RLS on a Supabase table without explicit documented justification
- If in doubt, fail secure — deny access rather than allow it

## Verification
This skill is working if:
- Every auth/payment code change triggers this skill automatically
- A written security report is produced after every audit
- No Critical or High finding is left unresolved before feature delivery
