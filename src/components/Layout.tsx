import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Bell, Search, Home, Receipt, CreditCard, Target, 
  Settings, Repeat, BarChart3, Plus, Menu, X, 
  Upload as UploadIcon, Sparkles 
} from 'lucide-react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'AI Advisor', path: '/advisor', icon: Sparkles },
    { name: 'Bills', path: '/bills', icon: Receipt },
    { name: 'Debts', path: '/debts', icon: CreditCard },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Goals', path: '/goals', icon: Target },
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
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">O</span>
            </div>
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
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
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
            <div className="hidden md:flex items-center max-w-xs w-full relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-1.5 bg-[#141414] border border-[#262626] rounded-md text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search Icon (Mobile) */}
            <button 
              onClick={() => toast.success('Search opened')} 
              className="md:hidden text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* + Add Dropdown */}
            <HeadlessMenu as="div" className="relative">
              <HeadlessMenu.Button className="flex items-center justify-center w-8 h-8 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]">
                <Plus className="w-4 h-4" />
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
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => toast.success('Add Bill modal opened')}
                        className={cn(
                          active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400',
                          'flex items-center gap-2 w-full px-4 py-2 text-sm'
                        )}
                      >
                        <Receipt className="w-4 h-4 text-zinc-500" />
                        Add Bill
                      </button>
                    )}
                  </HeadlessMenu.Item>
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => toast.success('Add Debt modal opened')}
                        className={cn(
                          active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400',
                          'flex items-center gap-2 w-full px-4 py-2 text-sm'
                        )}
                      >
                        <CreditCard className="w-4 h-4 text-zinc-500" />
                        Add Debt
                      </button>
                    )}
                  </HeadlessMenu.Item>
                  <div className="h-px bg-[#262626] my-1" />
                  <HeadlessMenu.Item>
                    {({ active }) => (
                      <Link
                        to="/upload"
                        className={cn(
                          active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400',
                          'flex items-center gap-2 w-full px-4 py-2 text-sm'
                        )}
                      >
                        <UploadIcon className="w-4 h-4 text-zinc-500" />
                        Upload Document
                      </Link>
                    )}
                  </HeadlessMenu.Item>
                </HeadlessMenu.Items>
              </Transition>
            </HeadlessMenu>

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
    </div>
  );
}
