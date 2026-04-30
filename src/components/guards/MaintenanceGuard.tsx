import { Outlet } from 'react-router-dom';
import MaintenancePage from '@/pages/MaintenancePage';
import { useStore } from '@/store';

/**
 * Blocks the signed-in app shell when maintenance mode is enabled, except for admins.
 * Must sit inside {@link AuthGuard} so only authenticated sessions are affected.
 */
export default function MaintenanceGuard() {
  const maintenanceMode = useStore((s) => s.platformSettings?.maintenanceMode === true);
  const isAdmin = useStore((s) => s.user.isAdmin);

  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return <Outlet />;
}
