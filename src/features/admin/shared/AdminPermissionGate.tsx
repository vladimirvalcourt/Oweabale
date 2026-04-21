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

  // Still loading — but if we have timed out, fall back to profile-level check
  if (isLoading && !timedOut) {
    return (
      <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-content-muted">
        Checking permissions...
      </p>
    );
  }

  // Timed out: if is_admin=true in profiles, grant access; otherwise show error
  if (timedOut && !hasPermission(permission)) {
    if (isAdminProfile) {
      // Admin profile gets pass-through on timeout
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
