import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, Search, Home, Receipt, CreditCard, Target, 
  Settings, Repeat, BarChart3, Plus, Menu, X, 
  Upload as UploadIcon, Wallet, PieChart, TrendingUp, Calendar as CalendarIcon, Calculator
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import QuickAddModal from './QuickAddModal';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { bills, debts, transactions, subscriptions, goals } = useStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Income', path: '/income', icon: Wallet },
    { name: 'Bills', path: '/bills', icon: Receipt },
    { name: 'Debts', path: '/debts', icon: CreditCard },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Transactions', path: '/transactions', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Net Worth', path: '/net-worth', icon: TrendingUp },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Taxes', path: '/taxes', icon: Calculator },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-[#FAFAFA] flex">
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
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#111111] border-r border-[#262626] transition-all duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#262626]">
          <div className="flex items-center gap-2 overflow-hidden">
            {!sidebarCollapsed && (
              <span className="font-semibold text-xl tracking-tight text-[#FAFAFA] whitespace-nowrap">
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors group",
                  isActive 
                    ? "bg-[#1C1C1C] text-zinc-50" 
                    : "text-zinc-500 hover:bg-[#1C1C1C] hover:text-zinc-200"
                )}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-zinc-50" : "text-zinc-500 group-hover:text-zinc-300")} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse button (Desktop only) */}
        <div className="hidden lg:flex p-4 border-t border-[#262626]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-zinc-500 rounded-md hover:bg-[#1C1C1C] hover:text-zinc-200 transition-colors"
          >
            <Menu className="w-4 h-4 shrink-0 text-zinc-500" />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Bar */}
        <header className="bg-[#0A0A0A] border-b border-[#262626] sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
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
                placeholder="Search bills, transactions, debts..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#141414] border border-[#262626] rounded-md text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              
              {/* Search Dropdown */}
              {isSearchOpen && searchQuery.trim() !== '' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#141414] border border-[#262626] rounded-md shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="py-1">
                      {searchResults.map((result, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleSearchSelect(result.path)}
                            className="w-full text-left px-4 py-2 hover:bg-[#1C1C1C] transition-colors flex flex-col"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[#FAFAFA]">{result.name}</span>
                              <span className="text-xs text-zinc-500 bg-[#1C1C1C] px-1.5 py-0.5 rounded">{result.type}</span>
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
              onClick={() => setIsQuickAddOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm px-4 py-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
            >
              <Plus className="w-4 h-4" />
              Quick Add
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="sm:hidden flex items-center justify-center w-8 h-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
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
              <HeadlessMenu.Button className="h-8 w-8 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center overflow-hidden cursor-pointer hover:bg-[#1C1C1C] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]">
                <span className="text-xs font-medium text-zinc-300">AM</span>
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
                <HeadlessMenu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-[#141414] border border-[#262626] rounded-md shadow-xl outline-none py-1 z-50">
                  <div className="px-4 py-2 border-b border-[#262626]">
                    <p className="text-sm font-medium text-zinc-200">Alex Morgan</p>
                    <p className="text-xs text-zinc-500">alex@example.com</p>
                  </div>
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <Link
                        to="/settings"
                        className={cn(
                          active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400',
                          'block px-4 py-2 text-sm'
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
                          active ? 'bg-[#1C1C1C] text-red-400' : 'text-red-500',
                          'block w-full text-left px-4 py-2 text-sm'
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-[#0A0A0A] border-t border-[#262626] py-6 px-4 sm:px-6 lg:px-8 mt-auto">
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
          <div className="p-4 bg-[#141414] border-b border-[#262626] flex items-center gap-3">
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
          
          <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
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
                        className="w-full text-left px-4 py-3 hover:bg-[#1C1C1C] transition-colors flex flex-col border-b border-[#262626]/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-[#FAFAFA]">{result.name}</span>
                          <span className="text-xs text-zinc-500 bg-[#1C1C1C] px-1.5 py-0.5 rounded">{result.type}</span>
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
      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
    </div>
  );
}
