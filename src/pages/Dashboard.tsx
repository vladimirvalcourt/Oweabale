import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Plus, Activity, AlertCircle, TrendingUp, ShieldCheck, CreditCard, Wallet, Calendar, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';

const chartData = [
  { name: '1 Apr', balance: 18000 },
  { name: '8 Apr', balance: 19500 },
  { name: '15 Apr', balance: 18200 },
  { name: '22 Apr', balance: 21000 },
  { name: '29 Apr', balance: 20500 },
  { name: '6 May', balance: 23000 },
  { name: '13 May', balance: 24562 },
];

export default function Dashboard() {
  const { bills, debts, transactions, assets, subscriptions } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const totalAssets = assets.reduce((acc, asset) => acc + asset.value, 0);
  const totalDebts = debts.reduce((acc, debt) => acc + debt.remaining, 0);
  const netWorth = totalAssets - totalDebts;
  
  const upcomingBills = bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const nextBill = upcomingBills.length > 0 ? upcomingBills[0] : null;

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlySubscriptionCost = activeSubscriptions.reduce((acc, sub) => {
    return acc + (sub.frequency === 'Monthly' ? sub.amount : sub.amount / 12);
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white shadow-sm rounded-lg border border-gray-200 p-5 h-24"></div>
          ))}
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Overview</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-[#28a745]" /> Your data is encrypted and secure.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/bills/add" className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
            <Plus className="w-4 h-4" />
            Add Bill
          </Link>
        </div>
      </div>

      {/* Net Worth Hero Section */}
      <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 p-8 relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp className="w-48 h-48 text-[#28a745]" />
        </div>
        <div className="relative z-10">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Net Worth</p>
          <div className="mt-2 flex items-baseline gap-4">
            <h2 className="text-5xl font-bold text-gray-900">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span className="flex items-center text-sm font-medium text-[#28a745] bg-green-50 px-2.5 py-1 rounded-full">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +5.2% this month
            </span>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-gray-100 pt-6">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gray-400" /> Total Assets
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" /> Total Debts
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">${totalDebts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights & Next Best Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 md:col-span-2 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-100/50 to-transparent pointer-events-none"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-blue-900">Next Best Action</h3>
              <p className="text-sm text-blue-800 mt-1">
                You have an upcoming bill for <strong>{nextBill?.biller || 'Utilities'}</strong> due soon. Paying this now will keep you on track.
              </p>
              <button 
                onClick={() => toast.success('Payment initiated')}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Pay ${nextBill?.amount.toFixed(2) || '0.00'} Now
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-900">Spending Alert</h3>
          </div>
          <p className="text-sm text-gray-600">Your dining expenses are up 15% compared to last month.</p>
          <button onClick={() => toast.info('Opening budget details')} className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 w-fit">
            Review Budget <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Timeline Chart */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium text-gray-900">Cash Flow Projection</h3>
              <p className="text-xs text-gray-500 mt-1">Estimated balance over the next 30 days</p>
            </div>
            <select className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#28a745] focus:border-[#28a745]">
              <option>Next 30 Days</option>
              <option>Next 90 Days</option>
            </select>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28a745" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#28a745" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#28a745" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Bills & Subscriptions */}
        <div className="flex flex-col gap-6">
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-900">Upcoming Bills</h3>
              <Link to="/bills" className="text-sm font-medium text-[#28a745] hover:text-[#218838]">View all</Link>
            </div>
            <div className="p-0">
              {upcomingBills.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No upcoming bills.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {upcomingBills.slice(0, 3).map((bill) => (
                    <li key={bill.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{bill.biller}</p>
                          <p className="text-xs text-gray-500">Due {bill.dueDate}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">${bill.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-xl border border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-medium text-gray-900">Active Subscriptions</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">${monthlySubscriptionCost.toFixed(2)}/mo</span>
                <Link to="/subscriptions" className="text-sm font-medium text-[#28a745] hover:text-[#218838]">View all</Link>
              </div>
            </div>
            <div className="p-0">
              {activeSubscriptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No active subscriptions.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {activeSubscriptions.slice(0, 3).map((sub) => (
                    <li key={sub.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                        <p className="text-xs text-gray-500">Renews {sub.nextBillingDate}</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">${sub.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
