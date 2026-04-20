import type { TabType } from '../store/useStore';

/**
 * Tracker (free) tier — product contract
 *
 * - Routes: primary app surface is `/bills` plus `/settings` (and onboarding/auth/public).
 * - Quick Add: recurring **bills** and **tickets/fines** only — no expense/income ledger rows,
 *   no new debt accounts (loans/credit cards) from Quick Add.
 * - Bills page: can add/edit **recurring bills** and **citations**; **debt** add/edit and payoff
 *   tooling require Full Suite (see Obligations + FullSuiteRouteGuard elsewhere).
 *
 * Enforcement here is client-side UX; Edge Functions still gate Plaid and other paid APIs.
 */

export function clampQuickAddTabForTier(tab: TabType, hasFullSuite: boolean): TabType {
  if (hasFullSuite) return tab;
  if (tab === 'transaction' || tab === 'income') return 'obligation';
  return tab;
}

export function isTrackerObligationDebtBlocked(obligationKind: string, hasFullSuite: boolean): boolean {
  if (hasFullSuite) return false;
  return obligationKind.startsWith('debt-');
}
