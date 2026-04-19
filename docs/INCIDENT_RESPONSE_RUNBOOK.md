# Incident Response Runbook

## Severity Levels

- **SEV-1**: Active compromise, data exposure, unauthorized admin actions.
- **SEV-2**: Suspected compromise or high-risk misconfiguration.
- **SEV-3**: Security bug without confirmed exploitation.

## 0-15 Minutes: Containment

1. Freeze deployments.
2. Revoke affected sessions:
   - Use admin action `revoke_sessions` for impacted users.
3. Disable affected integrations/entry points:
   - Disable webhook endpoint or rotate webhook secrets.
4. Rotate exposed credentials immediately:
   - Stripe, Plaid, Google OAuth, RISC secrets, HF token, VAPID keys.

## 15-60 Minutes: Triage

1. Identify blast radius:
   - users affected
   - data classes affected
   - time window
2. Pull relevant logs/audit trails:
   - `audit_log`
   - `stripe_events`
   - edge function logs
3. Capture forensic snapshot of config and DB state before further changes.

## 1-4 Hours: Eradication and Recovery

1. Patch root cause.
2. Re-run all security gates:
   - `security:edge-auth-gate`
   - `security:edge-log-hygiene`
   - `security:edge-baseline`
   - `security:migrations-rls`
3. Deploy patch.
4. Validate business-critical flows.

## Communication

- Maintain internal timeline with timestamps (UTC).
- If user data exposure is confirmed, prepare customer/regulatory notifications as required.

## Post-Incident (within 48 hours)

1. Publish internal postmortem:
   - root cause
   - impact
   - detection gap
   - action items
2. Add preventive control (CI rule/test/monitor) for that class of failure.
