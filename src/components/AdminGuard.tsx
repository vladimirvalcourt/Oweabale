import { Navigate, Outlet } from 'react-router-dom';
import { useStore } from '../store/useStore';

/**
 * AdminGuard — wraps routes that require admin privileges.
 * Must be nested inside AuthGuard (user is guaranteed to be authenticated here).
 * Redirects to /dashboard if the authenticated user is not an admin.
 */
export default function AdminGuard() {
  const isAdmin = useStore((s) => s.user.isAdmin);
  const userId = useStore((s) => s.user.id);

  // Wait until the profile has been fetched (user.id populated by fetchData)
  if (!userId) return null;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
