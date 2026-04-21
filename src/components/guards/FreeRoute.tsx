import { Navigate, Outlet } from 'react-router-dom';
import { useFullSuiteAccess } from '../../hooks/useFullSuiteAccess';
import { AppLoader } from '../PageSkeleton';

/**
 * FreeRoute — plan guard for /free/* routes.
 * Must be nested inside AuthGuard (auth is pre-confirmed by parent).
 * Pro plan users are redirected to /pro/dashboard.
 * Free plan users pass through to the Outlet.
 */
export default function FreeRoute() {
  const { hasFullSuite, isLoading } = useFullSuiteAccess();

  if (isLoading) return <AppLoader />;
  if (hasFullSuite) return <Navigate to="/pro/dashboard" replace />;

  return <Outlet />;
}
