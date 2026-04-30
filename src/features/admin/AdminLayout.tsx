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
  Radio,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UserX,
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
      <div className="border-b border-surface-border bg-surface-raised/85 shadow-sm shadow-black/5">
        <header className="mx-auto flex max-w-[92rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-h-[2.5rem] items-center justify-between gap-3">
            <TransitionLink to="/pro/dashboard" className="flex items-center gap-2">
              <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.08em] text-content-primary" />
            </TransitionLink>
            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />
            </div>
          </div>

          <form
            className="relative w-full lg:max-w-xl"
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

          <div className="hidden items-center gap-2 lg:flex">
            <span className="border border-surface-border bg-surface-base px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">
              {envLabel}
            </span>
            {isSuperAdmin ? (
              <span className="border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
                Super admin
              </span>
            ) : null}
            <ThemeToggle />
            <div
              className="relative border border-surface-border bg-surface-base p-2"
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
                <span className="absolute -right-1 -top-1 bg-rose-600 px-1.5 text-[10px] font-semibold text-white" aria-hidden>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <nav className="mx-auto flex max-w-[92rem] gap-5 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="Admin sections">
          {permissionsLoading ? (
            <div className="flex shrink-0 items-center gap-2 py-0.5" aria-hidden>
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="h-8 w-[6rem] shrink-0 animate-pulse bg-surface-elevated/80" />
              ))}
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.label} className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted">{group.label}</span>
                <div className="flex items-center gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(
                            'interactive-focus inline-flex h-8 shrink-0 items-center gap-1.5 border px-2.5 text-xs font-medium transition-colors',
                            isActive
                              ? 'border-content-primary bg-content-primary text-surface-base'
                              : 'border-surface-border bg-surface-base text-content-secondary hover:border-content-primary hover:text-content-primary',
                          )
                        }
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </nav>
      </div>

      <main className="mx-auto w-full max-w-[92rem] px-0 sm:px-2 lg:px-4">
        <Outlet />
      </main>
    </div>
  );
}
