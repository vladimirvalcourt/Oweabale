import { Bell, Shield } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAdminPermissions } from './shared/useAdminPermissions';

const navItems = [
  { to: '/admin', label: 'Overview', end: true, requiredPermission: 'dashboard.view' },
  { to: '/admin/data', label: 'Data', requiredPermission: 'users.manage' },
  { to: '/admin/audit-logs', label: 'Audit Logs', requiredPermission: 'audit.read' },
  { to: '/admin/moderation', label: 'Moderation', requiredPermission: 'moderation.manage' },
  { to: '/admin/sessions', label: 'Sessions', requiredPermission: 'users.manage' },
  { to: '/admin/reports', label: 'Reports', requiredPermission: 'dashboard.view' },
];

export function AdminLayout() {
  const envLabel = useMemo(() => (import.meta.env.PROD ? 'Production' : 'Staging'), []);
  const { hasPermission } = useAdminPermissions();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['admin', 'notifications', 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('system_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="min-h-screen bg-surface-base text-content-secondary">
      <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-content-primary" />
            <p className="text-sm font-semibold text-content-primary">Admin Console</p>
            <span className="rounded-md border border-surface-border bg-surface-raised px-2 py-0.5 text-[10px] uppercase tracking-wider text-content-tertiary">
              {envLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative rounded-lg border border-surface-border bg-surface-raised p-2">
              <Bell className="h-4 w-4 text-content-secondary" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-3 sm:px-6 lg:px-8">
          {navItems.filter((item) => hasPermission(item.requiredPermission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs transition ${
                  isActive
                    ? 'bg-white text-black'
                    : 'border border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
