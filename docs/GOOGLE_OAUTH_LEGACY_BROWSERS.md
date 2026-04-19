# Google OAuth — legacy browser warning & audit

Google Cloud Console may show **“Legacy browsers”** for an OAuth 2.0 Web client when requests appear to come from user agents that lack modern OAuth protections or use outdated embedded browsers.

## What Oweable implements

| Flow | Mechanism |
|------|-----------|
| **Supabase Auth (Google sign-in)** | Authorization Code with **PKCE** — `src/lib/supabaseClient.ts` sets `auth.flowType: 'pkce'`. |
| **Gmail (Email Intelligence)** | Authorization Code with **PKCE (S256)** — `code_challenge` / `code_verifier` on `https://accounts.google.com/o/oauth2/v2/auth` and token exchange in `supabase/functions/gmail-oauth-callback/`. |

There is **no** Google Identity Services (GIS) `gsi` script in this web app; OAuth is redirect-based and PKCE-backed.

## Telemetry: finding user agents in Google Cloud

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Open the **OAuth 2.0 Client ID** used for Oweable (Web).
3. Use **Google Cloud’s monitoring** for that client where available (varies by product surface): check **Logs Explorer** with resource type related to OAuth or filter by `client_id` if your org exports OAuth audit logs.
4. For **API traffic** (e.g. Gmail API after tokens are issued), **APIs & Services** → **Dashboard** → select **Gmail API** → **Metrics** / **Quotas** — this reflects API usage, not the consent screen UA, but helps confirm client usage patterns.

If the console links “Legacy browsers” to a help article, follow it: often the mitigation is **PKCE**, **disallowing embedded WebViews** for login, and guiding users to system browsers.

## Client-side guardrails in the app

- **`browserSupportsModernWebCrypto()`** (`src/lib/browserSupport.ts`) — requires `crypto.subtle` and `getRandomValues` (needed for PKCE). If missing, **Connect Gmail** is disabled and an **Unsupported browser** banner is shown (`UnsupportedBrowserBanner`).
- **`browserslist`** in `package.json` documents supported browsers for tooling; it does not polyfill legacy IE.

## Mobile / React Native (future)

This repository is **web-first**; there is no in-repo React Native OAuth implementation yet. When you add a native app:

- **iOS:** Use **ASWebAuthenticationSession** (or **SFAuthenticationSession** on older iOS), not `WKWebView`, for the OAuth redirect.
- **Android:** Use **Chrome Custom Tabs**, not a plain `WebView`, for the authorization URL.
- Use a library that performs **Authorization Code + PKCE** with the same redirect URI registered for a **native** or **Web** client per Google’s guidance.

## Deploy note

After changing `gmail-oauth-callback`, redeploy that Edge Function so PKCE verification is live:

`supabase functions deploy gmail-oauth-callback --project-ref <ref>`
