# Gmail integration — Google OAuth verification (blocked step)

Email Intelligence is implemented end-to-end, but **public Gmail access** depends on Google’s OAuth verification for the restricted scope **`https://www.googleapis.com/auth/gmail.readonly`**.

Until Google finishes verification, treat this as a **hold**: no further product work is required for the Gmail path except fixes you discover in testing.

## What works before verification

- **Testing mode:** In [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **OAuth consent screen**, keep the app in **Testing** and add every account that should connect Gmail under **Test users** (including your own and any reviewer accounts).
- Those test users can complete **Connect Gmail** in Oweable (**Settings → Integrations**) and run scans as configured.
- **Non–test users** will be blocked by Google’s consent screen until the app is **In production** (verified where required).

## What we are waiting on

1. Google completes **OAuth app verification** (and any **Domain verification** if Google requested it).
2. After approval, publish the consent screen to **In production** (or your chosen audience) when you are ready for general users.

## After you receive authorization

1. **Consent screen** — Move to production; confirm **scopes** still list only what we use (`gmail.readonly`).
2. **No code change required** for verification itself — same Client ID / secret and redirect URIs.
3. **Double-check redirect URIs** on the OAuth Web client match exactly:
   - Production: `https://www.oweable.com/auth/google-email/callback` (or your live origin + `/auth/google-email/callback`).
   - Local dev: `http://localhost:<port>/auth/google-email/callback`.
4. **Supabase Edge secrets** (already documented in `.env.example`) — ensure these remain set:
   - `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`
   - `EMAIL_TOKEN_ENCRYPTION_KEY`
   - `HF_TOKEN` (and any model env your scan uses)
   - Optional: `EMAIL_SCAN_CRON_SECRET` if you call `email-intelligence-scan` from a scheduler with `x-email-scan-cron`.
5. **Vite** — `VITE_GOOGLE_GMAIL_CLIENT_ID` must match the same Web client ID.
6. **Deploy** — If you change only Google-side settings, redeploy is usually unnecessary; if you change functions or env names, redeploy affected Edge Functions.

## Reference in repo

| Area | Location |
|------|-----------|
| OAuth URL + scope | `src/lib/googleEmailOAuth.ts` |
| Token exchange | `supabase/functions/gmail-oauth-callback/` |
| Scan | `supabase/functions/email-intelligence-scan/` |
| Env template | `.env.example` (Email Intelligence section) |

## Short status line for README or internal notes

> **Gmail:** Waiting on Google OAuth verification; test users can use Connect Gmail until the app is in production.

## Optional hardening (after verification)

**[Cross-Account Protection (RISC)](https://developers.google.com/identity/protocols/risc)** — Implemented in-repo (`risc-google-receiver`, `risc-google-register`). Operational steps: **`docs/CROSS_ACCOUNT_PROTECTION_RISC.md`**.
