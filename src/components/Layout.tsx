import { Link, Outlet, useLocation } from 'react-router-dom';
import { Bell, Search, Home, Receipt, CreditCard, Activity, Target, Tags, Upload as UploadIcon, Settings, Repeat } from 'lucide-react';
import { toast } from 'sonner';

export default function Layout() {
  const location = useLocation();
  const navItems = [
    { name: 'Overview', path: '/', icon: Home },
    { name: 'Bills', path: '/bills', icon: Receipt },
    { name: 'Debts', path: '/debts', icon: CreditCard },
    { name: 'Transactions', path: '/transactions', icon: Activity },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
    { name: 'Upload', path: '/upload', icon: UploadIcon },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-[#28a745] rounded-md flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg leading-none">O</span>
                </div>
                <span className="font-semibold text-xl tracking-tight text-gray-900">Oweable</span>
              </div>
              <nav className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'border-[#28a745] text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => toast.success('Search opened')} className="text-gray-400 hover:text-gray-500 transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button onClick={() => toast.success('Notifications opened')} className="text-gray-400 hover:text-gray-500 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div onClick={() => toast.success('Profile menu opened')} className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors">
                <span className="text-xs font-medium text-gray-600">AM</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation (Bottom) */}
      <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-40 pb-safe overflow-x-auto">
        <div className="flex items-center h-16 min-w-max px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center px-4 h-full space-y-1 ${
                  isActive ? 'text-[#28a745]' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        <Outlet />
      </div>
    </div>
  );
}
