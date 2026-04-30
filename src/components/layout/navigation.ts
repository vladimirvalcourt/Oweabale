import {
  AlertCircle,
  ArrowRightLeft,
  BarChart3,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
  Inbox,
  Landmark,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Repeat,
  ShieldCheck,
  Settings,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { Citation, Bill, Subscription } from '@/store';

export const NAV_ROUTE_HASHES: Record<string, string[]> = {
  '/pro/dashboard': ['safe-spend'],
  '/pro/bills': ['due-soon'],
};

export type NavItem = {
  name: string;
  path: string;
  icon: typeof MoreHorizontal;
  count?: number;
  hash?: string;
  lazyImport?: () => Promise<unknown>;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type ProcessedNavItem = NavItem & {
  isActive: boolean;
  linkTo: string;
};

export type ProcessedNavGroup = {
  label: string;
  items: ProcessedNavItem[];
};

export function computeDueSoonCount({
  bills,
  subscriptions,
  citations,
}: {
  bills: Bill[];
  subscriptions: Subscription[];
  citations: Citation[];
}): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msDay = 86400000;

  const calendarDaysUntil = (isoLike: string): number | null => {
    if (!isoLike) return null;
    const raw = isoLike.includes('T') ? isoLike : `${isoLike}T12:00:00`;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / msDay);
  };

  let count = 0;

  for (const bill of bills) {
    const days = calendarDaysUntil(bill?.dueDate ?? '');
    if (days !== null && days >= 0 && days <= 7) count++;
  }

  for (const subscription of subscriptions) {
    if (subscription?.status !== 'active' || !subscription?.nextBillingDate) continue;
    const days = calendarDaysUntil(subscription.nextBillingDate);
    if (days !== null && days >= 0 && days <= 7) count++;
  }

  for (const citation of citations) {
    if (citation.status === 'open' && citation.daysLeft <= 7) count++;
  }

  return count;
}

