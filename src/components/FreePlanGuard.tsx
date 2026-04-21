/**
 * FreePlanGuard
 *
 * Wraps every /free/* route. Three cases:
 *   1. Not authenticated          → /onboarding
 *   2. Authenticated + Pro plan   → /pro/dashboard  (wrong namespace)
 *   3. Authenticated + Free plan  → render children ✓
 *
 * Shows AppLoader while the plan check is in-flight so we never
 * flash the wrong UI. The check resolves in ~200-400ms (3 parallel
 * Supabase queries cached by useFullSuiteAccess).
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePlanRedirect } from '../hooks/usePlanRedirect';
import { AppLoader } from './PageSkeleton';

export function FreePlanGuard({ children }: { children: ReactNode }) {
  const { user: authUser, authLoading } = useAuth();
  const { plan } = usePlanRedirect();

  // Auth still resolving
  if (authLoading) return <AppLoader />;

  // Not logged in
  if (!authUser) return <Navigate to="/onboarding" replace />;

  // Plan check still resolving
  if (plan === 'loading') return <AppLoader />;

  // Pro user landed on a Free route → send to Pro namespace
  if (plan === 'pro') return <Navigate to="/pro/dashboard" replace />;

  // Free user in the right place
  return <>{children}</>;
}
