import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoader } from './PageSkeleton';

/**
 * AuthGuard — wraps all protected dashboard routes.
 * If the user is not signed in, redirects to /auth.
 * Shows a loader while the session is being resolved.
 */
export default function AuthGuard() {
  const { user, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) return <AppLoader />;
  if (!user) {
    const redirectPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  return <Outlet />;
}
