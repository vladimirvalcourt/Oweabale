/**
 * FreeLayout
 *
 * Sidebar + topbar for /free/* routes (Tracker plan users).
 *
 * Design principles:
 *  - Shows ONLY features available on the Free plan — no locked icons,
 *    no grayed-out items, no "upgrade to unlock X" noise in navigation.
 *  - "Upgrade to Full Suite" is a persistent, gold-accented CTA at the
 *    bottom of the sidebar. It goes to /pricing.
 *  - Reuses the same design tokens and glassmorphism chrome as Layout.tsx.
 *  - Shares: QuickAddModal, SessionWarning, search, notifications,
 *    profile dropdown.
 */
import React, {
  useState, useRef, useEffect, useCallback, useMemo,
  startTransition, useDeferredValue,
} from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TransitionLink } from '../common/TransitionLink';
import {
  Bell, Search, LayoutDashboard, Receipt,
  Settings, Repeat, Plus, X, ChevronDown,
  Calendar as CalendarIcon, AlertCircle, Clock, Landmark,
  Star, Command,
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import QuickAddModal from '../common/QuickAddModal';
import { TactileIcon, MorphingMenuIcon } from '../ui/TactileIcon';
import type { Notification } from '../../store';
import { BrandWordmark } from '../common/BrandWordmark';
import { KeyboardShortcutsDialog } from '../common/KeyboardShortcutsDialog';
import { isApplePointerPlatform } from '../../lib/utils';

// ── Free-only nav items ────────────────────────────────────────────────────
const FREE_NAV = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard',       path: '/free/dashboard',              icon: LayoutDashboard,         lazyImport: () => import('../../pages/FreeDashboard') },
      { name: 'Bills & Debts',   path: '/free/bills',                  icon: Receipt,     lazyImport: () => import('../../pages/Obligations') },
      { name: 'Tickets & Fines', path: '/free/bills?tab=ambush',       icon: AlertCircle },
      { name: 'Due Soon',        path: '/free/bills',                  icon: Clock,        hash: 'due-soon' },
      { name: 'Subscriptions',   path: '/free/subscriptions',          icon: Repeat,       lazyImport: () => import('../../pages/Subscriptions') },
      { name: 'Calendar',        path: '/free/calendar',               icon: CalendarIcon, lazyImport: () => import('../../pages/Calendar') },
    ],
  },
] as const;

