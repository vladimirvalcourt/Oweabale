import type { ReactNode } from 'react';
import { useAdminPermissions } from './useAdminPermissions';

export function AdminPermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission, isLoading } = useAdminPermissions();

  if (isLoading) {
    return <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-content-muted">Checking permissions...</p>;
  }
  if (!hasPermission(permission)) {
    return <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-amber-300">You do not have permission for this section.</p>;
  }
  return <>{children}</>;
}
