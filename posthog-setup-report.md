<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics across the Oweable project. The integration adds server-side event tracking to Supabase Edge Functions (via `posthog-node` imported through esm.sh, with `flushAt:1` / `flushInterval:0` for the serverless context), and wires up the existing client-side `posthog-js` setup so that the `track()` utility now routes events through PostHog. User identity is tracked on sign-in and sign-out via `usePostHogIdentity`. A shared Deno helper (`supabase/functions/_shared/posthog.ts`) centralises the PostHog client creation for all Edge Functions.

| Event name | Description | File |
|---|---|---|
| `user signed in` | User authenticates and their identity is confirmed | `src/hooks/usePostHog.tsx` |
| `user signed out` | User session ends (sign-out or idle reset) | `src/hooks/usePostHog.tsx` |
| `checkout session created` | User initiates a Stripe checkout session | `supabase/functions/stripe-checkout-session/index.ts` |
| `subscription activated` | New subscription activated after successful payment | `supabase/functions/stripe-webhook/index.ts` |
| `subscription updated` | Existing subscription updated (renewal, plan change, etc.) | `supabase/functions/stripe-webhook/index.ts` |
| `subscription cancelled` | Subscription deleted/cancelled in Stripe | `supabase/functions/stripe-webhook/index.ts` |
| `invoice payment failed` | Subscription invoice payment failed | `supabase/functions/stripe-webhook/index.ts` |
| `subscription cancellation requested` | User explicitly requests to cancel their subscription | `supabase/functions/stripe-cancel-subscription/index.ts` |
| `bank account linked` | User successfully links a bank account via Plaid | `supabase/functions/plaid-exchange/index.ts` |
| `bank account disconnected` | User disconnects all linked bank accounts | `supabase/functions/plaid-disconnect/index.ts` |
| `document scanned` | User uploads and scans a document via the ingestion flow | `src/pages/Ingestion.tsx` |

Also connected: all existing `track()` calls (`plaid_link_success`, `plaid_link_error`, `plaid_link_dismiss`, `plaid_link_open`, `plaid_oauth_redirect`, `plaid_initial_sync_failed`) now route through PostHog via the updated `src/lib/utils/analytics.ts`.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/400554/dashboard/1522340
- **New sign-ins over time**: https://us.posthog.com/project/400554/insights/bc06oSkJ
- **Checkout to subscription funnel**: https://us.posthog.com/project/400554/insights/yxNuvU9p
- **Subscription churn — cancellations vs activations**: https://us.posthog.com/project/400554/insights/hCJW5AlQ
- **Bank account connections vs disconnections**: https://us.posthog.com/project/400554/insights/SBLociIX
- **Failed invoice payments over time**: https://us.posthog.com/project/400554/insights/y6d2r0n7

### Supabase secrets required

The server-side edge functions read `POSTHOG_KEY` and `POSTHOG_HOST` from Supabase secrets. Set them with:

```bash
npx supabase secrets set POSTHOG_KEY=<your-key> POSTHOG_HOST=https://us.i.posthog.com
```

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
