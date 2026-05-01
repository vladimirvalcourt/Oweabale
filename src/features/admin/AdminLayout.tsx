import {
  Activity,
  Bell,
  CreditCard,
  Database,
  FileText,
  Gavel,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  Radio,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserX,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/api/supabase';
import { useAdminPermissions } from './shared';
import { ThemeToggle } from '@/components/common';
import { BrandWordmark } from '@/components/common';
import { TransitionLink } from '@/components/common';
import { adminInputClass } from './shared/AdminUI';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Monitor',
    items: [
      { to: '/admin', label: 'Ops home', end: true, requiredPermission: 'dashboard.view', icon: LayoutDashboard },
      { to: '/admin/telemetry', label: 'Telemetry', requiredPermission: 'telemetry.read', icon: Radio },
      { to: '/admin/reports', label: 'Reports', requiredPermission: 'dashboard.view', icon: FileText },
    ],
  },
  {
    label: 'Users',
    items: [
      { to: '/admin/user', label: 'Case files', requiredPermission: 'users.read', icon: UserRound },
      { to: '/admin/support', label: 'Support', requiredPermission: 'support.manage', icon: Megaphone },
      { to: '/admin/billing', label: 'Billing', requiredPermission: 'billing.manage', icon: CreditCard },
      { to: '/admin/lifecycle', label: 'Lifecycle', requiredPermission: 'users.manage', icon: UserX },
      { to: '/admin/sessions', label: 'Sessions', requiredPermission: 'users.manage', icon: Activity },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/admin/data', label: 'Explorer', requiredPermission: 'users.manage', icon: Database },
      { to: '/admin/audit-logs', label: 'Audit log', requiredPermission: 'audit.read', icon: ShieldAlert },
    ],
  },
  {
    label: 'Governance',
    items: [
      { to: '/admin/governance', label: 'RBAC', requiredPermission: 'governance.manage', icon: ShieldCheck },
      { to: '/admin/incident', label: 'Incident', requiredPermission: 'incident.manage', icon: Radio },
      { to: '/admin/moderation', label: 'Moderation', requiredPermission: 'moderation.manage', icon: Gavel },
      { to: '/admin/compliance', label: 'Compliance', requiredPermission: 'compliance.read', icon: Scale },
    ],
  },
  {
    label: 'Comms',
    items: [
      { to: '/admin/comms', label: 'Comms', requiredPermission: 'comms.manage', icon: Mail },
    ],
  },
];

export function AdminLayout() {
  const envLabel = useMemo(() => (import.meta.env.PROD ? 'Production' : 'Preview'), []);
  const [lookup, setLookup] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { hasPermission, isLoading: permissionsLoading, isSuperAdmin } = useAdminPermissions();

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

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => hasPermission(item.requiredPermission)) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-surface-base text-content-secondary">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-base/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform border-r border-surface-border bg-surface-raised transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <TransitionLink to="/pro/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.08em] text-content-primary" />
            </TransitionLink>
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5 text-content-secondary hover:text-content-primary" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin sections">
            {permissionsLoading ? (
              <div className="space-y-2" aria-hidden>
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div key={idx} className="h-8 animate-pulse bg-surface-elevated/80 rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {visibleGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'interactive-focus flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                                isActive
                                  ? 'bg-content-primary text-surface-base'
                                  : 'text-content-secondary hover:bg-surface-elevated hover:text-content-primary',
                              )
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-surface-border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="border border-surface-border bg-surface-base px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
                {envLabel}
              </span>
              {isSuperAdmin ? (
                <span className="border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-status-warning-text)] dark:text-[var(--color-status-warning-text-dark)]">
                  Super admin
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div
                className="relative border border-surface-border bg-surface-base p-2 rounded-md"
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
                  <span className="absolute -right-1 -top-1 bg-rose-600 px-1.5 text-[10px] font-semibold text-white rounded-full" aria-hidden>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-surface-border bg-surface-raised/85 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {/* Hamburger menu button */}
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu className="h-5 w-5 text-content-secondary hover:text-content-primary" />
            </button>

            {/* Search */}
            <form
              className="relative flex-1 lg:max-w-xl"
              onSubmit={(event) => {
                event.preventDefault();
                const target = lookup.trim();
                if (!target) return;
                navigate(target.includes('@') ? '/admin/user' : `/admin/user/${encodeURIComponent(target)}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input
                value={lookup}
                onChange={(event) => setLookup(event.target.value)}
                placeholder="Jump to user id, email lookup, audit trail, or data table"
                className={cn(adminInputClass, 'h-10 w-full pl-9 text-sm')}
              />
            </form>
          </div>
        </header>

        {/* Page content */}
        <main className="w-full px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