export default function FreeLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();

  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSearchOpen,     setIsSearchOpen]     = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isNotifOpen,      setIsNotifOpen]      = useState(false);
  const [isShortcutsOpen,  setIsShortcutsOpen]  = useState(false);
  const [expandedOverview, setExpandedOverview] = useState(true);

  const searchRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef       = useRef<HTMLDivElement>(null);
  const prefetchedPaths = useRef<Set<string>>(new Set());

  const {
    bills, subscriptions, isQuickAddOpen, openQuickAdd, closeQuickAdd,
    notifications, markNotificationsRead, clearNotifications, user,
    citations,
  } = useStore(
    useShallow((s) => ({
      bills:                 s.bills,
      subscriptions:         s.subscriptions,
      isQuickAddOpen:        s.isQuickAddOpen,
      openQuickAdd:          s.openQuickAdd,
      closeQuickAdd:         s.closeQuickAdd,
      notifications:         s.notifications,
      markNotificationsRead: s.markNotificationsRead,
      clearNotifications:    s.clearNotifications,
      user:                  s.user,
      citations:             s.citations,
    }))
  );

  const closeSidebarMobile = useCallback(() => startTransition(() => setSidebarOpen(false)), []);

  useEffect(() => {
    startTransition(() => setSidebarOpen(false));
  }, [location.pathname, location.search, location.hash]);

  // Click-outside for search
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Click-outside + Escape for notifications
  useEffect(() => {
    if (!isNotifOpen) return;
    const onMouse = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setIsNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsNotifOpen(false); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown',   onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown',   onKey);
    };
  }, [isNotifOpen]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [isSearchOpen]);

  // ⌘K and Q shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const inField = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); return; }
      if (e.key === 'q' && !inField) openQuickAdd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openQuickAdd]);

  const searchModKey = useMemo(() => (isApplePointerPlatform() ? '⌘' : 'Ctrl'), []);

  // Due-soon count
  const dueSoonCount = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const msDay = 86400000;
    const daysUntil = (iso: string) => {
      const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
      d.setHours(0, 0, 0, 0);
      return Math.round((d.getTime() - today.getTime()) / msDay);
    };
    let n = 0;
    for (const b of bills) {
      const d = daysUntil(b?.dueDate ?? '');
      if (!isNaN(d) && d >= 0 && d <= 7) n++;
    }
    for (const s of subscriptions) {
      if (s?.status !== 'active' || !s?.nextBillingDate) continue;
      const d = daysUntil(s.nextBillingDate);
      if (!isNaN(d) && d >= 0 && d <= 7) n++;
    }
    for (const c of citations) { if (c.status === 'open' && c.daysLeft <= 7) n++; }
    return n;
  }, [bills, subscriptions, citations]);

  // Simple search (bills + subs only for free tier)
  const deferredSearch = useDeferredValue(searchQuery.trim());
  const searchResults = useMemo(() => {
    if (!deferredSearch) return [];
    const q = deferredSearch.toLowerCase();
    const results: { type: string; name: string; detail: string; path: string }[] = [];
    bills.forEach(b => {
      if (b.biller.toLowerCase().includes(q)) results.push({ type: 'Bill', name: b.biller, detail: `$${b.amount}`, path: '/free/bills' });
    });
    subscriptions.forEach(s => {
      if (s.name.toLowerCase().includes(q)) results.push({ type: 'Subscription', name: s.name, detail: `$${s.amount}`, path: '/free/subscriptions' });
    });
    return results.slice(0, 8);
  }, [deferredSearch, bills, subscriptions]);

  const handleSearchSelect = useCallback((path: string) => {
    startTransition(() => { navigate(path); setIsSearchOpen(false); setIsMobileSearchOpen(false); setSearchQuery(''); });
  }, [navigate]);

  const deferredPathname = useDeferredValue(location.pathname);
  const deferredQS       = useDeferredValue(location.search);
  const deferredHash     = useDeferredValue(location.hash);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const isSettingsRoute = location.pathname.startsWith('/free/settings');

  const accountDisplayName = useMemo(() => {
    if (!user) return '';
    const first = user.firstName.trim(), last = user.lastName.trim();
    if (first && last) return `${first} ${last}`;
    return first || user.email?.split('@')[0] || 'Account';
  }, [user]);

  // Build nav with active state
  const processedNav = useMemo(() => {
    const tabParam = new URLSearchParams(deferredQS).get('tab');
    const hashSlug = deferredHash.replace(/^#/, '');
    return FREE_NAV.map(group => ({
      label: group.label,
      items: group.items.map(item => {
        const base = item.path.split('?')[0].split('#')[0];
        const qPart = item.path.includes('?') ? item.path.split('?')[1] : '';
        const itemTab = qPart ? new URLSearchParams(qPart).get('tab') : null;
        const tabMatch = itemTab !== null
          ? tabParam === itemTab
          : base === '/free/bills'
            ? tabParam === null || !['ambush', 'recurring', 'debt'].includes(tabParam ?? '')
            : tabParam === null;
        const hashMatch = (item as {hash?:string}).hash
          ? deferredHash === `#${(item as {hash?:string}).hash}`
          : true;
        const isActive = deferredPathname === base && tabMatch && hashMatch;
        const linkTo = (item as {hash?:string}).hash ? `${base}#${(item as {hash?:string}).hash}` : item.path;
        const count = item.name === 'Due Soon' ? dueSoonCount : undefined;
        return { ...item, isActive, linkTo, count };
      }),
    }));
  }, [deferredPathname, deferredQS, deferredHash, dueSoonCount]);

  return (
    <div className="min-h-[100dvh] bg-surface-base font-sans text-content-primary flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" aria-hidden onClick={closeSidebarMobile} />
      )}

      {/* ── Sidebar ── */}
      <aside
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-black/55 backdrop-blur-xl transition-all duration-300 ease-in-out supports-[backdrop-filter]:bg-black/40 border-r border-surface-border',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'w-20' : 'w-[240px]',
        )}
      >
        {/* Brand header */}
        <div className="shrink-0 flex h-[4.5rem] items-center justify-between gap-2 border-b border-surface-border/90 px-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {!sidebarCollapsed ? (
              <TransitionLink to="/free/dashboard" className="min-w-0 shrink focus-app rounded-lg">
                <BrandWordmark textClassName="brand-header-text" />
              </TransitionLink>
            ) : (
              <div className="flex w-full justify-center">
                <TransitionLink to="/free/dashboard" aria-label="Oweable home" className="flex shrink-0 rounded-lg p-1 focus-app">
                  <img src="/brand/oweable-logo-glyph.png" alt="" className="h-7 w-7 rounded-sm object-contain" width={28} height={28} />
                </TransitionLink>
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close navigation menu"
            className="shrink-0 p-2 text-content-tertiary transition-colors hover:text-content-secondary focus-app rounded-lg lg:hidden"
            onClick={closeSidebarMobile}
          >
            <MorphingMenuIcon isOpen={sidebarOpen} className="text-content-primary" />
          </button>
        </div>

        {/* Nav items */}
        <nav
          className={cn('min-h-0 flex-1 overflow-y-auto scrollbar-hide', sidebarCollapsed ? 'space-y-3 px-1.5 py-4' : 'space-y-4 px-3 py-6')}
          aria-label="App sections"
        >
          {processedNav.map(group => (
            <div key={group.label} className="space-y-1">
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setExpandedOverview(v => !v)}
                  aria-expanded={expandedOverview}
                  className="chrome-nav-group-trigger group/header flex w-full items-center justify-between px-4 py-2 transition-colors focus-app"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={cn('w-3 h-3 transition-transform duration-300', expandedOverview ? 'rotate-0' : '-rotate-90 text-content-tertiary')} />
                </button>
              )}
              <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', expandedOverview || sidebarCollapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const { isActive, linkTo, count } = item;
                      return (
                        <div
                          key={item.name}
                          className="relative mx-1"
                          onMouseEnter={() => {
                            const li = item as typeof item & { lazyImport?: () => Promise<unknown> };
                            if (li.lazyImport && !prefetchedPaths.current.has(item.path)) {
                              prefetchedPaths.current.add(item.path);
                              li.lazyImport().catch((error) => {
                                console.warn('[FreeLayout] Lazy module import failed:', error);
                              });
                            }
                          }}
                        >
                          <TransitionLink
                            to={linkTo}
                            className={cn(
                              'focus-app group relative flex min-h-10 items-center gap-3 rounded-lg border border-transparent px-4 py-2.5 transition-colors duration-200',
                              sidebarCollapsed && 'justify-center border-transparent px-1.5',
                              isActive
                                ? 'border border-surface-border/50 bg-content-primary/[0.07] text-content-primary'
                                : 'text-content-secondary hover:bg-content-primary/[0.04] hover:text-content-primary',
                            )}
                            title={sidebarCollapsed ? item.name : undefined}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {isActive && !sidebarCollapsed && (
                              <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-sm bg-content-primary" aria-hidden />
                            )}
                            {isActive && sidebarCollapsed && (
                              <span className="pointer-events-none absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-brand-cta" aria-hidden />
                            )}
                            <TactileIcon icon={Icon} size={16} active={isActive} variant="static"
                              className={cn('relative z-[1] shrink-0', !isActive && !sidebarCollapsed && 'group-hover:translate-x-0.5')}
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="chrome-nav-row pointer-events-none flex-1">{item.name}</span>
                                {count !== undefined && count > 0 && (
                                  <span className="relative flex items-center gap-1.5 shrink-0 px-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                                    <span className="text-[10px] font-mono text-content-secondary tabular-nums">{count}</span>
                                  </span>
                                )}
                              </>
                            )}
                          </TransitionLink>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* Account strip */}
        <div className="mt-auto shrink-0 border-t border-surface-border bg-surface-raised/50 backdrop-blur-sm">
          {!sidebarCollapsed && <p className="chrome-micro-label px-4 pt-3 text-content-tertiary">Account</p>}
          <div className={cn('flex flex-col gap-2 p-3 sm:p-4', sidebarCollapsed ? 'pt-3' : '')}>
            {/* Upgrade CTA — gold accent, always visible */}
            <TransitionLink
              to="/pricing"
              className={cn(
                'focus-app group flex min-h-10 w-full items-center rounded-lg border py-2.5 text-[12px] font-sans font-medium transition-all',
                'border-amber-500/40 bg-amber-500/[0.08] text-amber-300 hover:bg-amber-500/[0.14] hover:border-amber-500/60 hover:text-amber-200',
                sidebarCollapsed ? 'justify-center px-1.5' : 'justify-start gap-3 px-3',
              )}
              title={sidebarCollapsed ? 'Upgrade to Full Suite' : undefined}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Star className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              </div>
              {!sidebarCollapsed && <span>Upgrade to Full Suite</span>}
            </TransitionLink>

            {/* Settings */}
            <TransitionLink
              to="/free/settings"
              onClick={closeSidebarMobile}
              title={sidebarCollapsed ? 'Settings' : undefined}
              aria-current={isSettingsRoute ? 'page' : undefined}
              className={cn(
                'focus-app group flex min-h-10 w-full items-center rounded-lg border py-2.5 text-[12px] font-sans font-medium transition-all',
                sidebarCollapsed ? 'justify-center px-1.5' : 'justify-start gap-3 px-3',
                isSettingsRoute
                  ? 'border-content-primary/30 bg-content-primary/[0.1] text-content-primary'
                  : 'border-surface-border bg-surface-base/60 text-content-secondary hover:bg-content-primary/[0.06] hover:text-content-primary',
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <Settings className="h-4 w-4 shrink-0 text-content-tertiary transition-colors group-hover:text-content-primary" aria-hidden />
              </div>
              {!sidebarCollapsed && <span>Settings</span>}
            </TransitionLink>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => startTransition(() => setSidebarCollapsed(c => !c))}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'focus-app group flex w-full items-center rounded-lg border border-surface-border bg-surface-base/40 py-2.5 text-[12px] font-sans font-medium text-content-secondary transition-all hover:bg-content-primary/[0.06] hover:text-content-primary',
                sidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                <MorphingMenuIcon isOpen={!sidebarCollapsed} className="scale-75 text-content-tertiary transition-colors group-hover:text-content-primary" />
              </div>
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={cn(
        'flex h-[100dvh] flex-1 flex-col overflow-y-auto scroll-pt-[4.5rem] scrollbar-hide transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[240px]',
      )}>
        {/* Topbar */}
        <header className="shrink-0 bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40 sticky top-0 z-30 h-[4.5rem] flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-surface-border">
          <div className="flex items-center gap-4 flex-1">
            <button
              type="button"
              aria-label="Open navigation menu"
              className="lg:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg text-content-tertiary transition-colors hover:text-content-secondary focus-app"
              onClick={() => setSidebarOpen(true)}
            >
              <MorphingMenuIcon isOpen={sidebarOpen} className="scale-110" />
            </button>

            {/* Desktop search */}
            <div className="hidden md:flex flex-col max-w-md w-full" ref={searchRef}>
              <label htmlFor="free-layout-search" className="sr-only">Search bills and subscriptions</label>
              <div className="relative w-full">
                <Search className="w-4 h-4 text-content-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
                <input
                  id="free-layout-search"
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchModKey === '⌘' ? 'Search (⌘K)' : 'Search (Ctrl+K)'}
                  autoComplete="off"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="focus-app-field w-full min-h-10 rounded-lg border border-surface-border bg-surface-raised/80 py-2.5 pl-9 pr-4 font-sans text-sm text-content-primary transition-all placeholder:text-content-tertiary focus:border-content-primary/25 focus:bg-surface-elevated/90"
                />
                {isSearchOpen && searchQuery.trim() !== '' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-raised/95 backdrop-blur-md border border-surface-border rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <ul className="py-1">
                        {searchResults.map((r, i) => (
                          <li key={i}>
                            <button type="button" onClick={() => handleSearchSelect(r.path)}
                              className="focus-app flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-content-primary/[0.04]">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-content-primary">{r.name}</span>
                                <span className="text-xs text-content-tertiary bg-surface-elevated px-1.5 py-0.5 rounded">{r.type}</span>
                              </div>
                              <span className="text-xs text-content-tertiary mt-0.5">{r.detail}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-content-tertiary text-center">No results for "{searchQuery}"</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile search */}
            <button type="button" aria-label="Open search" onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden text-content-tertiary hover:text-content-secondary transition-colors p-1 focus-app rounded-lg min-w-11 min-h-11 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </button>

            {/* Quick add */}
            <button type="button" title="Quick add (keyboard Q)" onClick={() => openQuickAdd()}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-brand-cta text-surface-base hover:bg-brand-cta-hover text-sm font-sans font-medium shadow-none transition-colors px-5 py-2.5 focus-app">
              <Plus className="w-4 h-4 shrink-0" aria-hidden />Add entry
            </button>
            <button type="button" aria-label="Add entry" title="Quick add (keyboard Q)" onClick={() => openQuickAdd()}
              className="sm:hidden flex items-center justify-center w-11 h-11 bg-brand-cta text-surface-base hover:bg-brand-cta-hover transition-colors focus-app rounded-lg">
              <Plus className="w-3.5 h-3.5" aria-hidden />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button type="button"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, no unread'}
                aria-expanded={isNotifOpen} aria-haspopup="true"
                onClick={() => { setIsNotifOpen(v => !v); if (!isNotifOpen) markNotificationsRead(); }}
                className="relative p-1 overflow-visible group min-w-11 min-h-11 flex items-center justify-center focus-app rounded-lg">
                <TactileIcon icon={Bell} size={16} className="text-content-tertiary group-hover:text-content-primary" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-surface-border bg-black/90 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-content-primary/5 px-4 py-3">
                    <span className="chrome-micro-label text-content-secondary">Notifications</span>
                    <button type="button" onClick={() => clearNotifications()}
                      className="focus-app rounded font-mono text-[10px] uppercase tracking-widest text-content-muted transition-colors hover:text-content-tertiary">
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-content-muted text-[11px] font-mono uppercase tracking-widest">No notifications</div>
                    ) : notifications.map((n: Notification) => (
                      <div key={n.id} className={cn('px-4 py-3 border-b border-surface-border last:border-0', !n.read && 'bg-content-primary/[0.03]')}>
                        <div className="flex items-start gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'error' ? 'bg-red-500' : 'bg-neutral-500')} />
                          <div>
                            <p className="text-[12px] font-mono text-content-primary font-medium">{n.title}</p>
                            <p className="text-[11px] font-mono text-content-tertiary mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] font-mono text-content-muted mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button className="h-11 w-11 rounded-full bg-surface-raised/80 border border-surface-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors focus-app">
                <span className="sr-only">Open account menu</span>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" width={44} height={44} decoding="async" className="h-full w-full object-cover" aria-hidden />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-content-primary/10" aria-hidden>
                    <span className="text-xs font-sans font-semibold text-content-primary">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                  </div>
                )}
              </HeadlessMenu.Button>
              <Transition as={React.Fragment}
                enter="transition-all duration-200 ease-out" enterFrom="opacity-0 scale-[0.96] -translate-y-1" enterTo="opacity-100 scale-100 translate-y-0"
                leave="transition-all duration-150 ease-in"  leaveFrom="opacity-100 scale-100 translate-y-0" leaveTo="opacity-0 scale-[0.96] -translate-y-1">
                <HeadlessMenu.Items className="absolute right-0 z-50 mt-3 w-64 origin-top-right overflow-hidden rounded-lg border border-surface-border bg-black/92 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl focus-app">
                  <div className="border-b border-content-primary/10 px-3 py-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-content-muted">Signed in</p>
                    <p className="mt-1 truncate text-sm font-medium text-content-primary">{accountDisplayName || 'Account'}</p>
                    {user?.email && <p className="mt-0.5 truncate text-xs text-content-tertiary">{user.email}</p>}
                    <p className="mt-2 inline-flex rounded-md border border-amber-500/30 bg-amber-500/[0.07] px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide text-amber-300">
                      Free Tracker
                    </p>
                  </div>
                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button type="button" onClick={() => setIsShortcutsOpen(true)}
                          className={cn('flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors', active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary')}>
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center text-content-tertiary"><Command className="h-4 w-4" /></div>
                          <span>Keyboard shortcuts</span>
                        </button>
                      )}
                    </HeadlessMenu.Item>
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <TransitionLink to="/free/settings"
                          className={cn('flex items-center gap-3 px-3 py-2 text-sm transition-colors', active ? 'bg-content-primary/5 text-content-primary' : 'text-content-tertiary')}>
                          <div className="flex h-4 w-4 items-center justify-center text-content-tertiary"><Settings className="h-4 w-4" /></div>
                          <span>Settings</span>
                        </TransitionLink>
                      )}
                    </HeadlessMenu.Item>
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <TransitionLink to="/pricing"
                          className={cn('flex items-center gap-3 px-3 py-2 text-sm transition-colors', active ? 'bg-amber-500/10 text-amber-200' : 'text-amber-400/80')}>
                          <div className="flex h-4 w-4 items-center justify-center"><Star className="h-4 w-4" /></div>
                          <span>Upgrade to Full Suite</span>
                        </TransitionLink>
                      )}
                    </HeadlessMenu.Item>
                  </div>
                  <div className="h-[1px] bg-content-primary/5 my-1" />
                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <button type="button"
                          onClick={() => { useStore.getState().signOut(); toast.success('Logged out'); startTransition(() => navigate('/auth')); }}
                          className={cn('flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors', active ? 'bg-content-primary/5 text-red-400' : 'text-content-tertiary')}>
                          <div className="flex h-4 w-4 items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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

        {/* Page content */}
        <main id="main-content" className="relative mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        <footer className="bg-surface-base border-t border-surface-border py-6 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-content-tertiary">© {new Date().getFullYear()} Oweable Inc. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-content-tertiary">
              <TransitionLink to="/privacy" className="hover:text-content-secondary transition-colors">Privacy Policy</TransitionLink>
              <TransitionLink to="/terms"   className="hover:text-content-secondary transition-colors">Terms of Service</TransitionLink>
              <TransitionLink to="/security" className="hover:text-content-secondary transition-colors">Security</TransitionLink>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile search */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 md:hidden flex flex-col">
          <div className="p-4 bg-surface-raised border-b border-surface-border flex items-center gap-3">
            <label htmlFor="free-mobile-search" className="sr-only">Search bills and subscriptions</label>
            <Search className="w-5 h-5 text-content-tertiary shrink-0" aria-hidden />
            <input id="free-mobile-search" autoFocus type="text" placeholder="Search bills, subscriptions..."
              autoComplete="off" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="focus-app flex-1 rounded-lg border border-transparent bg-transparent px-1 text-base text-content-primary outline-none transition-colors placeholder:text-content-muted" />
            <button type="button" aria-label="Close search"
              onClick={() => { startTransition(() => { setIsMobileSearchOpen(false); setSearchQuery(''); }); }}
              className="p-2 text-content-tertiary hover:text-content-secondary min-w-11 min-h-11 flex items-center justify-center focus-app rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide bg-surface-base">
            {searchQuery.trim() !== '' ? (
              searchResults.length > 0 ? (
                <ul className="py-2">
                  {searchResults.map((r, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => handleSearchSelect(r.path)}
                        className="focus-app w-full border-b border-surface-border/50 px-4 py-3 text-left transition-colors hover:bg-surface-elevated flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-content-primary">{r.name}</span>
                          <span className="text-xs text-content-tertiary bg-surface-elevated px-1.5 py-0.5 rounded">{r.type}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <div className="px-4 py-8 text-center text-content-tertiary">No results for "{searchQuery}"</div>
            ) : <div className="px-4 py-8 text-center text-content-muted text-sm">Type to start searching...</div>}
          </div>
        </div>
      )}

      <QuickAddModal isOpen={isQuickAddOpen} onClose={closeQuickAdd} />
      <KeyboardShortcutsDialog open={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </div>
  );
}
