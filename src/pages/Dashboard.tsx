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
        <div className="h-8 bg-[#1C1C1C] rounded w-1/4"></div>
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#141414] rounded-lg border border-[#262626] p-5 h-24"></div>
          ))}
        </div>
        <div className="bg-[#141414] rounded-lg border border-[#262626] h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Financial Overview</h1>
        </div>
        <div className="flex gap-3">
          <Link to="/bills/add" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
            <Plus className="w-4 h-4" />
            Add Bill
          </Link>
        </div>
      </div>

      {/* Net Worth Hero Section */}
      <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 relative">
        <div className="relative z-10">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Net Worth</p>
          <div className="mt-2 flex items-baseline gap-4">
            <h2 className="text-4xl font-bold tracking-tight text-[#FAFAFA] tabular-nums">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span className="flex items-center text-sm font-medium text-[#22C55E]">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +5.2% this month
            </span>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#262626] pt-6">
            <div>
              <p className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-zinc-600" /> Total Assets
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#FAFAFA] tabular-nums">${totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-zinc-600" /> Total Debts
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#FAFAFA] tabular-nums">${totalDebts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Insights & Next Best Action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 md:col-span-2 flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full border border-[#262626] flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA]">Next Best Action</h3>
              <p className="text-sm text-zinc-400 mt-1">
                You have an upcoming bill for <strong className="text-zinc-200">{nextBill?.biller || 'Utilities'}</strong> due soon. Paying this now will keep you on track.
              </p>
              <button 
                onClick={() => toast.success('Payment initiated')}
                className="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
              >
                Pay ${nextBill?.amount.toFixed(2) || '0.00'} Now
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full border border-[#262626] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-zinc-400" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">Spending Alert</h3>
          </div>
          <p className="text-sm text-zinc-400">Your dining expenses are up 15% compared to last month.</p>
          <button onClick={() => toast.info('Opening budget details')} className="mt-4 text-sm font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1 w-fit">
            Review Budget <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Timeline Chart */}
        <div className="bg-[#141414] rounded-lg border border-[#262626] lg:col-span-2 flex flex-col">
          <div className="px-6 py-5 border-b border-[#262626] flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA]">Cash Flow Projection</h3>
              <p className="text-sm text-zinc-500 mt-1">Estimated balance over the next 30 days</p>
            </div>
            <select className="text-sm bg-[#0A0A0A] border border-[#262626] text-zinc-200 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-1.5">
              <option>Next 30 Days</option>
              <option>Next 90 Days</option>
            </select>
          </div>
          <div className="p-6 flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 12 }} tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#141414', borderRadius: '8px', border: '1px solid #262626', color: '#FAFAFA' }}
                  itemStyle={{ color: '#FAFAFA' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected Balance']}
                />
                <Area type="monotone" dataKey="balance" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Bills & Subscriptions */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#141414] rounded-lg border border-[#262626] flex flex-col">
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA]">Upcoming Bills</h3>
              <Link to="/bills" className="text-sm font-medium text-indigo-500 hover:text-indigo-400">View all</Link>
            </div>
            <div className="p-0">
              {upcomingBills.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">No upcoming bills.</div>
              ) : (
                <ul className="divide-y divide-[#1F1F1F]">
                  {upcomingBills.slice(0, 3).map((bill) => (
                    <li key={bill.id} className="px-6 py-3 hover:bg-[#1C1C1C] transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded border border-[#262626] flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#FAFAFA]">{bill.biller}</p>
                          <p className="text-xs text-zinc-500">Due {bill.dueDate}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#FAFAFA] tabular-nums">${bill.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-[#141414] rounded-lg border border-[#262626] flex flex-col">
            <div className="px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-base font-semibold tracking-tight text-[#FAFAFA]">Active Subscriptions</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-500 tabular-nums">${monthlySubscriptionCost.toFixed(2)}/mo</span>
                <Link to="/subscriptions" className="text-sm font-medium text-indigo-500 hover:text-indigo-400">View all</Link>
              </div>
            </div>
            <div className="p-0">
              {activeSubscriptions.length === 0 ? (
                <div className="p-6 text-center text-sm text-zinc-500">No active subscriptions.</div>
              ) : (
                <ul className="divide-y divide-[#1F1F1F]">
                  {activeSubscriptions.slice(0, 3).map((sub) => (
                    <li key={sub.id} className="px-6 py-3 hover:bg-[#1C1C1C] transition-colors flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[#FAFAFA]">{sub.name}</p>
                        <p className="text-xs text-zinc-500">Renews {sub.nextBillingDate}</p>
                      </div>
                      <p className="text-sm font-bold text-[#FAFAFA] tabular-nums">${sub.amount.toFixed(2)}</p>
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
