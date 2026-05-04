import React, { useState, useRef, useEffect, useCallback, useMemo, startTransition, useDeferredValue, memo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TransitionLink } from '@/components/common/TransitionLink';
import {
  Bell, Search, Plus, X,
  Command, Activity, AlertTriangle, MoreHorizontal,
  LayoutDashboard, CalendarDays, Inbox, Settings
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition, Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import QuickAddModal from '@/components/common/QuickAddModal';
import { TactileIcon, MorphingMenuIcon } from '@/components/ui/TactileIcon';
import type { Notification } from '@/store';
import { useFullSuiteAccess } from '@/hooks';
import { formatCategoryLabel } from '@/lib/api/services/categoryDisplay';
import { BrandWordmark } from '@/components/common/BrandWordmark';
import { KeyboardShortcutsDialog } from '@/components/common/KeyboardShortcutsDialog';
import { isApplePointerPlatform } from '@/lib/utils';
// REMOVED: HouseholdMember import (feature deleted)
import TrialBanner from '@/components/common/TrialBanner';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useTheme } from '@/hooks';
import {
  buildDueSoonPreview,
  buildNavGroups,
  computeDueSoonCount,
  processSidebarNav,
} from './navigation';

/**
 * Fix 4: One-shot hover prefetch — fires the lazy import() on first mouseenter so
 * the route chunk is downloaded and parsed BEFORE the click. Uses a Set<string> ref
 * per component instance (shared across re-renders). Safe to call multiple times;
 * the Set deduplication ensures each chunk is only fetched once per session.
 */
function usePrefetchedSet() {
  return useRef<Set<string>>(new Set());
}

/**
 * Memoized sidebar header - prevents unnecessary re-renders when store data changes.
 * Only re-renders when sidebarCollapsed or sidebarOpen state changes.
 */
