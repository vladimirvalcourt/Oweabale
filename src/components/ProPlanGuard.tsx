/**
 * ProPlanGuard
 *
 * Wraps every /pro/* route. Three cases:
 *   1. Not authenticated          → /onboarding
 *   2. Authenticated              → render children ✓
 *
 * Shows AppLoader while the plan check is in-flight so we never
 * flash the wrong UI.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoader } from './PageSkeleton';

export function ProPlanGuard({ children }: { children: ReactNode }) {
  const { user: authUser, authLoading } = useAuth();
  const location = useLocation();

  // Auth still resolving
  if (authLoading) return <AppLoader />;

  // Not logged in
  if (!authUser) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // The signed-in app uses one namespace now. Feature-level gates still decide
  // which advanced controls require paid Full Suite access.
  return <>{children}</>;
}
