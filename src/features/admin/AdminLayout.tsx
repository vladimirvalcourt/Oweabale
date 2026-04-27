import { Bell } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/api/supabase';
import { useAdminPermissions } from './shared';
import { ThemeToggle } from '../../components/common';
import { BrandWordmark } from '../../components/common';
import { TransitionLink } from '../../components/common';

const navItems = [
  { to: '/admin', label: 'Overview', end: true, requiredPermission: 'dashboard.view' },
  { to: '/admin/user', label: 'Case file', requiredPermission: 'users.read' },
  { to: '/admin/data', label: 'Data', requiredPermission: 'users.manage' },
  { to: '/admin/audit-logs', label: 'Audit Logs', requiredPermission: 'audit.read' },
  { to: '/admin/moderation', label: 'Moderation', requiredPermission: 'moderation.manage' },
  { to: '/admin/sessions', label: 'Sessions', requiredPermission: 'users.manage' },
  { to: '/admin/reports', label: 'Reports', requiredPermission: 'dashboard.view' },
  { to: '/admin/compliance', label: 'Compliance', requiredPermission: 'compliance.read' },
  { to: '/admin/telemetry', label: 'Telemetry', requiredPermission: 'telemetry.read' },
  // ADD 7 + 6
  { to: '/admin/email-blast', label: 'Email Blast', requiredPermission: 'moderation.manage' },
];


export function AdminLayout() {
  const envLabel = useMemo(() => (import.meta.env.PROD ? 'Production' : 'Staging'), []);
  const { hasPermission, isLoading: permissionsLoading } = useAdminPermissions();

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
      <header className="border-b border-surface-border">
        <div className="mx-auto flex max-w-7xl min-h-[3.25rem] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-h-[3rem] items-center gap-3">
            <TransitionLink to="/pro/dashboard" className="flex items-center gap-2">
              <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.08em] text-content-primary" />
            </TransitionLink>
            <span className="shrink-0 border border-surface-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-content-tertiary">
              {envLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div
              className="relative border border-surface-border p-2"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <Bell className="h-4 w-4 text-content-secondary" aria-hidden />
              <span className="sr-only">
                {unreadCount > 0
                  ? `${unreadCount > 99 ? '99 plus' : unreadCount} unread system notifications`
                  : 'No unread system notifications'}
              </span>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white" aria-hidden>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <nav
          className="mx-auto flex min-h-10 max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto px-4 py-3 scrollbar-hide sm:px-6 lg:px-8"
          aria-label="Admin sections"
        >
          {permissionsLoading ? (
            <div className="flex shrink-0 items-center gap-2 py-0.5" aria-hidden>
              {navItems.map((item) => (
                <div
                  key={item.to}
                  className="h-8 w-[5.5rem] shrink-0 animate-pulse rounded-lg bg-surface-elevated/70"
                />
              ))}
            </div>
          ) : (
            navItems
              .filter((item) => hasPermission(item.requiredPermission))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `shrink-0 border px-3 py-1.5 text-xs ${
                      isActive
                        ? 'border-content-primary text-content-primary'
                        : 'border-surface-border text-content-secondary hover:text-content-primary'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-0 sm:px-2 lg:px-4">
        <Outlet />
      </main>
    </div>
  );
}