const SidebarHeader = memo(function SidebarHeader({
  sidebarCollapsed,
  sidebarOpen,
  closeSidebarMobile,
}: {
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  closeSidebarMobile: () => void;
}) {
  return (
    <div className="flex h-[4.5rem] shrink-0 items-center justify-between gap-2 border-b border-surface-border/90 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {!sidebarCollapsed ? (
          <TransitionLink to="/pro/dashboard" className="min-w-0 shrink focus-app rounded-lg">
            <BrandWordmark textClassName="brand-header-text" />
          </TransitionLink>
        ) : (
          <div className="flex w-full justify-center">
            <TransitionLink
              to="/pro/dashboard"
              aria-label="Oweable home"
              className="flex shrink-0 rounded-lg p-1 focus-app"
            >
              <img
                src="/brand/oweable-logo-glyph.png"
                alt=""
                className="h-7 w-7 rounded-sm object-contain"
                width={28}
                height={28}
              />
            </TransitionLink>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Close navigation menu"
          className="shrink-0 p-2 text-content-tertiary transition-colors hover:text-content-secondary focus-app rounded-lg lg:hidden"
          onClick={closeSidebarMobile}
        >
          <MorphingMenuIcon isOpen={sidebarOpen} className="text-content-primary" />
        </button>
      </div>
    </div>
  );
});

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefetchedPaths = usePrefetchedSet(); // Fix 4
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarInteracting, setSidebarInteracting] = useState(false);
  const sidebarCollapsed = !sidebarOpen && !sidebarInteracting;

  // Initialize theme system
  const { theme } = useTheme();

  const closeSidebarMobile = useCallback(() => {
    startTransition(() => setSidebarOpen(false));
  }, []);

  /** Close drawer after route change — avoids running setState in the same tick as Link/navigation (INP). */
  useEffect(() => {
    startTransition(() => setSidebarOpen(false));
  }, [location.pathname, location.search, location.hash]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showDueSoonPreview, setShowDueSoonPreview] = useState(false);
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
    // REMOVED: pendingIngestions (table deleted)
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
      // REMOVED: pendingIngestions (table deleted)
      notifications: s.notifications,
      markNotificationsRead: s.markNotificationsRead,
      clearNotifications: s.clearNotifications,
      citations: s.citations,
    }))
  );
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const { hasFullSuite, isLoading: checkingFullSuite } = useFullSuiteAccess();
  const searchModKey = useMemo(() => (isApplePointerPlatform() ? '⌘' : 'Ctrl'), []);
  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const accountDisplayName = useMemo(() => {
    const u = user;
    if (!u) return '';
    const first = u.firstName.trim();
    const last = u.lastName.trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    return u.email?.split('@')[0] ?? 'Account';
  }, [user]);

  const planBadgeLabel = 'Full Suite';
  const isSettingsRoute = location.pathname.startsWith('/pro/settings');

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
    if (!isNotifOpen) return;
    const onDocMouse = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotifOpen(false);
    };
    document.addEventListener('mousedown', onDocMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [isNotifOpen]);

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
        openQuickAdd('obligation');
        return;
      }

      if (!inTextField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const now = Date.now();
        const lower = e.key.toLowerCase();

        if (gChordAtRef.current !== null && now - gChordAtRef.current < CHORD_MS) {
          if (lower === 'd') {
            e.preventDefault();
            startTransition(() => navigate('/pro/dashboard'));
          } else if (lower === 't') {
            e.preventDefault();
            startTransition(() => navigate('/pro/transactions'));
          } else if (lower === 'b') {
            e.preventDefault();
            startTransition(() => navigate('/pro/bills'));
          } else if (lower === 's') {
            e.preventDefault();
            startTransition(() => navigate('/pro/settings'));
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
    // Theme is now managed by useTheme hook - no need to sync with user?.theme
    // The useTheme hook handles localStorage and system preference automatically
  }, []);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  // Extract search data once to avoid recreating function on every render
  const searchData = useMemo(() => ({
    bills,
    debts,
    transactions,
    subscriptions,
    goals,
    incomes,
    budgets,
  }), [bills, debts, transactions, subscriptions, goals, incomes, budgets]);

  const searchResults = React.useMemo(() => {
    if (!deferredSearchQuery) return [];

    const query = deferredSearchQuery.toLowerCase();
    const results: { type: string; name: string; detail: string; path: string }[] = [];

    searchData.bills.forEach(bill => {
      if (bill.biller.toLowerCase().includes(query) || bill.category.toLowerCase().includes(query)) {
        results.push({ type: 'Bill', name: bill.biller, detail: `$${bill.amount} - ${bill.status}`, path: '/pro/bills' });
      }
    });

    searchData.debts.forEach(debt => {
      if (debt.name.toLowerCase().includes(query) || debt.type.toLowerCase().includes(query)) {
        results.push({ type: 'Debt', name: debt.name, detail: `$${debt.remaining} remaining`, path: '/pro/bills' });
      }
    });

    searchData.transactions.forEach(tx => {
      if (tx.name.toLowerCase().includes(query) || tx.category.toLowerCase().includes(query)) {
        results.push({ type: 'Transaction', name: tx.name, detail: `$${tx.amount} - ${tx.date}`, path: '/pro/transactions' });
      }
    });

    searchData.subscriptions.forEach(sub => {
      if (sub.name.toLowerCase().includes(query)) {
        results.push({ type: 'Subscription', name: sub.name, detail: `$${sub.amount} / ${sub.frequency}`, path: '/pro/subscriptions' });
      }
    });

    searchData.goals.forEach(goal => {
      if (goal.name.toLowerCase().includes(query)) {
        results.push({ type: 'Goal', name: goal.name, detail: `$${goal.currentAmount} / $${goal.targetAmount}`, path: '/pro/goals' });
      }
    });

    searchData.incomes.forEach(inc => {
      if (inc.name.toLowerCase().includes(query) || inc.category.toLowerCase().includes(query)) {
        results.push({ type: 'Income', name: inc.name, detail: `$${inc.amount} / ${inc.frequency}`, path: '/pro/income' });
      }
    });

    searchData.budgets.forEach(b => {
      if (b.category.toLowerCase().includes(query)) {
        results.push({
          type: 'Budget',
          name: formatCategoryLabel(b.category),
          detail: `$${b.amount} ${b.period}`,
          path: '/pro/budgets',
        });
      }
    });

    const pushNavShortcut = (keywords: string[], type: string, name: string, detail: string, path: string) => {
      if (keywords.some((k) => query.includes(k))) {
        results.push({ type, name, detail, path });
      }
    };
    pushNavShortcut(
      ['pay list', 'dashboard', 'due', 'overdue', 'owe', 'pay'],
      'Navigation',
      'Pay List',
      'Overdue, due soon, debt minimums, and tickets',
      '/pro/dashboard',
    );
    pushNavShortcut(
      ['toll', 'ticket', 'fine', 'citation'],
      'Navigation',
      'Tolls, tickets & fines',
      'Open fines and citations',
      '/pro/bills?tab=ambush',
    );
    pushNavShortcut(
      ['document', 'documents', 'notice', 'proof', 'scan', 'upload', 'form', 'forms', 'form filler', 'autofill', 'fill', 'w-9', 'w9', '1099'],
      'Navigation',
      'Documents',
      'Bills, notices, forms, citations, fines, and payment proof',
      '/pro/documents',
    );
    pushNavShortcut(
      ['support', 'help desk', 'help'],
      'Navigation',
      'Help & Support',
      'In-app help desk',
      '/pro/app/support',
    );

    return results.slice(0, 8); // Limit to 8 results
  }, [deferredSearchQuery, searchData]);

  const dueSoonCount = React.useMemo(
    () => computeDueSoonCount({ bills, subscriptions, citations }),
    [bills, citations, subscriptions],
  );

  const dueSoonPreview = React.useMemo(
    () => buildDueSoonPreview({ bills, subscriptions }),
    [bills, subscriptions],
  );

  const handleSearchSelect = useCallback((path: string) => {
    startTransition(() => {
      navigate(path);
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
      setSearchQuery('');
    });
  }, [navigate]);

  const navGroups = useMemo(
    () => buildNavGroups({ dueSoonCount, pendingIngestionsCount: 0 }),
    [dueSoonCount],
  );

  const lockedToBilling = !checkingFullSuite && !hasFullSuite;
  const visibleNavGroups = useMemo(
    () =>
      lockedToBilling
        ? navGroups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.path === '/pro/settings'),
          }))
          .filter((group) => group.items.length > 0)
        : navGroups,
    [lockedToBilling, navGroups],
  );

  /* Defer location so active-nav recalculation does not block the click→paint frame (INP).
     Tradeoff: active highlight can lag one frame after navigation — intentional. */
  const deferredPathname = useDeferredValue(location.pathname);
  const deferredSearch = useDeferredValue(location.search);
  const deferredHash = useDeferredValue(location.hash);

  const processedSidebarNav = useMemo(
    () =>
      processSidebarNav({
        groups: visibleNavGroups,
        pathname: deferredPathname,
        search: deferredSearch,
        hash: deferredHash,
      }),
    [visibleNavGroups, deferredPathname, deferredSearch, deferredHash],
  );

  return (
    <div className="flex min-h-[100dvh] bg-surface-base font-sans text-content-primary">
      <TrialBanner />
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-overlay lg:hidden"
          aria-hidden="true"
          onClick={closeSidebarMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Primary navigation"
        onMouseEnter={() => setSidebarInteracting(true)}
        onMouseLeave={() => setSidebarInteracting(false)}
        onFocusCapture={() => setSidebarInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setSidebarInteracting(false);
          }
        }}
        className={cn(
          "app-chrome fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden backdrop-blur-xl transition-[width,transform,box-shadow] duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-[72px]" : "w-[280px]",
          "border-r border-surface-border",
          !sidebarCollapsed && "shadow-[20px_0_80px_rgba(0,0,0,0.28)]"
        )}
      >
        <SidebarHeader
          sidebarCollapsed={sidebarCollapsed}
          sidebarOpen={sidebarOpen}
          closeSidebarMobile={closeSidebarMobile}
        />

        {/* Sidebar free-plan upgrade banner removed — Layout only renders for Pro users */}

        <nav className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-hide', sidebarCollapsed ? 'space-y-3 px-2 py-4' : 'space-y-5 px-3 py-5')} aria-label="App sections">
          {processedSidebarNav.map((group, groupIndex) => {
            return (
              <div key={group.label} className="space-y-1.5">
                {!sidebarCollapsed && group.label && (
                  <p className="chrome-nav-section-label px-4 py-1">
                    {group.label}
                  </p>
                )}
                {sidebarCollapsed && groupIndex > 0 && (
                  <div className="mx-2 mb-2 h-px bg-surface-border opacity-60" role="separator" aria-hidden="true" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.isActive;
                    const navCount = (item as { count?: number }).count;
                    const isDueSoonItem = item.name === 'Due soon' && (navCount ?? 0) > 0;
                    return (
                      <div
                        key={item.name}
                        className="relative mx-1"
                        onMouseEnter={() => {
                          if (isDueSoonItem) setShowDueSoonPreview(true);
                          // Fix 4: Hover-prefetch — load the route chunk before the click
                          const lazyItem = item as typeof item & { lazyImport?: () => Promise<unknown> };
                          if (lazyItem.lazyImport && !prefetchedPaths.current.has(item.path)) {
                            prefetchedPaths.current.add(item.path);
                            lazyItem.lazyImport().catch(() => {/* silent — prefetch is best-effort */ });
                          }
                        }}
                        onMouseLeave={() => { if (isDueSoonItem) setShowDueSoonPreview(false); }}
                      >
                        <TransitionLink
                          to={item.linkTo}
                          className={cn(
                            'focus-app group relative flex min-h-10 items-center gap-3 rounded-md border border-transparent py-2.5 transition-colors duration-200',
                            sidebarCollapsed ? 'justify-center px-2' : 'px-4',
                            isActive
                              ? 'border border-surface-border/50 bg-content-primary/[0.07] text-content-primary'
                              : 'text-content-secondary hover:bg-content-primary/[0.04] hover:text-content-primary',
                          )}
                          title={sidebarCollapsed ? item.name : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={(e) => {
                            if (!isDueSoonItem) return;
                            const isMobile = window.matchMedia('(max-width: 1023px)').matches;
                            if (isMobile) {
                              e.preventDefault();
                              setShowDueSoonPreview((v) => !v);
                              return;
                            }
                            setShowDueSoonPreview(false);
                          }}
                        >
                          {isActive && !sidebarCollapsed && (
                            <span
                              className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-sm bg-content-primary"
                              aria-hidden
                            />
                          )}
                          {isActive && sidebarCollapsed && (
                            <span
                              className="pointer-events-none absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-brand-cta"
                              aria-hidden
                            />
                          )}
                          <TactileIcon
                            icon={Icon}
                            size={16}
                            active={isActive}
                            variant="static"
                            className={cn(
                              'relative z-[1] shrink-0',
                              !isActive && !sidebarCollapsed && 'group-hover:translate-x-0.5'
                            )}
                          />
                          {!sidebarCollapsed && (
                            <>
                              <span className="chrome-nav-row pointer-events-none flex-1">
                                {item.name}
                              </span>
                              {navCount !== undefined && navCount > 0 && (
                                <span className="relative flex items-center gap-1.5 shrink-0 px-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-amber-text)]" aria-hidden />
                                  <span className="text-[10px] font-mono text-content-secondary tabular-nums">
                                    {navCount}
                                  </span>
                                </span>
                              )}
                            </>
                          )}
                        </TransitionLink>
                        {isDueSoonItem && showDueSoonPreview && !sidebarCollapsed && (
                          <div className="app-popover absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-surface-border p-3 backdrop-blur-xl lg:left-full lg:top-1/2 lg:ml-2 lg:mt-0 lg:-translate-y-1/2">
                            <p className="chrome-micro-label mb-2 text-content-tertiary">Due Soon Preview</p>
                            <div className="space-y-1.5">
                              {dueSoonPreview.length === 0 ? (
                                <p className="text-xs text-content-tertiary">No upcoming bills in next 7 days.</p>
                              ) : (
                                dueSoonPreview.map((entry) => (
                                  <p key={entry.label} className="text-xs text-content-secondary">{entry.label}</p>
                                ))
                              )}
                            </div>
                            <TransitionLink
                              to="/pro/bills#due-soon"
                              className="mt-3 inline-flex text-xs text-content-primary hover:text-content-secondary"
                              onClick={() => setShowDueSoonPreview(false)}
                            >
                              View All →
                            </TransitionLink>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Account strip: always visible above the fold — Settings + collapse (sign out is profile menu only) */}
        <div className="mt-auto shrink-0 border-t border-surface-border bg-surface-raised/50 backdrop-blur-sm">
          {!sidebarCollapsed && (
            <p className="chrome-micro-label px-4 pt-3 text-content-tertiary">Account</p>
          )}
          <div className={cn('flex flex-col gap-2 p-3 sm:p-4', sidebarCollapsed ? 'pt-3' : '')}>
            <TransitionLink
              to="/pro/settings"
              onClick={closeSidebarMobile}
              title={sidebarCollapsed ? 'Account settings' : undefined}
              aria-current={isSettingsRoute ? 'page' : undefined}
              className={cn(
                'focus-app group flex min-h-10 w-full items-center rounded-lg border py-2.5 text-[12px] font-sans font-medium transition-all',
                sidebarCollapsed ? 'justify-center px-2' : 'justify-start gap-3 px-3',
                isSettingsRoute
                  ? 'border-content-primary/30 bg-content-primary/[0.1] text-content-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                  : 'border-surface-border bg-surface-base/60 text-content-secondary hover:bg-content-primary/[0.06] hover:text-content-primary',
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Settings className="h-4 w-4 shrink-0 text-content-tertiary transition-colors group-hover:text-content-primary" aria-hidden />
              </div>
              {!sidebarCollapsed && <span>Account settings</span>}
            </TransitionLink>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div
        className={cn(
          /* scroll-padding: sticky app header (h-[4.5rem]) — keyboard focus stays clear of chrome (WCAG 2.4.11) */
          "flex h-[100dvh] flex-1 flex-col overflow-y-auto scroll-pt-[4.5rem] scrollbar-hide transition-all duration-300 ease-in-out",
          "lg:pl-[72px]"
        )}
      >
        {/* Top Bar */}
        <header className="app-chrome sticky top-0 z-30 flex h-[4.5rem] shrink-0 items-center justify-between border-b border-surface-border px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="lg:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg text-content-tertiary transition-colors hover:text-content-secondary focus-app"
              onClick={() => setSidebarOpen(true)}
            >
              <MorphingMenuIcon isOpen={sidebarOpen} className="scale-110" />
            </button>

            {/* Global Search (Desktop) */}
            <div className="hidden md:flex flex-col max-w-md w-full" ref={searchRef}>
              <label htmlFor="layout-global-search" className="sr-only">
                Search Pay List items, documents, subscriptions, and settings
              </label>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-content-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
                <input
                  id="layout-global-search"
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchModKey === '⌘' ? 'Search (⌘K)' : 'Search (Ctrl+K)'}
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="focus-app-field min-h-10 w-full rounded-md border border-surface-border bg-surface-base py-2.5 pl-9 pr-4 font-sans text-sm text-content-primary transition-all placeholder:text-content-tertiary focus:border-content-primary/25 focus:bg-surface-elevated/90"
                />

                {/* Search Dropdown */}
                {isSearchOpen && searchQuery.trim() !== '' && (
                  <div className="app-floating-panel absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-hidden overflow-y-auto rounded-lg border border-surface-border backdrop-blur-md">
                    {searchResults.length > 0 ? (
                      <ul className="py-1">
                        {searchResults.map((result, index) => (
                          <li key={index}>
                            <button
                              type="button"
                              onClick={() => handleSearchSelect(result.path)}
                              className="focus-app flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-content-primary/[0.04]"
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
                        {`No results found for "${searchQuery}"`}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1.5 pl-1 text-xs font-sans text-content-muted leading-none hidden lg:block">
                <kbd className="rounded border border-surface-border bg-surface-elevated px-1 py-0.5 font-mono text-[10px]">
                  {searchModKey === '⌘' ? '⌘K' : 'Ctrl+K'}
                </kbd>
                <span className="mx-1.5">search</span>
                <span className="text-content-tertiary">·</span>
                <kbd className="ml-1.5 rounded border border-surface-border bg-surface-elevated px-1 py-0.5 font-mono text-[10px]">Q</kbd>
                <span className="ml-1">quick add</span>
                <span className="text-content-tertiary"> · </span>
                <button
                  type="button"
                  className="text-content-secondary underline-offset-2 hover:text-content-primary hover:underline focus-app rounded"
                  onClick={() => setIsShortcutsOpen(true)}
                >
                  All shortcuts
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Icon (Mobile) */}
            <button
              type="button"
              aria-label="Open search"
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden text-content-tertiary hover:text-content-secondary transition-colors p-1 focus-app rounded-lg min-w-11 min-h-11 flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Add Button — visible text is the accessible name (no aria-label mismatch) */}
            <button
              type="button"
              title="Quick add (keyboard Q)"
              onClick={() => openQuickAdd('obligation')}
              className="hidden items-center gap-2 rounded-md bg-content-primary px-5 py-2.5 text-sm font-semibold text-surface-base shadow-none transition-colors hover:bg-content-secondary focus-app sm:inline-flex"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              Add what&apos;s due
            </button>
            <button
              type="button"
              aria-label="Add what is due"
              title="Quick add (keyboard Q)"
              onClick={() => openQuickAdd('obligation')}
              className="flex h-11 w-11 items-center justify-center rounded-md bg-content-primary text-surface-base transition-colors hover:bg-content-secondary focus-app sm:hidden"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
            </button>

            <ThemeToggle />

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label={
                  unreadNotifCount > 0
                    ? `Notifications, ${unreadNotifCount} unread`
                    : 'Notifications, no unread'
                }
                aria-expanded={isNotifOpen}
                aria-haspopup="true"
                onClick={() => { setIsNotifOpen(v => !v); if (!isNotifOpen) markNotificationsRead(); }}
                className="relative p-1 overflow-visible group min-w-11 min-h-11 flex items-center justify-center focus-app rounded-lg"
              >
                <TactileIcon icon={Bell} size={16} className="text-content-tertiary group-hover:text-content-primary" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                )}
              </button>
              {isNotifOpen && (
                <div className="app-popover absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-surface-border backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-content-primary/5 px-4 py-3">
                    <span className="chrome-micro-label text-content-secondary">Notifications</span>
                    <button
                      type="button"
                      onClick={() => clearNotifications()}
                      className="focus-app rounded-md px-2 py-1 text-xs font-medium text-content-muted transition-colors hover:bg-surface-elevated hover:text-content-tertiary"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-content-muted">No notifications</div>
                    ) : (
                      notifications.map((n: Notification) => (
                        <div key={n.id} className={cn('px-4 py-3 border-b border-surface-border last:border-0', !n.read && 'bg-content-primary/[0.03]')}>
                          <div className="flex items-start gap-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', n.type === 'success' ? 'bg-[var(--color-status-emerald-text)]' : n.type === 'warning' ? 'bg-[var(--color-status-amber-text)]' : n.type === 'error' ? 'bg-[var(--color-status-rose-text)]' : 'bg-content-muted')} />
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
                className="h-11 w-11 rounded-full bg-surface-raised/80 border border-surface-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors focus-app"
              >
                <span className="sr-only">Open account menu</span>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    width={44}
                    height={44}
                    decoding="async"
                    className="h-full w-full object-cover"
                    data-no-invert
                    aria-hidden
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-content-primary/10" aria-hidden>
                    <span className="text-xs font-sans font-semibold text-content-primary">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
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
                <HeadlessMenu.Items className="app-popover absolute right-0 z-50 mt-3 w-64 origin-top-right overflow-hidden rounded-lg border border-surface-border backdrop-blur-xl focus-app">
                  <div className="border-b border-content-primary/10 px-3 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-content-muted">Signed in</p>
                    <p className="mt-1 truncate text-sm font-medium text-content-primary" title={accountDisplayName}>
                      {accountDisplayName || 'Account'}
                    </p>
                    {user?.email ? (
                      <p className="mt-0.5 truncate text-xs text-content-tertiary" title={user.email}>
                        {user.email}
                      </p>
                    ) : null}
                    <p className="mt-2 inline-flex rounded-md border border-surface-border bg-surface-elevated/80 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide text-content-secondary">
                      {planBadgeLabel}
                    </p>
                  </div>

                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => setIsShortcutsOpen(true)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                            active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary',
                          )}
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center text-content-tertiary">
                            <Command className="h-4 w-4" />
                          </div>
                          <span>Keyboard shortcuts</span>
                        </button>
                      )}
                    </HeadlessMenu.Item>
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <TransitionLink
                          to="/pro/settings"
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                            active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary',
                          )}
                        >
                          <div className="flex h-4 w-4 items-center justify-center text-content-tertiary">
                            <Settings className="h-4 w-4" />
                          </div>
                          <span>Settings</span>
                        </TransitionLink>
                      )}
                    </HeadlessMenu.Item>
                  </div>

                  <div className="h-[1px] bg-content-primary/5 my-1" />

                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <TransitionLink
                          to="/"
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                            active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary',
                          )}
                          title="Public marketing site"
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </div>
                          <span>Marketing site</span>
                        </TransitionLink>
                      )}
                    </HeadlessMenu.Item>

                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => setIsResetOpen(true)}
                          title="Opens confirmation — permanently deletes your bills, debts, and transactions"
                          className={cn(
                            'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors',
                            active ? 'bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]' : 'text-content-tertiary',
                          )}
                        >
                          <span className="flex w-full items-center gap-3">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-amber-500/80">
                              <Activity className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="font-medium text-content-primary">Erase all data…</span>
                          </span>
                          <span className="pl-7 text-[11px] leading-snug text-content-muted">
                            Removes bills, debts &amp; transactions — cannot be undone
                          </span>
                        </button>
                      )}
                    </HeadlessMenu.Item>

                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <TransitionLink
                          to="/onboarding/setup"
                          className={cn(
                            'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-sm transition-colors',
                            active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary',
                          )}
                        >
                          <span className="flex w-full items-center gap-3">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="m12 14 4-4-4-4" />
                                <path d="M3 3.412C3 3.185 3.184 3 3.412 3H16.48c0.04 0 0.16 0.04 0.16 0.16V10a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1V3.412Z" />
                                <path d="M3 21v-8a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0Z" />
                              </svg>
                            </span>
                            <span className="font-medium text-content-primary">Setup wizard</span>
                          </span>
                          <span className="pl-7 text-[11px] leading-snug text-content-muted">Revisit money onboarding &amp; defaults</span>
                        </TransitionLink>
                      )}
                    </HeadlessMenu.Item>
                  </div>

                  <div className="h-[1px] bg-content-primary/5 my-1" />

                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => {
                            useStore.getState().signOut();
                            toast.success('Logged out');
                            startTransition(() => navigate('/auth'));
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
                            active ? 'bg-content-primary/5 text-red-400' : 'text-content-tertiary',
                          )}
                        >
                          <div className="flex h-4 w-4 items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                              <polyline points="16 17 21 12 16 7" />
                              <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
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
        <main id="main-content" className="relative mx-auto w-full max-w-[1280px] flex-1 p-4 pb-24 sm:p-6 sm:pb-28 lg:p-8">
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
              <TransitionLink to="/privacy" className="hover:text-content-secondary transition-colors">Privacy Policy</TransitionLink>
              <TransitionLink to="/terms" className="hover:text-content-secondary transition-colors">Terms of Service</TransitionLink>
              <TransitionLink to="/security" className="hover:text-content-secondary transition-colors">Security</TransitionLink>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile bottom app navigation */}
      <nav
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-surface-border px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl lg:hidden"
        aria-label="Mobile app navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {(lockedToBilling
            ? [{ name: 'Plan', to: '/pro/settings?tab=billing', icon: Settings }]
            : [
              { name: 'Pay List', to: '/pro/dashboard', icon: LayoutDashboard },
              { name: 'Calendar', to: '/pro/calendar', icon: CalendarDays },
              { name: 'Documents', to: '/pro/documents', icon: Inbox },
            ]
          ).map((item) => {
            const Icon = item.icon;
            const active = `${location.pathname}${location.search}` === item.to || location.pathname === item.to;
            return (
              <TransitionLink
                key={item.name}
                to={item.to}
                className={cn(
                  'focus-app flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors',
                  active ? 'bg-content-primary/[0.08] text-content-primary' : 'text-content-tertiary hover:bg-content-primary/[0.04] hover:text-content-primary',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="max-w-full truncate">{item.name}</span>
              </TransitionLink>
            );
          })}
          {!lockedToBilling && (
            <button
              type="button"
              onClick={() => openQuickAdd('obligation')}
              className="focus-app flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg bg-brand-cta px-1 text-[10px] font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="max-w-full truncate">Add</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="focus-app flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium text-content-tertiary transition-colors hover:bg-content-primary/[0.04] hover:text-content-primary"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            <span className="max-w-full truncate">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Search Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-surface-base md:hidden">
          <div className="p-4 bg-surface-raised border-b border-surface-border flex items-center gap-3">
            <label htmlFor="layout-mobile-search" className="sr-only">
              Search Pay List items, documents, subscriptions, and settings
            </label>
            <Search className="w-5 h-5 text-content-tertiary shrink-0" aria-hidden />
            <input
              id="layout-mobile-search"
              autoFocus
              type="text"
              placeholder="Search what is due..."
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="focus-app flex-1 rounded-lg border border-transparent bg-transparent px-1 text-base text-content-primary outline-none transition-colors placeholder:text-content-muted focus:border-surface-border focus:bg-surface-base/35"
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
              className="p-2 text-content-tertiary hover:text-content-secondary min-w-11 min-h-11 flex items-center justify-center focus-app rounded-lg"
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
                        type="button"
                        onClick={() => handleSearchSelect(result.path)}
                        className="focus-app w-full border-b border-surface-border/50 px-4 py-3 text-left transition-colors hover:bg-surface-elevated flex flex-col"
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
        <div className="fixed inset-0 backdrop-overlay" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-surface-raised border border-surface-border p-6 shadow-elevated">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full border border-[var(--color-status-amber-border)] flex items-center justify-center bg-[var(--color-status-amber-bg)]">
                <AlertTriangle className="w-5 h-5 text-[var(--color-status-amber-text)]" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-content-primary font-sans">Erase all data?</Dialog.Title>
            </div>
            <Dialog.Description className="text-[13px] text-content-tertiary mb-6 leading-relaxed font-sans">
              This permanently deletes bills, debts, transactions, and links you created in Oweable. You will return to setup to start fresh. This cannot be undone.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="focus-app rounded-md border border-surface-border bg-surface-base px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  await resetData();
                  setIsResetting(false);
                  setIsResetOpen(false);
                }}
                className="focus-app flex items-center gap-2 rounded-md bg-[var(--color-status-rose-text)] px-4 py-2 text-sm font-semibold text-surface-base transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResetting && <Activity className="w-3 h-3 animate-spin" />}
                {isResetting ? 'Erasing…' : 'Erase everything'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <KeyboardShortcutsDialog open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
