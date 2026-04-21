/**
 * usePlanRedirect
 *
 * Thin wrapper around useFullSuiteAccess that returns a stable
 * { plan: 'free' | 'pro' | 'loading' } discriminated union.
 *
 * Used by:
 *   - SignInRoute  — redirect after login
 *   - FreePlanGuard — protect /free/* routes
 *   - ProPlanGuard  — protect /pro/* routes
 *   - PlanAwareRedirect — bounce old /dashboard etc.
 */
import { useFullSuiteAccess } from './useFullSuiteAccess';

export type Plan = 'free' | 'pro' | 'loading';

export function usePlanRedirect(): { plan: Plan } {
  const { isLoading, hasFullSuite } = useFullSuiteAccess();

  if (isLoading) return { plan: 'loading' };
  return { plan: hasFullSuite ? 'pro' : 'free' };
}
