# Secret Rotation Runbook

## Rotation Cadence

- Operational and integration secrets: every 90 days
- Immediately rotate on suspected leak/compromise

## Secret Inventory (minimum)

- Supabase service role and integration secrets
- Stripe secrets/webhook secret
- Plaid secrets/webhook verification context
- Google OAuth and RISC secrets
- Hugging Face token
- VAPID keys

## Rotation Procedure

1. Create replacement secret in provider console.
2. Update secret in environment manager (Supabase/Vercel/GitHub as applicable).
3. Deploy affected services.
4. Verify health checks and critical flows.
5. Revoke old secret.
6. Record rotation timestamp and operator.

## Verification Checklist

- [ ] Auth flow works
- [ ] Billing webhooks pass signature validation
- [ ] Plaid sync/webhook path works
- [ ] Email intelligence and scheduled jobs work
- [ ] Push notifications still deliver

## Emergency Rotation

- Rotate immediately.
- Revoke active sessions if auth compromise is suspected.
- Trigger incident response workflow.
