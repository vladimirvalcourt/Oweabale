import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Home, Receipt, CreditCard, Target, Activity,
  Settings, Repeat, BarChart3, Plus, Menu, X, ChevronDown, Inbox,
  Vault, PieChart, TrendingUp, Calendar as CalendarIcon, Calculator, Briefcase, GraduationCap, LifeBuoy
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition, Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import QuickAddModal from './QuickAddModal';
import { TactileIcon, MorphingMenuIcon } from './ui/TactileIcon';
import type { Notification } from '../store/useStore';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Overview': true,
    'Activity': false,
    'Planning': false,
    'Account': false
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { bills, debts, transactions, subscriptions, goals, incomes, budgets, user, isQuickAddOpen, openQuickAdd, closeQuickAdd, resetData, pendingIngestions, notifications, markNotificationsRead, clearNotifications } = useStore();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

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
        results.push({ type: 'Transaction', name: tx.name, detail: `$${tx.amount} - ${tx.date}`, path: '/' });
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

    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, bills, debts, transactions, subscriptions, goals, incomes, budgets]);

  const handleSearchSelect = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: Home },
        { name: 'Income', path: '/income', icon: Vault },
        { name: 'Freelance Vault', path: '/freelance', icon: Briefcase },
        { name: 'Regular Bills', path: '/bills', icon: Receipt },
        { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
        { name: 'Review Inbox', path: '/ingestion', icon: Inbox, count: pendingIngestions.length },
      ]
    },
    {
      label: 'Activity',
      items: [
        { name: 'Reports', path: '/reports', icon: BarChart3 },
        { name: 'Transactions', path: '/transactions', icon: Activity },
        { name: 'Support', path: '/support', icon: LifeBuoy },
      ]
    },
    {
      label: 'Planning & Growth',
      items: [
        { name: 'Net Worth', path: '/net-worth', icon: TrendingUp },
        { name: 'Budgets', path: '/budgets', icon: PieChart },
        { name: 'Academy', path: '/education', icon: GraduationCap },
        { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
        { name: 'Goals', path: '/goals', icon: Target },
        { name: 'Taxes', path: '/taxes', icon: Calculator },
      ]
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-surface-base font-sans text-content-primary flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-base sidebar-recessed transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-64",
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
            className="lg:hidden text-content-tertiary hover:text-content-secondary p-2 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <MorphingMenuIcon isOpen={sidebarOpen} className="text-content-primary" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto scrollbar-hide space-y-4">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups[group.label];
            return (
              <div key={group.label} className="space-y-1">
                {!sidebarCollapsed && (
                  <button 
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[12px] font-sans font-semibold text-content-secondary hover:text-content-primary transition-colors group/header"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isExpanded ? "rotate-0" : "-rotate-90 text-content-tertiary")} />
                  </button>
                )}
                {/* Collapsed view line separator */}
                {sidebarCollapsed && <div className="h-[1px] bg-surface-border mx-2 my-4 opacity-50" />}

                <AnimatePresence initial={false}>
                  {(isExpanded || sidebarCollapsed) && (
                    <motion.div 
                      key={group.label}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                      className="overflow-hidden space-y-1"
                    >
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
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
                              className={cn(
                                "shrink-0",
                                !isActive && "group-hover:translate-x-0.5"
                              )}
                            />
                            {!sidebarCollapsed && (
                              <>
                                <span className="text-[13px] font-sans font-medium tracking-normal flex-1">
                                  {item.name}
                                </span>
                                {(item as any).count !== undefined && (item as any).count > 0 && (
                                  <span className="text-[10px] font-mono font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full shadow-lg shadow-indigo-500/20">
                                    {(item as any).count}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
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
                <p className="text-[11px] font-sans text-zinc-500 leading-relaxed italic opacity-90 pl-3.5 border-l border-surface-border">
                  Pricing may be introduced later with advance notice to testers.
                </p>
              </div>
            )}
            <button
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
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Bar */}
        <header className="shrink-0 bg-surface-base topbar-groove sticky top-0 z-30 h-[4.5rem] flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-surface-border">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden text-zinc-500 hover:text-zinc-300"
              onClick={() => setSidebarOpen(true)}
            >
              <MorphingMenuIcon isOpen={sidebarOpen} className="scale-110" />
            </button>
            
            {/* Global Search (Desktop) */}
            <div className="hidden md:flex items-center max-w-md w-full relative" ref={searchRef}>
              <Search className="w-4 h-4 text-content-tertiary absolute left-3" />
              <input 
                type="text" 
                placeholder="Search records (bills, debts, tx)..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 pr-4 py-2 bg-surface-highlight rounded-md text-[13px] font-sans text-content-primary placeholder-content-tertiary focus:outline-none focus:bg-surface-border-subtle transition-all search-carved border focus:border-content-secondary"
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
                              <span className="text-xs text-zinc-500 bg-surface-elevated px-1.5 py-0.5 rounded">{result.type}</span>
                            </div>
                            <span className="text-xs text-zinc-400 mt-0.5">{result.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Icon (Mobile) */}
            <button 
              onClick={() => setIsMobileSearchOpen(true)} 
              className="md:hidden text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Add Button */}
            <button
              onClick={() => openQuickAdd()}
              className="hidden sm:flex items-center gap-2 bg-brand-indigo hover:bg-brand-violet text-white text-[12px] font-mono font-bold uppercase tracking-wider transition-all btn-tactile px-5 py-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Quick Add
            </button>
            <button
              onClick={() => openQuickAdd()}
              className="sm:hidden flex items-center justify-center w-8 h-8 bg-brand-indigo hover:bg-brand-violet text-white transition-all btn-tactile"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setIsNotifOpen(v => !v); if (!isNotifOpen) markNotificationsRead(); }}
                className="relative p-1 overflow-visible group"
              >
                <TactileIcon icon={Bell} size={16} className="text-content-tertiary group-hover:text-content-primary" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-indigo rounded-full shadow-glow-indigo" />
                )}
              </button>
              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0C0D0E]/98 backdrop-blur-xl border border-white/10 rounded-sm shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-300">Notifications</span>
                    <button onClick={() => clearNotifications()} className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">Clear all</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-zinc-600 text-[11px] font-mono uppercase tracking-widest">No notifications</div>
                    ) : (
                      notifications.map((n: Notification) => (
                        <div key={n.id} className={cn('px-4 py-3 border-b border-white/5 last:border-0', !n.read && 'bg-indigo-500/5')}>
                          <div className="flex items-start gap-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'error' ? 'bg-red-500' : 'bg-indigo-500')} />
                            <div>
                              <p className="text-[12px] font-mono text-zinc-200 font-medium">{n.title}</p>
                              <p className="text-[11px] font-mono text-zinc-500 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[10px] font-mono text-zinc-700 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
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
              <HeadlessMenu.Button className="h-8 w-8 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors focus:outline-none">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" data-no-invert />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-brand-indigo/10">
                    <span className="text-[10px] font-mono font-bold text-brand-violet">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
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
                <HeadlessMenu.Items className="absolute right-0 mt-3 w-56 origin-top-right bg-[#0C0D0E]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] outline-none overflow-hidden z-50">
                  <div className="py-1">
                    <HeadlessMenu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-[13px] transition-colors',
                            active ? 'bg-white/5 text-white' : 'text-zinc-400'
                          )}
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-zinc-500">
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
                            active ? 'bg-white/5 text-white' : 'text-zinc-400'
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
                            active ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400'
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
                            active ? 'bg-white/5 text-white' : 'text-zinc-400'
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
                            active ? 'bg-white/5 text-red-400' : 'text-zinc-400'
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 4, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.995 }}
              transition={{ 
                duration: 0.25, 
                ease: [0.19, 1.0, 0.22, 1.0] 
              }}
              className="w-full h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="bg-surface-base border-t border-surface-border py-6 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Oweable Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
              <Link to="/security" className="hover:text-zinc-300 transition-colors">Security</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Search Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden flex flex-col">
          <div className="p-4 bg-surface-raised border-b border-surface-border flex items-center gap-3">
            <Search className="w-5 h-5 text-zinc-500 shrink-0" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search bills, transactions, debts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none text-base text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-0"
            />
            <button 
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 text-zinc-500 hover:text-zinc-300"
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
                        onClick={() => {
                          handleSearchSelect(result.path);
                          setIsMobileSearchOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition-colors flex flex-col border-b border-surface-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-content-primary">{result.name}</span>
                          <span className="text-xs text-zinc-500 bg-surface-elevated px-1.5 py-0.5 rounded">{result.type}</span>
                        </div>
                        <span className="text-sm text-zinc-400 mt-1">{result.detail}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-zinc-500">
                  No results found for "{searchQuery}"
                </div>
              )
            ) : (
              <div className="px-4 py-8 text-center text-zinc-600 text-sm">
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
            <Dialog.Description className="text-[13px] text-zinc-400 mb-6 leading-relaxed font-sans">
              This will permanently delete every bill, transaction, and financial link you've created. You will be sent back to the setup protocol to start fresh.
            </Dialog.Description>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 bg-transparent border border-surface-border rounded-sm text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await resetData();
                  setIsResetOpen(false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-sm text-[11px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10"
              >
                Confirm Wipe
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
