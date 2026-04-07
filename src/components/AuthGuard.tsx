import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AppLoader } from './PageSkeleton';

/**
 * AuthGuard — wraps all protected dashboard routes.
 * If the user is not signed in, redirects to /auth.
 * Shows a loader while the session is being resolved.
 */
export default function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return <Outlet />;
}
