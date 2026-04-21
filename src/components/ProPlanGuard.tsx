/**
 * ProPlanGuard
 *
 * Wraps every /pro/* route. Three cases:
 *   1. Not authenticated          → /onboarding
 *   2. Authenticated + Free plan  → /free/dashboard  (wrong namespace)
 *   3. Authenticated + Pro plan   → render children ✓
 *
 * Shows AppLoader while the plan check is in-flight so we never
 * flash the wrong UI.
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePlanRedirect } from '../hooks/usePlanRedirect';
import { AppLoader } from './PageSkeleton';

export function ProPlanGuard({ children }: { children: ReactNode }) {
  const { user: authUser, authLoading } = useAuth();
  const { plan } = usePlanRedirect();

  // Auth still resolving
  if (authLoading) return <AppLoader />;

  // Not logged in
  if (!authUser) return <Navigate to="/onboarding" replace />;

  // Plan check still resolving
  if (plan === 'loading') return <AppLoader />;

  // Free user landed on a Pro route → send to Free namespace
  if (plan === 'free') return <Navigate to="/free/dashboard" replace />;

  // Pro user in the right place
  return <>{children}</>;
}
