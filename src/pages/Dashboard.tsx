import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, ShieldCheck, Calendar, Flame, Inbox, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { motion } from 'motion/react';
import { X, Copy, ExternalLink } from 'lucide-react';
import { animate } from 'motion/react';
import { useStore } from '../store/useStore';
import { calcMonthlyCashFlow, calcSurplusRouting } from '../lib/finance';

// Helper for animated numbers
function AnimatedValue({ value, prefix = "", suffix = "" , decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1], // Standard Ease-out
      onUpdate(val) {
        setDisplayValue(val);
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <span>
      {prefix}{displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

import { projectNetWorth } from '../lib/finance';

import type { Citation } from '../store/useStore';

export default function Dashboard() {
  const { bills, debts, transactions, assets, subscriptions, incomes, goals, user, pendingIngestions, freelanceEntries, citations, resolveCitation } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);



  const projectedData = useMemo(() => {
    return projectNetWorth(assets, debts, incomes, bills, subscriptions, 6, 0).map(r => ({
      name: r.label,
      balance: r.netWorth
    }));
  }, [assets, debts, incomes, bills, subscriptions]);

  // --- Financial Calcs ---
  const totalAssets = useMemo(() => assets.reduce((acc, asset) => acc + asset.value, 0), [assets]);
  const totalDebts = useMemo(() => debts.reduce((acc, debt) => acc + debt.remaining, 0), [debts]);
  const netWorth = totalAssets - totalDebts;

  const liquidCash = useMemo(() => assets.filter(a => a.type === 'Cash').reduce((s, a) => s + a.value, 0), [assets]);
  
  const monthlyBurn = useMemo(() => {
    const billsTotal = bills.reduce((s, b) => {
      let monthly = b.amount;
      if (b.frequency === 'Quarterly') monthly = b.amount / 3;
      if (b.frequency === 'Yearly') monthly = b.amount / 12;
      return s + monthly;
    }, 0);
    const debtMins = debts.reduce((s, d) => s + d.minPayment, 0);
    const subTotal = subscriptions.filter(s => s.status === 'active').reduce((s, sub) => {
      let monthly = sub.amount;
      if (sub.frequency === 'Yearly') monthly = sub.amount / 12;
      if (sub.frequency === 'Weekly') monthly = sub.amount * 4.33;
      return s + monthly;
    }, 0);
    return billsTotal + debtMins + subTotal;
  }, [bills, debts, subscriptions]);

  const cashFlow = useMemo(
    () => calcMonthlyCashFlow(incomes, bills, debts, subscriptions),
    [incomes, bills, debts, subscriptions]
  );

  const surplusRouting = useMemo(
    () => calcSurplusRouting(cashFlow.surplus, goals, debts),
    [cashFlow.surplus, goals, debts]
  );

  const survivalMonths = Math.max(0, liquidCash / (monthlyBurn || 1));
  
  const upcomingBills = useMemo(() => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()), [bills]);
  
  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);
  const monthlySubscriptionCost = useMemo(() => activeSubscriptions.reduce((acc, sub) => {
    return acc + (sub.frequency === 'Monthly' ? sub.amount : sub.amount / 12);
  }, 0), [activeSubscriptions]);

  // --- Intelligent Modules ---

  // 1. Debt
  const avalancheTarget = useMemo(() => {
    const activeDebts = [...debts].filter(d => d.remaining > 0);
    return activeDebts.sort((a, b) => b.apr - a.apr)[0] || null;
  }, [debts]);

  const debtProgress = useMemo(() => {
    if (!avalancheTarget) return 0;
    return (avalancheTarget.paid / (avalancheTarget.remaining + avalancheTarget.paid)) * 100;
  }, [avalancheTarget]);

  // 2. Cash Gap
  const { isOverdraftRisk, liquidBuffer, imminentTotal, nextPaydayStr } = useMemo(() => {
    const today = new Date();
    const activeIncomes = incomes.filter(i => i.status === 'active' && new Date(i.nextDate) >= today);
    const nextPayday = activeIncomes.sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())[0];
    
    let sniperWindowMs = 14 * 24 * 60 * 60 * 1000;
    if (nextPayday) {
      sniperWindowMs = new Date(nextPayday.nextDate).getTime() - today.getTime();
    }

    const imminent = upcomingBills.filter(b => {
      const msUntilDue = new Date(b.dueDate).getTime() - today.getTime();
      return msUntilDue >= 0 && msUntilDue <= sniperWindowMs;
    });

    const sumImminent = imminent.reduce((s, b) => s + b.amount, 0);
    const buffer = liquidCash - sumImminent;
    
    return {
      isOverdraftRisk: buffer < 0,
      liquidBuffer: buffer,
      imminentTotal: sumImminent,
      nextPaydayStr: nextPayday ? new Date(nextPayday.nextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '14 Days'
    };
  }, [upcomingBills, liquidCash, incomes]);

  // 3. Tax Check
  const taxInsolvencyRisk = useMemo(() => {
    const estimatedQuarterlyLiability = cashFlow.taxReserve * 3;
    return liquidCash < estimatedQuarterlyLiability && cashFlow.taxReserve > 0;
  }, [liquidCash, cashFlow.taxReserve]);

  // 4. Spending
  const burnVelocity = useMemo(() => {
    const today = new Date();
    const seventyTwoHoursAgo = new Date(today.getTime() - (72 * 60 * 60 * 1000));
    
    const recentExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      new Date(t.date) >= seventyTwoHoursAgo
    );
    
    const totalSpent = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
    const frequency = recentExpenses.length;
    
    const isHighVelocity = totalSpent > 500 || frequency > 8;
    const isModerateVelocity = totalSpent > 200 || frequency > 4;
    
    return {
      totalSpent,
      frequency,
      isHighVelocity,
      isModerateVelocity,
      status: isHighVelocity ? 'CRITICAL' : isModerateVelocity ? 'ELEVATED' : 'STABLE'
    };
  }, [transactions]);

  // 5. Total Tax Shield
  const lifetimeTaxShield = useMemo(() => {
    return freelanceEntries.reduce((sum, e) => sum + (e.scouredWriteOffs || 0), 0);
  }, [freelanceEntries]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
        <div className="bg-zinc-900 rounded border border-zinc-800 p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 rounded border border-zinc-800 p-6 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  // Active actionable alerts
  const hasActionableAlerts = pendingIngestions.length > 0 || isOverdraftRisk || taxInsolvencyRisk;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {user.avatar ? (
              <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-indigo-500/10 text-brand-violet font-mono text-xl font-bold">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white">
              Welcome back, <span className="text-brand-indigo">{user.firstName}</span>
            </h1>
            <p className="text-sm font-sans text-zinc-400 mt-1">Here is your financial overview for today.</p>
          </div>
        </div>
      </div>

      {/* 2. Action Center (Grouped Urgent Alerts) */}
      {hasActionableAlerts && (
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 pl-1">Action Center</h2>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Ingestion Action */}
            {pendingIngestions.length > 0 && (
              <Link to="/ingestion" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-sm flex items-center justify-between hover:bg-indigo-500/15 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                      <Inbox className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-indigo-300">Requires Review</p>
                      <p className="text-xs font-sans text-indigo-200/70 mt-0.5">{pendingIngestions.length} document{pendingIngestions.length === 1 ? '' : 's'} waiting for approval.</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </Link>
            )}

            {/* Overdraft Risk Action */}
            {isOverdraftRisk && (
              <Link to="/obligations" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-sm">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-sm flex items-center justify-between hover:bg-rose-500/15 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-rose-400">Cash Flow Warning</p>
                      <p className="text-xs font-sans text-rose-300/80 mt-0.5">
                        Upcoming bills exceed current cash by <span className="font-semibold">${Math.abs(liquidBuffer).toFixed(2)}</span> before next payday.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </Link>
            )}

            {/* Tax Insolvency Action */}
            {taxInsolvencyRisk && (
              <Link to="/taxes" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-sm flex items-center justify-between hover:bg-amber-500/15 transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-amber-400">Low Tax Reserve</p>
                      <p className="text-xs font-sans text-amber-300/80 mt-0.5">
                        Cash is below the estimated quarterly liability of ${Math.round(cashFlow.taxReserve * 3).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 3. Primary Metrics Panel */}
      <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 pl-1 mt-8 mb-3">Core Financials</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Runway Metric Card */}
        <div className="bg-surface-raised border border-surface-border p-6 rounded-sm shadow-sm md:flex md:flex-col md:justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2">How long your money lasts</p>
              <h2 className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tighter tabular-nums leading-none">
                <AnimatedValue value={survivalMonths} decimals={1} />
                <span className="text-xl font-sans text-zinc-500 font-medium ml-2 uppercase tracking-wide">Months</span>
              </h2>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-surface-border pt-5">
            <div>
              <p className="text-[11px] font-mono font-medium text-zinc-300 uppercase tracking-wider mb-1">Liquid Cash</p>
              <p className="text-xl font-mono text-emerald-400 font-bold">${liquidCash.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] font-mono font-medium text-zinc-300 uppercase tracking-wider mb-1">Monthly Expenses</p>
              <p className="text-xl font-mono text-white font-bold">${Math.round(monthlyBurn).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Distributed 4-grid for standard numbers */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-raised p-5 border border-surface-border rounded-sm shadow-sm">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Net Worth</p>
              <p className="text-3xl font-mono text-white font-semibold tabular-nums">$<AnimatedValue value={netWorth} /></p>
            </div>
            <div className="bg-surface-raised p-5 border border-surface-border rounded-sm shadow-sm">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Total Assets</p>
              <p className="text-3xl font-mono text-white font-semibold tabular-nums">$<AnimatedValue value={totalAssets} /></p>
            </div>
            <div className="bg-surface-raised p-5 border border-surface-border rounded-sm shadow-sm">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                Tax Savings <ShieldCheck className="w-3 h-3 text-indigo-400" />
              </p>
              <p className="text-3xl font-mono text-indigo-400 font-semibold tabular-nums">-$<AnimatedValue value={cashFlow.taxReserve} /></p>
            </div>
            <div className="bg-surface-raised p-5 border border-surface-border rounded-sm shadow-sm">
              <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">Monthly Surplus</p>
              <p className="text-3xl font-mono text-emerald-400 font-semibold tabular-nums">+$<AnimatedValue value={cashFlow.surplus} /></p>
            </div>
        </div>
      </div>

      {/* 4. Active Intelligence Grid */}
      <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 pl-1 mt-12 mb-3">Smart Alerts</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tax Shield */}
        <div className="bg-surface-raised rounded-sm p-6 border border-surface-border flex flex-col justify-between shadow-sm hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex justify-between items-start mb-5">
              <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-full flex items-center justify-center shrink-0 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded uppercase tracking-widest font-semibold border border-indigo-500/20">Active</span>
            </div>
            <h3 className="text-sm font-sans font-semibold text-white mb-1">Tax Deduction Finder</h3>
            <p className="text-xs font-sans text-zinc-400 mb-5 leading-relaxed">
              Automatic extraction of valid deductions from freelancer platforms and records.
            </p>
          </div>
          <div className="bg-surface-base border border-surface-border p-4 rounded-sm">
              <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Lifetime Recovered</p>
              <p className="text-3xl font-mono text-white font-bold tabular-nums">${lifetimeTaxShield.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Spending Pulse */}
        <div className={`bg-surface-raised rounded-sm p-6 border flex flex-col justify-between shadow-sm transition-colors ${burnVelocity.isHighVelocity ? 'border-amber-500/30' : 'border-surface-border hover:border-zinc-700'}`}>
          <div>
            <div className="flex justify-between items-start mb-5">
              <div className={`w-10 h-10 border rounded-full flex items-center justify-center shrink-0 ${burnVelocity.isHighVelocity ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-surface-border bg-surface-base text-zinc-400'}`}>
                <Activity className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded uppercase tracking-widest font-semibold border ${burnVelocity.isHighVelocity ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-surface-base text-zinc-400 border-surface-border'}`}>
                {burnVelocity.isHighVelocity ? 'HIGH' : burnVelocity.isModerateVelocity ? 'ELEVATED' : 'ON TRACK'}
              </span>
            </div>
            <h3 className="text-sm font-sans font-semibold text-white mb-1">Recent Spending (Last 3 Days)</h3>
            <p className="text-xs font-sans text-zinc-400 mb-5 leading-relaxed">
              Tracks recent spending to help you stay on budget.
            </p>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-3xl font-mono text-white tabular-nums">${burnVelocity.totalSpent.toFixed(0)}</p>
              <p className="text-xs font-sans text-zinc-500 font-medium">/ {burnVelocity.frequency} transactions</p>
            </div>
            {burnVelocity.isHighVelocity && (
              <p className="text-[11px] font-mono text-amber-500 bg-amber-500/5 p-2 rounded border border-amber-500/20">
                Elevated spending detected. Please review recent transactions.
              </p>
            )}
          </div>
        </div>

        {/* Debt Target */}
        <div className="bg-surface-raised rounded-sm p-6 border border-surface-border flex flex-col justify-between shadow-sm hover:border-zinc-700 transition-colors">
          <div>
            <div className="flex justify-between items-start mb-5">
              <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-full flex items-center justify-center shrink-0 text-zinc-400">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-sans font-semibold text-white mb-1">Debt Payoff Plan</h3>
            <p className="text-xs font-sans text-zinc-400 mb-5 leading-relaxed">
              Pays off the highest interest debt first to save you the most money.
            </p>
          </div>
          
          {avalancheTarget ? (
            <div>
              <div className="mb-2">
                <p className="text-xs font-sans text-zinc-300 font-medium mb-1 truncate">Prioritizing: {avalancheTarget.name}</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-mono text-white tabular-nums">${avalancheTarget.remaining.toLocaleString()}</span>
                  <span className="text-xs font-mono text-zinc-400">{debtProgress.toFixed(1)}% Paid</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${debtProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-base border border-surface-border p-4 rounded-sm">
              <p className="text-sm font-sans text-emerald-400 font-medium">Debt-Free Status Achieved.</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Lower Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Timeline Chart */}
        <div className="lg:col-span-2">
          <div className="bg-surface-raised rounded-sm border border-surface-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-sans font-semibold text-white">Cash Flow Trajectory</h3>
                <p className="text-xs font-sans text-zinc-400 mt-1">Projected balances across all accounts</p>
              </div>
              <select className="text-xs font-sans bg-surface-base border border-surface-border text-zinc-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                <option>Next 30 Days</option>
                <option>Next 90 Days</option>
              </select>
            </div>
            
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'sans-serif' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'sans-serif' }} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181B', borderRadius: '6px', border: '1px solid #3F3F46', color: '#FAFAFA', fontFamily: 'sans-serif', fontSize: '13px' }}
                    itemStyle={{ color: '#818CF8' }}
                    formatter={(val) => [`$${Number(val ?? 0).toLocaleString()}`, 'Projected Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#818CF8" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar Lists */}
        <div className="space-y-6">
          
          {/* Upcoming Obligations */}
          <div className="bg-surface-raised rounded-sm border border-surface-border shadow-sm flex flex-col h-fit max-h-[350px]">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-300">Upcoming Bills</h3>
              <Link to="/obligations" className="text-xs font-sans text-indigo-400 hover:text-indigo-300 transition-colors font-medium">See all</Link>
            </div>
            
            <div className="overflow-y-auto outline-none">
              {upcomingBills.length === 0 ? (
                <div className="m-4 p-8 text-center flex flex-col items-center bg-surface-base border border-dashed border-surface-border rounded-sm">
                  <Calendar className="w-8 h-8 text-zinc-600/50 mb-3" />
                  <p className="text-[12px] font-mono font-bold text-zinc-400 uppercase tracking-widest">No Bills Found</p>
                  <p className="text-[11px] font-sans text-zinc-500 mt-1 uppercase tracking-tight">System is clear</p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {upcomingBills.slice(0, 4).map((bill) => (
                    <li key={bill.id} className="px-6 py-4 hover:bg-surface-base transition-colors flex justify-between items-center group cursor-default">
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-zinc-500 w-10 text-center uppercase">
                          {bill.dueDate.split('-')[2]}<br/>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][parseInt(bill.dueDate.split('-')[1], 10) - 1]}
                        </div>
                        <p className="text-sm font-sans font-medium text-zinc-200">{bill.biller}</p>
                      </div>
                      <p className="text-sm font-mono text-zinc-300 font-medium tabular-nums">${bill.amount.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

              {/* Citations / Tickets */}
          <div className="bg-surface-raised rounded-sm border border-surface-border shadow-sm flex flex-col h-fit">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-300">Citations & Tickets</h3>
            </div>
            <div className="p-0 outline-none">
               {citations.filter(c => c.status === 'open').length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-500/50 mb-3" />
                    <p className="text-sm font-sans font-medium text-zinc-300">Clean Record</p>
                    <p className="text-xs text-zinc-500 mt-1">No outstanding tickets found.</p>
                  </div>
               ) : (
                 <ul className="divide-y divide-surface-border">
                  {citations.filter(c => c.status === 'open').map((citation) => (
                    <li key={citation.id} className="px-6 py-4 hover:bg-surface-base transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded bg-surface-base border flex flex-col justify-center items-center shrink-0 ${citation.daysLeft <= 7 ? 'text-rose-400 border-rose-500/30' : 'text-zinc-400 border-surface-border'}`}>
                            <span className="text-xs font-bold font-mono leading-none">{citation.daysLeft}</span>
                            <span className="text-[11px] font-sans font-medium text-zinc-400">Days</span>
                          </div>
                          <div>
                            <p className="text-sm font-sans font-medium text-zinc-200">{citation.type}</p>
                            <p className="text-xs font-sans text-zinc-500">{citation.jurisdiction}</p>
                          </div>
                        </div>
                        <p className="text-sm font-mono font-bold text-zinc-300 tabular-nums">${citation.amount.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedCitation(citation); setIsCitationModalOpen(true); }}
                        className={`w-full text-xs font-sans font-medium py-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-raised ${citation.daysLeft <= 7 ? 'bg-rose-500 hover:bg-rose-600 text-white focus-visible:ring-rose-500' : 'bg-surface-border hover:bg-zinc-700 text-zinc-200 focus-visible:ring-zinc-400'}`}
                      >
                        Resolve Ticket
                      </button>
                    </li>
                  ))}
                 </ul>
               )}
            </div>
          </div>

        </div>
      </div>

       {/* Citation Resolution Modal */}
       <Dialog open={isCitationModalOpen} onClose={() => setIsCitationModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded shadow-xl bg-surface-elevated border border-surface-border overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-raised">
              <Dialog.Title className="text-sm font-sans font-semibold text-zinc-200">
                Ticket Details
              </Dialog.Title>
              <button 
                onClick={() => setIsCitationModalOpen(false)} 
                className="text-zinc-500 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedCitation && (
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-sans font-medium text-white mb-1">{selectedCitation.type}</h4>
                  <p className="text-sm text-zinc-400">{selectedCitation.jurisdiction}</p>
                  {selectedCitation.daysLeft <= 7 && (
                     <p className="text-xs font-medium text-rose-400 mt-2 bg-rose-500/10 px-2 py-1 rounded inline-block">
                       Due in {selectedCitation.daysLeft} days. ${selectedCitation.penaltyFee} penalty fee approaching.
                     </p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-sans font-medium text-zinc-500 mb-1.5">Citation Number</label>
                    <div className="flex">
                      <input 
                        type="text" 
                        readOnly 
                        value={selectedCitation.citationNumber} 
                        className="bg-surface-base border border-surface-border rounded-l px-3 py-2 text-sm font-mono text-zinc-300 w-full focus:outline-none" 
                      />
                      <button 
                        onClick={() => toast.success('Copied to clipboard')} 
                        className="bg-surface-border hover:bg-zinc-700 text-zinc-300 px-3 border border-l-0 border-surface-border rounded-r transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 z-10"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-medium text-zinc-500 mb-1.5">Online Payment Portal</label>
                    <a 
                      href={selectedCitation.paymentUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated focus-visible:ring-indigo-500"
                    >
                      Open Payment Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
