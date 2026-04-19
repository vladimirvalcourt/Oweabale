# Cross-Account Protection (RISC) — implemented

Google’s [Cross-Account Protection](https://developers.google.com/identity/protocols/risc) posts **security event JWTs** to Oweable. We validate them, de-duplicate by `jti`, then apply security actions (see [RISC Terms](https://console.cloud.google.com/tos?id=risc)).

**Note:** RISC does not currently send events for **Google Workspace** accounts (per Google).

## What was added

| Piece | Purpose |
|--------|--------|
| `supabase/migrations/20260422194500_risc_cross_account_protection.sql` | RPC `find_user_id_by_google_sub`, RPC `risc_revoke_user_sessions`, table `risc_google_events`. |
| `supabase/functions/risc-google-receiver` | HTTPS POST receiver: verify JWT, handle events. |
| `supabase/functions/risc-google-register` | One-shot / rare: register or verify stream with Google (protected by secret header). |
| `supabase/functions/_shared/riscGoogleJwt.ts` | Discovery doc, verify inbound JWT, mint SA bearer for RISC API. |

## GCP checklist (you still do this in Google Cloud)

1. Same project as Google Sign-In: **enable [RISC API](https://console.developers.google.com/apis/library/risc.googleapis.com)** and accept **RISC Terms**.
2. **Service account** → grant **`RISC Configuration Admin`** (`roles/riscconfigs.admin`) → create **JSON key** → entire JSON → Supabase secret `RISC_SERVICE_ACCOUNT_JSON`.
3. **OAuth consent screen → Authorized domains** must include the **host** of your receiver URL (e.g. `supabase.co` so `xxxx.supabase.co` is allowed). If Google rejects `*.supabase.co`, front the receiver on your own domain and set `RISC_RECEIVER_URL`.
4. Collect every **OAuth Web client ID** that can create Google-linked users for your product → `RISC_GOOGLE_OAUTH_CLIENT_IDS` (comma-separated).

## Supabase secrets

Set in **Dashboard → Edge Functions → Secrets** (or `supabase secrets set`):

| Secret | Required |
|--------|----------|
| `RISC_SERVICE_ACCOUNT_JSON` | Yes (full service account JSON string). |
| `RISC_GOOGLE_OAUTH_CLIENT_IDS` | Yes (comma-separated client IDs). |
| `RISC_REGISTER_SECRET` | Yes (random; protects `risc-google-register`). |
| `RISC_RECEIVER_URL` | Optional; default is `${SUPABASE_URL}/functions/v1/risc-google-receiver`. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to functions.

## Database

Apply migration (local or linked):

```bash
supabase db push --linked --yes
```

## Deploy functions

```bash
supabase functions deploy risc-google-receiver risc-google-register --no-verify-jwt
```

(Already reflected in `supabase/config.toml` with `verify_jwt = false`.)

## Register the stream with Google

After deploy and secrets:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/risc-google-register" \
  -H "Content-Type: application/json" \
  -H "x-risc-register-secret: $RISC_REGISTER_SECRET" \
  -d '{}'
```

Optional: request a **verification** token (must have subscribed to the verification event — we do by default):

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/risc-google-register" \
  -H "Content-Type: application/json" \
  -H "x-risc-register-secret: $RISC_REGISTER_SECRET" \
  -d '{"action":"verify","state":"manual-test-1"}'
```

Check Edge logs for `[risc-google-receiver] verification event`.

## Event handling (current behavior)

- **`sessions-revoked`**, **`tokens-revoked`**, **`account-purged`**, **`account-credential-change-required`**: resolve Google `sub` → Supabase user, **`auth.admin.signOut(userId, 'global')`** (fallback: `risc_revoke_user_sessions` RPC).
- **`account-disabled`** (not `bulk-account`): same as above — includes **`reason=hijacking`** and other non-bulk disables (Google does not use a separate “credential-compromised” URI in the standard RISC set; hijack/disable flows use these events).
- **`account-disabled`** with `reason=bulk-account`: **log only** (no automatic mass sign-out).
- **`token-revoked`** (refresh token): acknowledged and ignored (no app-side OAuth token rows to clear).
- **`verification`**: log (Google **Test** / stream verification).
- **`account-enabled`**: log only (no automatic action).

After adding **`account-purged`** to the subscribed list, **re-run** `risc-google-register` (`stream:update`) so Google delivers that event type (see [Register the stream](#register-the-stream-with-google)).

## Maintenance

- Trim `public.risc_google_events` periodically (e.g. delete rows older than 30 days) to control size; `jti` is only for de-duplication.
- Re-run `stream:update` if you change the receiver URL or event list.

## References

- [Google RISC documentation](https://developers.google.com/identity/protocols/risc)
