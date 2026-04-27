import type { TabType } from '../../store';

/**
 * Tracker (free) tier — centralized policy contract.
 */

export const TRACKER_ALLOWED_APP_PATHS = new Set(['/bills', '/settings']);

export function canAccessAppPath(pathname: string, hasFullSuite: boolean): boolean {
  if (hasFullSuite) return true;
  return TRACKER_ALLOWED_APP_PATHS.has(pathname);
}

export function canUseQuickAddTab(tab: TabType, hasFullSuite: boolean): boolean {
  if (hasFullSuite) return true;
  return tab === 'obligation' || tab === 'citation';
}

export function clampQuickAddTabForTier(tab: TabType, hasFullSuite: boolean): TabType {
  if (canUseQuickAddTab(tab, hasFullSuite)) return tab;
  return 'obligation';
}

export function canUseDebtActions(hasFullSuite: boolean): boolean {
  return hasFullSuite;
}

export function isTrackerObligationDebtBlocked(obligationKind: string, hasFullSuite: boolean): boolean {
  return !hasFullSuite && obligationKind.startsWith('debt-');
}

/**
 * Copy contract surfaced in free-tier UI callouts.
 */
export const TRACKER_FREE_TIER_SUMMARY =
  'Tracker (free): recurring bills and tickets/fines on Bills. Full Suite unlocks debt actions, ledger, income, and bank sync.';
