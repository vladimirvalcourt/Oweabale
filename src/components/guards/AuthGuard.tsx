import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { AppLoader } from '../common';
import { useStore } from '../../store';

/**
 * AuthGuard — wraps all protected dashboard routes.
 * If the user is not signed in, redirects to /auth.
 * Shows a loader while the session is being resolved.
 */
export default function AuthGuard() {
  const { user: authUser, authLoading } = useAuth();
  const location = useLocation();
  const user = useStore((s) => s.user);
  const isLoading = useStore((s) => s.isLoading);

  if (authLoading) return <AppLoader />;
  if (!authUser) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  // Wait for the first Supabase sync so we don't act on stale persisted state.
  if (isLoading) return <AppLoader />;

  if (user.id === authUser.id && !user.hasCompletedOnboarding && location.pathname !== '/onboarding/setup') {
    return <Navigate to="/onboarding/setup" replace />;
  }

  return <Outlet />;
}
