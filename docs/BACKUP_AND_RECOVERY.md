# Backup and Recovery

## Objectives

- Define minimum recovery guarantees for Supabase-backed production data.

## Backup Policy

- Enable managed point-in-time recovery (PITR) for production database.
- Verify backup retention settings meet business/regulatory requirements.
- Export critical configuration snapshots:
  - Supabase project config
  - edge-function secrets inventory (names only, no values)
  - billing/webhook endpoint configuration references

## Recovery Drills

- Frequency: monthly.
- Drill must validate:
  1. Restore database snapshot to staging.
  2. Run sanity queries for critical tables (`profiles`, billing tables, entitlements, alerts).
  3. Verify app login and key workflows against restored dataset.
  4. Record RTO/RPO metrics and gaps.

## Minimum Acceptance

- Recovery runbook executed successfully in staging.
- Critical user journeys pass after restore.
- Action items tracked for any missed objective.
