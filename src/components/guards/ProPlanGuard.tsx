/**
 * ProPlanGuard
 *
 * Wraps every /pro/* route. Four cases:
 *   1. Not authenticated                 → /auth
 *   2. Authenticated, access resolving   → loader
 *   3. Expired/non-paid                  → billing only
 *   4. Active trial/paid/admin           → render children ✓
 *
 * Shows AppLoader while the plan check is in-flight so we never
 * flash the wrong UI.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useFullSuiteAccess } from '../../hooks';
import { AppLoader } from '../common';
import { isBillingLockBypass } from './proPlanGuardPolicy';

export function ProPlanGuard({ children }: { children: ReactNode }) {
  const { user: authUser, authLoading } = useAuth();
  const { isLoading: checkingFullSuite, hasFullSuite, isAdmin } = useFullSuiteAccess();
  const location = useLocation();

  // Auth still resolving
  if (authLoading) return <AppLoader />;

  // Not logged in
  if (!authUser) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (checkingFullSuite) return <AppLoader />;

  if (!hasFullSuite && !isAdmin && !isBillingLockBypass(location.pathname, location.search)) {
    return <Navigate to="/pro/settings?tab=billing&locked=trial" replace />;
  }

  return <>{children}</>;
}

export { isBillingLockBypass };
