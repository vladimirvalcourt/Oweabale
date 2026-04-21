import { type ReactNode, useEffect, useState } from 'react';
import { useAdminPermissions } from './useAdminPermissions';

const PERMISSION_TIMEOUT_MS = 3000;

export function AdminPermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission, isLoading, isAdminProfile } = useAdminPermissions();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const id = window.setTimeout(() => setTimedOut(true), PERMISSION_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [isLoading]);

  // Still loading (and not yet timed out) — show spinner
  if (isLoading && !timedOut) {
    return (
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-content-muted">
        Checking permissions...
      </p>
    );
  }

  // Timed out while still loading: fall back to profile-level admin flag.
  // Only grant pass-through when RBAC is still unresolved (isLoading),
  // NOT when it has already resolved with a denial.
  if (timedOut && isLoading && !hasPermission(permission)) {
    if (isAdminProfile) {
      // RBAC never resolved — grant pass-through to admin profiles only
      return <>{children}</>;
    }
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-3">
        <p className="text-xs text-amber-300">
          Permission check timed out. Could not verify <code>{permission}</code>.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-content-secondary hover:text-content-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return (
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-amber-300">
        You do not have permission for this section.
      </p>
    );
  }

  return <>{children}</>;
}
