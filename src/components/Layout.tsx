import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Home, Receipt, CreditCard, Target, Activity,
  Settings, Repeat, BarChart3, Plus, Menu, X, ChevronDown,
  Upload as UploadIcon, Wallet, PieChart, TrendingUp, Calendar as CalendarIcon, Calculator
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import QuickAddModal from './QuickAddModal';

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

  const { bills, debts, transactions, subscriptions, goals, user, isQuickAddOpen, openQuickAdd, closeQuickAdd } = useStore();

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
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [user?.theme]);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results = [];

    bills.forEach(bill => {
      if (bill.biller.toLowerCase().includes(query) || bill.category.toLowerCase().includes(query)) {
        results.push({ type: 'Bill', name: bill.biller, detail: `$${bill.amount} - ${bill.status}`, path: '/bills' });
      }
    });

    debts.forEach(debt => {
      if (debt.name.toLowerCase().includes(query) || debt.type.toLowerCase().includes(query)) {
        results.push({ type: 'Debt', name: debt.name, detail: `$${debt.remaining} remaining`, path: '/debts' });
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

    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, bills, debts, transactions, subscriptions, goals]);

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
        { name: 'Income', path: '/income', icon: Wallet },
        { name: 'Regular Bills', path: '/obligations', icon: Receipt },
      ]
    },
    {
      label: 'Activity',
      items: [
        { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
        { name: 'Reports', path: '/reports', icon: BarChart3 },
        { name: 'Transactions', path: '/transactions', icon: Activity },
      ]
    },
    {
      label: 'Planning',
      items: [
        { name: 'Net Worth', path: '/net-worth', icon: TrendingUp },
        { name: 'Budgets', path: '/budgets', icon: PieChart },
        { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
        { name: 'Goals', path: '/goals', icon: Target },
        { name: 'Taxes', path: '/taxes', icon: Calculator },
      ]
    },
    {
      label: 'Account',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-surface-base font-sans text-content-primary flex noise-bg">
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
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between h-20 pt-4 px-4 border-b border-surface-border">
          <div className="flex items-center gap-2 overflow-hidden">
            {!sidebarCollapsed && (
              <span className="font-extrabold text-xl tracking-[0.2em] text-content-primary uppercase whitespace-nowrap">
                Oweable
              </span>
            )}
          </div>
          <button 
            className="lg:hidden text-zinc-500 hover:text-zinc-300"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
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
                    className="w-full flex items-center justify-between px-4 py-2 text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-[0.3em] hover:text-zinc-400 transition-colors group/header"
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isExpanded ? "rotate-0" : "-rotate-90 text-zinc-700")} />
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
                                ? "text-white nav-pressed" 
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-raised/50"
                            )}
                            title={sidebarCollapsed ? item.name : undefined}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500" />
                            )}
                            <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-indigo-400" : "group-hover:text-zinc-300")} />
                            {!sidebarCollapsed && (
                              <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em]">
                                {item.name}
                              </span>
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
          <div className="mb-4 px-2">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Everything synced</span>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center gap-3 w-full px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 bg-surface-raised border border-surface-border rounded-sm hover:text-zinc-200 transition-colors"
            >
              <Menu className="w-4 h-4 shrink-0 text-zinc-500" />
              {!sidebarCollapsed && <span>Collapse Menu</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div 
        className={cn(
          "flex-1 flex flex-col h-screen overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Bar */}
        <header className="bg-surface-base topbar-groove sticky top-0 z-30 h-[4.5rem] flex items-end pb-3 justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden text-zinc-500 hover:text-zinc-300"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Global Search (Desktop) */}
            <div className="hidden md:flex items-center max-w-md w-full relative" ref={searchRef}>
              <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
              <input 
                type="text" 
                placeholder="SEARCH RECORDS [BILLS / DEBTS / TX]..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 pr-4 py-2 bg-surface-raised rounded-sm text-[11px] font-mono uppercase tracking-widest text-zinc-200 placeholder-zinc-700 focus:outline-none focus:shadow-[inset_0_2px_15px_rgba(255,255,255,0.05)] transition-all search-carved border focus:border-zinc-500"
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
              className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm px-6 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-surface-base shadow-lg shadow-indigo-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Quick Add
            </button>
            <button
              onClick={() => openQuickAdd()}
              className="sm:hidden flex items-center justify-center w-8 h-8 bg-indigo-600 hover:bg-indigo-600 text-white rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-surface-base"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <button 
              onClick={() => toast.success('Notifications opened')} 
              className="relative text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button className="h-8 w-8 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden cursor-pointer hover:bg-surface-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-surface-base">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" data-no-invert />
                ) : (
                  <span className="text-xs font-medium text-zinc-300">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                )}
              </HeadlessMenu.Button>
              <Transition
                as={React.Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <HeadlessMenu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-surface-raised border border-surface-border rounded-sm shadow-xl outline-none py-1 z-50">
                  <div className="px-4 py-3 border-b border-surface-border bg-surface-base">
                    <p className="text-[10px] font-mono font-bold text-zinc-200 uppercase tracking-widest text-content-primary">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Logged In</p>
                  </div>
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <Link
                        to="/settings"
                        className={cn(
                          active ? 'bg-surface-elevated text-zinc-200' : 'text-zinc-400',
                          'block px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors'
                        )}
                      >
                        Account Settings
                      </Link>
                    )}
                  </HeadlessMenu.Item>
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => toast.success('Logged out')}
                        className={cn(
                          active ? 'bg-surface-elevated text-red-400' : 'text-red-500',
                          'block w-full text-left px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors'
                        )}
                      >
                        Sign out
                      </button>
                    )}
                  </HeadlessMenu.Item>
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
              <a href="#" className="hover:text-zinc-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-zinc-300 transition-colors">Security</a>
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
    </div>
  );
}