export function buildDueSoonPreview({
  bills,
  subscriptions,
}: {
  bills: Bill[];
  subscriptions: Subscription[];
}): { name: string; amount: number; dueDate: string; label: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDateLabel = (isoLike: string): string => {
    const d = new Date(isoLike.includes('T') ? isoLike : `${isoLike}T12:00:00`);
    return Number.isNaN(d.getTime()) ? 'Unknown date' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const upcomingBills = bills
    .filter((bill) => bill?.status !== 'paid' && bill?.dueDate)
    .map((bill) => ({
      name: bill.biller,
      amount: bill.amount,
      dueDate: bill.dueDate,
    }))
    .filter((bill) => {
      const due = new Date(`${bill.dueDate}T12:00:00`);
      const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    });

  const upcomingSubscriptions = subscriptions
    .filter((subscription) => subscription.status === 'active' && subscription.nextBillingDate)
    .map((subscription) => ({
      name: subscription.name,
      amount: subscription.amount,
      dueDate: subscription.nextBillingDate,
    }))
    .filter((subscription) => {
      const due = new Date(`${subscription.dueDate}T12:00:00`);
      const days = Math.floor((due.getTime() - today.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    });

  return [...upcomingBills, ...upcomingSubscriptions]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3)
    .map((item) => ({
      ...item,
      label: `${item.name} · $${item.amount.toFixed(2)} · ${toDateLabel(item.dueDate)}`,
    }));
}

export function buildNavGroups({
  dueSoonCount,
  pendingIngestionsCount,
}: {
  dueSoonCount: number;
  pendingIngestionsCount: number;
}): NavGroup[] {
  const coreNavItems: NavItem[] = [
    { name: 'Pay List', path: '/pro/dashboard', icon: LayoutDashboard, count: dueSoonCount, lazyImport: () => import('../../pages/Dashboard') },
    { name: 'Pay List details', path: '/pro/bills', icon: BarChart3, lazyImport: () => import('../../pages/Obligations') },
    { name: 'Due soon', path: '/pro/bills', icon: Clock, hash: 'due-soon', count: dueSoonCount },
    { name: 'Debt minimums', path: '/pro/bills?tab=debt', icon: Landmark },
    { name: 'Tolls, tickets & fines', path: '/pro/bills?tab=ambush', icon: AlertCircle },
    { name: 'Calendar', path: '/pro/calendar', icon: CalendarIcon, lazyImport: () => import('../../pages/Calendar') },
    { name: 'Documents', path: '/pro/documents', icon: Inbox, count: pendingIngestionsCount, lazyImport: () => import('../../pages/Ingestion') },
  ];

  const moneyNavItems: NavItem[] = [
    { name: 'Spending comfort', path: '/pro/dashboard', icon: Wallet, hash: 'safe-spend' },
    { name: 'Transactions', path: '/pro/transactions', icon: ArrowRightLeft, lazyImport: () => import('../../pages/Transactions') },
    { name: 'Subscriptions', path: '/pro/subscriptions', icon: Repeat, lazyImport: () => import('../../pages/Subscriptions') },
    { name: 'Budgets', path: '/pro/budgets', icon: PieChart, lazyImport: () => import('../../pages/Budgets') },
    { name: 'Income', path: '/pro/income', icon: Banknote, lazyImport: () => import('../../pages/Income') },
    { name: 'Freelance', path: '/pro/freelance', icon: BriefcaseBusiness, lazyImport: () => import('../../pages/Freelance') },
    { name: 'Taxes', path: '/pro/taxes', icon: ShieldCheck, lazyImport: () => import('../../pages/Taxes') },
  ];

  const planningNavItems: NavItem[] = [
    { name: 'Goals', path: '/pro/goals', icon: Target, lazyImport: () => import('../../pages/Goals') },
    { name: 'Savings', path: '/pro/savings', icon: Wallet, lazyImport: () => import('../../pages/Savings') },
    { name: 'Net worth', path: '/pro/net-worth', icon: TrendingUp, lazyImport: () => import('../../pages/NetWorth') },
    { name: 'Investments', path: '/pro/investments', icon: BarChart3, lazyImport: () => import('../../pages/Investments') },
    { name: 'Insurance', path: '/pro/insurance', icon: ShieldCheck, lazyImport: () => import('../../pages/Insurance') },
    { name: 'Credit center', path: '/pro/credit', icon: Landmark, lazyImport: () => import('../../pages/CreditCenter') },
  ];

  const insightNavItems: NavItem[] = [
    { name: 'Reports', path: '/pro/reports', icon: BookOpen, lazyImport: () => import('../../pages/Reports') },
    { name: 'Analytics', path: '/pro/analytics', icon: BarChart3, lazyImport: () => import('../../pages/Analytics') },
    { name: 'Education', path: '/pro/education', icon: GraduationCap, lazyImport: () => import('../../pages/Education') },
    { name: 'Categories', path: '/pro/categories', icon: PieChart, lazyImport: () => import('../../pages/Categories') },
    { name: 'Support', path: '/pro/app/support', icon: AlertCircle, lazyImport: () => import('../../pages/HelpDesk') },
    { name: 'Changelog', path: '/pro/changelog', icon: Clock, lazyImport: () => import('../../pages/Changelog') },
  ];

  return [
    { label: 'Core', items: coreNavItems },
    { label: 'Money', items: moneyNavItems },
    { label: 'Planning', items: planningNavItems },
    { label: 'Insights', items: insightNavItems },
  ];
}

export function processSidebarNav({
  groups,
  pathname,
  search,
  hash,
}: {
  groups: NavGroup[];
  pathname: string;
  search: string;
  hash: string;
}): ProcessedNavGroup[] {
  const currentTabParam = new URLSearchParams(search).get('tab');
  const hashSlug = hash.replace(/^#/, '');

  return groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => {
      const queryPart = item.path.includes('?') ? item.path.split('?')[1] : '';
      const itemBasePath = item.path.split('?')[0];
      const itemTabParam = queryPart ? new URLSearchParams(queryPart).get('tab') : null;
      const tabMatches =
        itemTabParam !== null
          ? currentTabParam === itemTabParam
          : itemBasePath === '/pro/bills'
            ? item.name === 'Pay List details' || currentTabParam === null || !['ambush', 'recurring', 'debt'].includes(currentTabParam ?? '')
            : currentTabParam === null;
      const hashMatches = item.hash
        ? hash === `#${item.hash}`
        : !hashSlug || !(NAV_ROUTE_HASHES[itemBasePath] ?? []).includes(hashSlug);
      const isActive = pathname === itemBasePath && tabMatches && hashMatches;
      const linkTo = item.hash ? `${itemBasePath}${queryPart ? `?${queryPart}` : ''}#${item.hash}` : item.path;
      return { ...item, isActive, linkTo };
    }),
  }));
}
