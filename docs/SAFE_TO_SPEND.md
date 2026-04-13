# Safe to spend (dashboard metric)

This document matches the heuristic implemented in `computeSafeToSpend` in `src/lib/finance.ts` and shown on the Dashboard under **Cash flow**.

## Inputs

- **Liquid cash**: Sum of asset rows with type **Cash** (same as Dashboard liquid total).
- **Window end**:
  - If there is at least one **active** income with `nextDate` on or after today (start of day, UTC-normalized): window ends on that **earliest** next payday.
  - Otherwise: window ends at the **last moment of the current calendar month** (“rest of month”).
- **Days in window**: `ceil((windowEnd − startOfToday) / 1 day)`, minimum **1**.

## Scheduled outflows (summed if due in the window)

- **Bills**: rows where `status !== 'paid'`, with a parseable `dueDate`, and due timestamp between start of today and window end (inclusive).
- **Subscriptions**: `status === 'active'`, `nextBillingDate` in the window.
- **Debts**: `remaining > 0`, `paymentDueDate` set, minimum payment in the window.
- **Citations (fines)**: `status === 'open'`. Due time is `scheduleBaseMs + daysLeft × 1 day` (same synthetic anchor as Bills & debts). Included if that falls in the window.

## Formula

1. `scheduledOutflowsTotal` = sum of amounts above.
2. `liquidAfterScheduled` = `liquidCash − scheduledOutflowsTotal`.
3. `dailySafeToSpend` = `max(0, liquidAfterScheduled) / daysInWindow`.

`monthlySurplus` on the result is the same value as `calcMonthlyCashFlow` for the current month (informational; not divided into the daily figure).

## Non-goals / limitations

- Does not model bank holds, credit card pending charges, or cash in non-liquid asset types.
- Does not forecast irregular gig income or one-off inflows inside the window.
- Citation due dates use the same rolling `daysLeft` model as the rest of the app, not court-specific calendars.

## Related

- **30 / 60 / 90** outflow buckets: `groupOutflowsByHorizon` in `src/lib/finance.ts` and the Bills & debts page.
