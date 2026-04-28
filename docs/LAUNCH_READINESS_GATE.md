# Launch Readiness Gate

Use this gate before inviting users into the 14-day Full Suite trial.

## Run The Gate

Repo-only checks:

```bash
npm run launch:readiness
```

Repo plus read-only production checks:

```bash
npm run launch:readiness -- --live
```

The live mode verifies:

- `www.oweable.com` responds successfully.
- Vercel production deployment is ready and includes the trial cron lambdas.
- Vercel production has the browser and cron environment variable names required for trial onboarding.
- Supabase has the Stripe, Resend, service role, and cron secret names required by Edge Functions.
- Supabase has the trial and signup-trigger migrations applied remotely.
- Supabase has the Stripe, trial, and support Edge Functions deployed.

## Mutating Checks

Do not run mutating checks against real users. Use a known production test account only.

The gate intentionally does not create users, edit profiles, run checkout, or cancel subscriptions by default. Before broad launch, manually prove this lifecycle with one test account:

1. Create a fresh production test user.
2. Confirm the profile has `plan = trial`, `trial_started_at`, `trial_ends_at` about 14 days out, and `trial_expired = false`.
3. Confirm `/pro/dashboard` is accessible during the trial.
4. Expire only that test profile and run the trial expiry path.
5. Confirm the user is moved to `plan = tracker`, `trial_expired = true`, and `/pro/*` redirects to `/pro/settings?tab=billing&locked=trial`.
6. Complete Stripe checkout for that test user.
7. Confirm webhook/sync creates active subscription or entitlement rows and `/pro/*` access returns.
8. Test immediate cancellation and period-end cancellation policy with that test subscription.

Cron route triggering is opt-in:

```bash
LAUNCH_GATE_ALLOW_CRON_TRIGGER=1 npm run launch:readiness -- --live --trigger-crons
```

Only use this after confirming the target data set is safe. The cron routes can email users or downgrade expired trials.

## Launch Decision

Passing this gate means the app is ready for a controlled beta invite. Broad paid launch still requires the manual lifecycle proof above and monitoring of Stripe webhook delivery, Vercel cron logs, Supabase function logs, and support inbox volume during the first cohort.
