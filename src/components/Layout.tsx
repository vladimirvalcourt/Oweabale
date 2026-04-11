import React, { useState, useRef, useEffect, useCallback, useMemo, startTransition } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Home, Receipt, Target, Activity,
  Settings, Repeat, BarChart3, Plus, X, ChevronDown, Inbox,
  Vault, PieChart, TrendingUp, Calendar as CalendarIcon, Calculator, Briefcase, GraduationCap, LineChart, ShieldCheck,
  Tags, LifeBuoy, ScrollText, Wand2, Wallet, Clock
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition, Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import QuickAddModal from './QuickAddModal';
import { PrivacyScreenWhenHidden } from './PrivacyScreenWhenHidden';
import { TactileIcon, MorphingMenuIcon } from './ui/TactileIcon';
import type { Notification } from '../store/useStore';

/** Hash fragments for sidebar deep links — default route link stays inactive when one of these is set. */
const NAV_ROUTE_HASHES: Record<string, string[]> = {
  '/dashboard': ['cash-flow'],
  '/bills': ['due-soon'],
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const closeSidebarMobile = useCallback(() => {
    startTransition(() => setSidebarOpen(false));
  }, []);

  /** Close drawer after route change — avoids running setState in the same tick as Link/navigation (INP). */
  useEffect(() => {
    startTransition(() => setSidebarOpen(false));
  }, [location.pathname, location.search, location.hash]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Overview': true,
    'Activity': false,
    'Planning & Growth': false,
    'More': false,
  });

  const toggleGroup = useCallback((label: string) => {
    startTransition(() => {
      setExpandedGroups((prev) => ({
        ...prev,
        [label]: !prev[label],
      }));
    });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gChordAtRef = useRef<number | null>(null);

  const {
    bills,
    debts,
    transactions,
    subscriptions,
    goals,
    incomes,
    budgets,
    user,
    isQuickAddOpen,
    openQuickAdd,
    closeQuickAdd,
    resetData,
    pendingIngestions,
    notifications,
    markNotificationsRead,
    clearNotifications,
    citations,
  } = useStore(
    useShallow((s) => ({
      bills: s.bills,
      debts: s.debts,
      transactions: s.transactions,
      subscriptions: s.subscriptions,
      goals: s.goals,
      incomes: s.incomes,
      budgets: s.budgets,
      user: s.user,
      isQuickAddOpen: s.isQuickAddOpen,
      openQuickAdd: s.openQuickAdd,
      closeQuickAdd: s.closeQuickAdd,
      resetData: s.resetData,
      pendingIngestions: s.pendingIngestions,
      notifications: s.notifications,
      markNotificationsRead: s.markNotificationsRead,
      clearNotifications: s.clearNotifications,
      citations: s.citations,
    }))
  );
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const CHORD_MS = 1000;

    const handleKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const inTextField =
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable;

      if (inTextField) {
        gChordAtRef.current = null;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.key === 'q' && !inTextField) {
        openQuickAdd();
        return;
      }

      if (!inTextField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const now = Date.now();
        const lower = e.key.toLowerCase();

        if (gChordAtRef.current !== null && now - gChordAtRef.current < CHORD_MS) {
          if (lower === 'd') {
            e.preventDefault();
            startTransition(() => navigate('/dashboard'));
          } else if (lower === 't') {
            e.preventDefault();
            startTransition(() => navigate('/transactions'));
          } else if (lower === 'b') {
            e.preventDefault();
            startTransition(() => navigate('/bills'));
          } else if (lower === 's') {
            e.preventDefault();
            startTransition(() => navigate('/settings'));
          }
          gChordAtRef.current = null;
          return;
        }

        if (lower === 'g') {
          gChordAtRef.current = now;
          return;
        }
      }

      if (!inTextField) {
        gChordAtRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openQuickAdd]);

  useEffect(() => {
    if (user?.theme === 'Light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.classList.remove('theme-light');
      if (user?.theme && user.theme !== 'Dark') {
        document.documentElement.setAttribute('data-theme', user.theme.toLowerCase());
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [user?.theme]);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: { type: string; name: string; detail: string; path: string }[] = [];

    bills.forEach(bill => {
      if (bill.biller.toLowerCase().includes(query) || bill.category.toLowerCase().includes(query)) {
        results.push({ type: 'Bill', name: bill.biller, detail: `$${bill.amount} - ${bill.status}`, path: '/bills' });
      }
    });

    debts.forEach(debt => {
      if (debt.name.toLowerCase().includes(query) || debt.type.toLowerCase().includes(query)) {
        results.push({ type: 'Debt', name: debt.name, detail: `$${debt.remaining} remaining`, path: '/bills' });
      }
    });

    transactions.forEach(tx => {
      if (tx.name.toLowerCase().includes(query) || tx.category.toLowerCase().includes(query)) {
        results.push({ type: 'Transaction', name: tx.name, detail: `$${tx.amount} - ${tx.date}`, path: '/transactions' });
      }
    });

    subscriptions.forEach(sub => {
      if (sub.name.toLowerCase().includes(query)) {
        results.push({ type: 'Subscription', name: sub.name, detail: `$${sub.amount} / ${sub.frequency}`, path: '/subscriptions' });
      }
    });

    goals.forEach(goal => {
      if (goal.name.toLowerCase().includes(query)) {
        results.push({ type: 'Goal', name: goal.name, detail: `$${goal.currentAmount} / $${goal.targetAmount}`, path: '/goals' });
      }
    });

    incomes.forEach(inc => {
      if (inc.name.toLowerCase().includes(query) || inc.category.toLowerCase().includes(query)) {
        results.push({ type: 'Income', name: inc.name, detail: `$${inc.amount} / ${inc.frequency}`, path: '/income' });
      }
    });

    budgets.forEach(b => {
      if (b.category.toLowerCase().includes(query)) {
        results.push({ type: 'Budget', name: b.category, detail: `$${b.amount} ${b.period}`, path: '/budgets' });
      }
    });

    const pushNavShortcut = (keywords: string[], type: string, name: string, detail: string, path: string) => {
      if (keywords.some((k) => query.includes(k))) {
        results.push({ type, name, detail, path });
      }
    };
    pushNavShortcut(['categor', 'tags', 'labels'], 'Navigation', 'Categories', 'Spending categories', '/categories');
    pushNavShortcut(['support', 'help desk', 'help', 'ticket'], 'Navigation', 'Help & Support', 'Tickets & broadcasts', '/support');
    pushNavShortcut(['changelog', 'what\'s new', 'release'], 'Navigation', 'Changelog', 'Product updates', '/changelog');
    pushNavShortcut(['auto-rule', 'automation', 'categorization rule'], 'Navigation', 'Auto-Rules', 'Transaction rules in Settings', '/settings?tab=rules');

    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, bills, debts, transactions, subscriptions, goals, incomes, budgets]);

  const dueSoonCount = React.useMemo(() => {
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

    let n = 0;
    for (const b of bills) {
      const days = calendarDaysUntil(b?.dueDate ?? '');
      // Upcoming only: today through +7 days (excludes overdue bills)
      if (days !== null && days >= 0 && days <= 7) n++;
    }
    for (const s of subscriptions) {
      if (s?.status !== 'active' || !s?.nextBillingDate) continue;
      const days = calendarDaysUntil(s.nextBillingDate);
      if (days !== null && days >= 0 && days <= 7) n++;
    }
    for (const c of citations) {
      if (c.status === 'open' && c.daysLeft <= 7) n++;
    }
    return n;
  }, [bills, citations, subscriptions]);

  const handleSearchSelect = useCallback((path: string) => {
    startTransition(() => {
      navigate(path);
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
      setSearchQuery('');
    });
  }, [navigate]);

  const navGroups = useMemo(
    (): {
      label: string;
      items: { name: string; path: string; icon: typeof Home; count?: number; hash?: string }[];
    }[] => [
      {
        label: 'Overview',
        items: [
          { name: 'Dashboard', path: '/dashboard', icon: Home },
          { name: 'Cash flow', path: '/dashboard', icon: Wallet, hash: 'cash-flow' },
          { name: 'Income', path: '/income', icon: Vault },
          { name: 'Freelance Vault', path: '/freelance', icon: Briefcase },
          { name: 'Regular Bills', path: '/bills', icon: Receipt },
          { name: 'Due soon', path: '/bills', icon: Clock, hash: 'due-soon', count: dueSoonCount },
          { name: 'Tickets & Fines', path: '/bills?tab=ambush', icon: AlertTriangle },
          { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
          { name: 'Review Inbox', path: '/ingestion', icon: Inbox, count: pendingIngestions.length },
        ],
      },
      {
        label: 'Activity',
        items: [
          { name: 'Trends', path: '/analytics', icon: LineChart },
          { name: 'Reports', path: '/reports', icon: BarChart3 },
          { name: 'Transactions', path: '/transactions', icon: Activity },
        ],
      },
      {
        label: 'Planning & Growth',
        items: [
          { name: 'Net Worth', path: '/net-worth', icon: TrendingUp },
          { name: 'Budgets', path: '/budgets', icon: PieChart },
          { name: 'Academy', path: '/education', icon: GraduationCap },
          { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
          { name: 'Goals', path: '/goals', icon: Target },
          { name: 'Credit Workshop', path: '/credit', icon: ShieldCheck },
          { name: 'Taxes', path: '/taxes', icon: Calculator },
        ],
      },
      {
        label: 'More',
        items: [
          { name: 'Categories', path: '/categories', icon: Tags },
          { name: 'Help & Support', path: '/support', icon: LifeBuoy },
          { name: 'Changelog', path: '/changelog', icon: ScrollText },
          { name: 'Auto-rules', path: '/settings?tab=rules', icon: Wand2 },
        ],
      },
    ],
    [dueSoonCount, pendingIngestions.length]
  );

  const processedSidebarNav = useMemo(() => {
    const currentTabParam = new URLSearchParams(location.search).get('tab');
    const hashSlug = location.hash.replace(/^#/, '');
    return navGroups.map((group) => ({
      label: group.label,
      items: group.items.map((item) => {
        const queryPart = item.path.includes('?') ? item.path.split('?')[1] : '';
        const itemBasePath = item.path.split('?')[0];
        const itemTabParam = queryPart ? new URLSearchParams(queryPart).get('tab') : null;
        const tabMatches =
          itemTabParam !== null
            ? currentTabParam === itemTabParam
            : itemBasePath === '/bills'
              ? currentTabParam === null || !['ambush', 'recurring', 'debt'].includes(currentTabParam ?? '')
              : currentTabParam === null;
        const hashMatches = item.hash
          ? location.hash === `#${item.hash}`
          : !hashSlug || !(NAV_ROUTE_HASHES[itemBasePath] ?? []).includes(hashSlug);
        const isActive = location.pathname === itemBasePath && tabMatches && hashMatches;
        const linkTo = item.hash ? `${itemBasePath}${queryPart ? `?${queryPart}` : ''}#${item.hash}` : item.path;
        return { ...item, isActive, linkTo };
      }),
    }));
  }, [navGroups, location.pathname, location.search, location.hash]);

  return (
    <div className="min-h-[100dvh] bg-surface-base font-sans text-content-primary flex">
      <PrivacyScreenWhenHidden />
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          aria-hidden="true"
          onClick={closeSidebarMobile}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-base transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-[240px]",
          "border-r border-surface-border"
        )}
      >
        <div className="shrink-0 flex items-center justify-between h-[4.5rem] px-4 border-b border-surface-border">
          <div className="flex items-center gap-2 overflow-hidden">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <span className="brand-header-text whitespace-nowrap">
                  Oweable
                </span>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm uppercase tracking-widest">
                  Beta
                </span>
              </div>
            )}
          </div>
          <button 
            type="button"
            aria-label="Close navigation menu"
            className="lg:hidden text-content-tertiary hover:text-content-secondary p-2 transition-colors focus-app rounded-sm"
            onClick={closeSidebarMobile}
          >
            <MorphingMenuIcon isOpen={sidebarOpen} className="text-content-primary" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-hide space-y-4">
          {processedSidebarNav.map((group) => {
            const isExpanded = expandedGroups[group.label];
            return (
              <div key={group.label} className="space-y-1">
                {!sidebarCollapsed && (
                  <button 
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between px-4 py-2 text-[12px] font-sans font-semibold text-content-secondary hover:text-content-primary transition-colors group/header focus-app"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isExpanded ? "rotate-0" : "-rotate-90 text-content-tertiary")} />
                  </button>
                )}
                {/* Collapsed view line separator */}
                {sidebarCollapsed && <div className="h-[1px] bg-surface-border mx-2 my-4 opacity-50" />}

                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-300 ease-out',
                    isExpanded || sidebarCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.isActive;
                        return (
                          <Link
                            key={item.name}
                            to={item.linkTo}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 transition-all group relative rounded-sm mx-1",
                              isActive 
                                ? "text-content-primary bg-surface-highlight nav-pressed" 
                                : "text-content-secondary hover:text-content-primary hover:bg-surface-highlight"
                            )}
                            title={sidebarCollapsed ? item.name : undefined}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-md h-4 bg-brand-indigo" />
                            )}
                            <TactileIcon 
                              icon={Icon} 
                              size={16} 
                              active={isActive}
                              variant="static"
                              className={cn(
                                "shrink-0",
                                !isActive && "group-hover:translate-x-0.5"
                              )}
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="pointer-events-none text-[13px] font-sans font-medium tracking-normal flex-1">
                                  {item.name}
                                </span>
                                {(item as { count?: number }).count !== undefined && (item as { count?: number }).count! > 0 && (
                                  <span className="text-[10px] font-mono font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full shadow-lg shadow-indigo-500/20">
                                    {(item as { count?: number }).count}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapse button (Desktop only) */}
        <div className="p-4 border-t border-surface-border bg-surface-base">
          <div className={cn("mb-4", sidebarCollapsed ? "px-0" : "px-2")}>
            {!sidebarCollapsed && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  <span className="text-[11px] font-sans text-content-secondary font-semibold">Synced — Free Beta Trial</span>
                </div>
                <p className="text-[11px] font-sans text-content-tertiary leading-relaxed italic opacity-90 pl-3.5 border-l border-surface-border">
                  Pricing may be introduced later with advance notice to testers.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "flex items-center w-full py-2 text-[12px] font-sans font-medium text-content-tertiary bg-surface-raised border border-surface-border rounded-sm hover:text-content-primary hover:bg-surface-highlight transition-all group",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <MorphingMenuIcon isOpen={!sidebarCollapsed} className="scale-75 text-content-tertiary group-hover:text-content-primary transition-colors" />
              </div>
              {!sidebarCollapsed && <span>Enforce Collapse</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                useStore.getState().signOut();
                toast.success('Session Terminated');
                navigate('/auth');
              }}
              className={cn(
                "flex items-center w-full py-2 mt-2 text-[12px] font-sans font-bold uppercase tracking-widest text-rose-500/80 bg-rose-500/5 border border-rose-500/10 rounded-sm hover:text-rose-400 hover:bg-rose-500/10 transition-all group",
                sidebarCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3"
              )}
              title={sidebarCollapsed ? "Sign Out" : undefined}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180 group-hover:-translate-x-0.5 transition-transform"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </div>
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div 
        className={cn(
          "flex-1 flex flex-col h-[100dvh] overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out",
          /* pl must match aside width (240px), not pl-64 (256px), or the top hairline gaps under the search */
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-[240px]"
        )}
      >
        {/* Top Bar */}
        <header className="shrink-0 bg-surface-base sticky top-0 z-30 h-[4.5rem] flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-surface-border">
          <div className="flex items-center gap-4 flex-1">
            <button 
              type="button"
              aria-label="Open navigation menu"
              className="lg:hidden text-content-tertiary hover:text-content-secondary focus-app rounded-sm p-1"
              onClick={() => setSidebarOpen(true)}
            >
              <MorphingMenuIcon isOpen={sidebarOpen} className="scale-110" />
            </button>
            
            {/* Global Search (Desktop) */}
            <div className="hidden md:flex flex-col max-w-md w-full" ref={searchRef}>
              <label htmlFor="layout-global-search" className="sr-only">
                Search bills, transactions, subscriptions, and budgets
              </label>
              <div className="relative w-full">
              <Search className="w-4 h-4 text-content-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
              <input 
                id="layout-global-search"
                ref={searchInputRef}
                type="text" 
                placeholder="Search (⌘K)" 
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 pr-4 py-2 bg-surface-highlight rounded-md text-[13px] font-sans text-content-primary placeholder-content-tertiary focus:bg-surface-border-subtle transition-all border border-surface-border focus-app-field-neutral"
              />
              
              {/* Search Dropdown */}
              {isSearchOpen && searchQuery.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised border border-surface-border rounded-sm shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((result, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleSearchSelect(result.path)}
                            className="w-full text-left px-4 py-2 hover:bg-surface-elevated transition-colors flex flex-col"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-content-primary">{result.name}</span>
                              <span className="text-xs text-content-tertiary bg-surface-elevated px-1.5 py-0.5 rounded">{result.type}</span>
                            </div>
                            <span className="text-xs text-content-tertiary mt-0.5">{result.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-content-tertiary text-center">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
              </div>
              <p className="mt-1.5 pl-1 text-[10px] font-sans text-content-muted leading-none hidden lg:block">
                <kbd className="px-1 py-0.5 rounded bg-surface-elevated border border-surface-border font-mono text-[9px]">⌘K</kbd>
                <span className="mx-1.5">search</span>
                <span className="text-content-tertiary">·</span>
                <kbd className="px-1 py-0.5 rounded bg-surface-elevated border border-surface-border font-mono text-[9px] ml-1.5">Q</kbd>
                <span className="ml-1">quick add</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Icon (Mobile) */}
            <button 
              type="button"
              aria-label="Open search"
              onClick={() => setIsMobileSearchOpen(true)} 
              className="md:hidden text-content-tertiary hover:text-content-secondary transition-colors p-1 focus-app rounded-sm min-w-11 min-h-11 flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Add Button */}
            <button
              type="button"
              aria-label="Quick add income, bill, or transaction"
              title="Quick add (keyboard Q)"
              onClick={() => openQuickAdd()}
              className="hidden sm:inline-flex items-center gap-2 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-all btn-tactile px-5 py-2.5 focus-app"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              Add entry
            </button>
            <button
              type="button"
              aria-label="Quick add transaction or bill"
              onClick={() => openQuickAdd()}
              className="sm:hidden flex items-center justify-center w-11 h-11 bg-brand-cta hover:bg-brand-cta-hover text-white transition-all btn-tactile focus-app"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={isNotifOpen}
                aria-haspopup="true"
                onClick={() => { setIsNotifOpen(v => !v); if (!isNotifOpen) markNotificationsRead(); }}
                className="relative p-1 overflow-visible group min-w-11 min-h-11 flex items-center justify-center focus-app rounded-sm"
              >
                <TactileIcon icon={Bell} size={16} className="text-content-tertiary group-hover:text-content-primary" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-indigo rounded-full shadow-glow-indigo" />
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0C0D0E]/98 backdrop-blur-xl border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-content-secondary">Notifications</span>
                    <button onClick={() => clearNotifications()} className="text-[10px] font-mono text-content-muted hover:text-content-tertiary uppercase tracking-widest transition-colors">Clear all</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-content-muted text-[11px] font-mono uppercase tracking-widest">No notifications</div>
                    ) : (
                      notifications.map((n: Notification) => (
                        <div key={n.id} className={cn('px-4 py-3 border-b border-white/5 last:border-0', !n.read && 'bg-indigo-500/5')}>
                          <div className="flex items-start gap-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'error' ? 'bg-red-500' : 'bg-indigo-500')} />
                            <div>
                              <p className="text-[12px] font-mono text-content-primary font-medium">{n.title}</p>
                              <p className="text-[11px] font-mono text-content-tertiary mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] font-mono text-content-muted mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button
                aria-label="Account menu"
                className="h-11 w-11 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors focus-app"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    width={44}
                    height={44}
                    decoding="async"
                    className="h-full w-full object-cover"
                    data-no-invert
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-brand-indigo/10">
                    <span className="text-xs font-sans font-semibold text-brand-indigo">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                  </div>
                )}
              </HeadlessMenu.Button>
              <Transition
                as={React.Fragment}
                enter="transition-all duration-200 ease-out"
                enterFrom="opacity-0 scale-[0.96] -translate-y-1"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="transition-all duration-150 ease-in"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-[0.96] -translate-y-1"
              >
                <HeadlessMenu.Items className="absolute right-0 mt-3 w-56 origin-top-right bg-[#0C0D0E]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-app overflow-hidden z-50">
                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-white/5 text-white' : 'text-content-tertiary'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-content-tertiary">
                            <Settings className="w-4 h-4" />
                          </div>
                          <span>Settings</span>
                        </Link>
                      )}
                    </HeadlessMenu.Item>


                  </div>

                  <div className="h-[1px] bg-white/5 my-1" />

                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          to="/"
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-white/5 text-white' : 'text-content-tertiary'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                          </div>
                          <span>Homepage</span>
                        </Link>
                      )}
                    </HeadlessMenu.Item>

                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setIsResetOpen(true)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-amber-500/10 text-amber-500' : 'text-content-tertiary'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-amber-500/70">
                            <Activity className="w-4 h-4" />
                          </div>
                          <span>Restart Protocol</span>
                        </button>
                      )}
                    </HeadlessMenu.Item>

                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          to="/onboarding"
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-white/5 text-white' : 'text-content-tertiary'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4-4-4"></path><path d="M3 3.412C3 3.185 3.184 3 3.412 3H16.48c0.04 0 0.16 0.04 0.16 0.16V10a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1V3.412Z"></path><path d="M3 21v-8a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0Z"></path></svg>
                          </div>
                          <span>Onboarding</span>
                        </Link>
                      )}
                    </HeadlessMenu.Item>
                  </div>

                  <div className="h-[1px] bg-white/5 my-1" />

                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            useStore.getState().signOut();
                            toast.success('Logged out');
                            navigate('/auth');
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-white/5 text-red-400' : 'text-content-tertiary'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                          </div>
                          <span>Log out</span>
                        </button>
                      )}
                    </HeadlessMenu.Item>
                  </div>
                </HeadlessMenu.Items>
              </Transition>
            </HeadlessMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
          {/* Plain Outlet: motion/AnimatePresence here ran in the same interaction window as
              route commits and hurt INP; lazy route JS + page paint are already the heavy work. */}
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-surface-base border-t border-surface-border py-6 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-content-tertiary">
              &copy; {new Date().getFullYear()} Oweable Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-content-tertiary">
              <Link to="/privacy" className="hover:text-content-secondary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-content-secondary transition-colors">Terms of Service</Link>
              <Link to="/security" className="hover:text-content-secondary transition-colors">Security</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Search Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden flex flex-col">
          <div className="p-4 bg-surface-raised border-b border-surface-border flex items-center gap-3">
            <label htmlFor="layout-mobile-search" className="sr-only">
              Search bills, transactions, debts, and more
            </label>
            <Search className="w-5 h-5 text-content-tertiary shrink-0" aria-hidden />
            <input 
              id="layout-mobile-search"
              autoFocus
              type="text" 
              placeholder="Search bills, transactions, debts..." 
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-base text-content-primary placeholder:text-content-muted focus-app rounded-sm px-1"
            />
            <button 
              type="button"
              aria-label="Close search"
              onClick={() => {
                startTransition(() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery('');
                });
              }}
              className="p-2 text-content-tertiary hover:text-content-secondary min-w-11 min-h-11 flex items-center justify-center focus-app rounded-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide bg-surface-base">
            {searchQuery.trim() !== '' ? (
              searchResults.length > 0 ? (
                <ul className="py-2">
                  {searchResults.map((result, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleSearchSelect(result.path)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors flex flex-col border-b border-surface-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-content-primary">{result.name}</span>
                          <span className="text-xs text-content-tertiary bg-surface-elevated px-1.5 py-0.5 rounded">{result.type}</span>
                        </div>
                        <span className="text-sm text-content-tertiary mt-1">{result.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-content-tertiary">
                  No results found for "{searchQuery}"
                </div>
              )
            ) : (
              <div className="px-4 py-8 text-center text-content-muted text-sm">
                Type to start searching...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal isOpen={isQuickAddOpen} onClose={closeQuickAdd} />

      {/* Global Reset Confirmation */}
      <Dialog open={isResetOpen} onClose={() => setIsResetOpen(false)} className="relative z-[70]">
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-sm bg-surface-raised border border-surface-border p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary font-sans">Wipe All Data?</Dialog.Title>
            </div>
            <Dialog.Description className="text-[13px] text-content-tertiary mb-6 leading-relaxed font-sans">
              This will permanently delete every bill, transaction, and financial link you've created. You will be sent back to the initial setup to start fresh.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-[11px] font-mono font-bold uppercase tracking-widest text-content-tertiary hover:text-content-primary transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  await resetData();
                  setIsResetting(false);
                  setIsResetOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-[11px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10"
              >
                {isResetting && <Activity className="w-3 h-3 animate-spin" />}
                {isResetting ? 'Wiping...' : 'Confirm Wipe'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
