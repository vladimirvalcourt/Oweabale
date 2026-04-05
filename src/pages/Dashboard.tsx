import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowUpRight, ArrowDownRight, Plus, Activity, AlertCircle, TrendingUp, ShieldCheck, CreditCard, Wallet, Calendar, ArrowRight, Flame, Crosshair, Terminal, SlidersHorizontal, ShieldAlert, Siren, X, Copy, ExternalLink, ChevronUp, ChevronRight, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { motion, useSpring, useTransform, animate } from 'motion/react';
import { useStore } from '../store/useStore';
import { CollapsibleModule } from '../components/CollapsibleModule';

function AnimatedValue({ value, prefix = "", suffix = "" , decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1], // HUD-style ease out
      onUpdate(value) {
        setDisplayValue(value);
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

const chartData = [
  { name: '1 Apr', balance: 18000 },
  { name: '8 Apr', balance: 19500 },
  { name: '15 Apr', balance: 18200 },
  { name: '22 Apr', balance: 21000 },
  { name: '29 Apr', balance: 20500 },
  { name: '6 May', balance: 23000 },
  { name: '13 May', balance: 24562 },
];

const mockCitations = [
  { id: 1, type: 'SPEEDING', jurisdiction: 'NY CITY', daysLeft: 3, amount: 150, penalty: 75, date: '12 OCT', citationNumber: 'NY-99281-A', paymentUrl: 'https://nyc.gov/payticket' },
  { id: 2, type: 'TOLL VIOLATION', jurisdiction: 'EZ-PASS NJ', daysLeft: 25, amount: 15, penalty: 10, date: '03 NOV', citationNumber: 'EZ-449102', paymentUrl: 'https://ezpassnj.com/pay' }
];

export default function Dashboard() {
  const { bills, debts, transactions, assets, subscriptions, incomes, user, openQuickAdd } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<typeof mockCitations[0] | null>(null);

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

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

  const survivalMonths = liquidCash / (monthlyBurn || 1);
  const survivalDays = Math.round(survivalMonths * 30.44);
  
  const upcomingBills = useMemo(() => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()), [bills]);
  const nextBill = upcomingBills.length > 0 ? upcomingBills[0] : null;

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);
  const monthlySubscriptionCost = useMemo(() => activeSubscriptions.reduce((acc, sub) => {
    return acc + (sub.frequency === 'Monthly' ? sub.amount : sub.amount / 12);
  }, 0), [activeSubscriptions]);

  // --- Autonomous Intelligence Engine (No AI) --- //
  
  // 1. Debt Detonator (Avalanche Math)
  const avalancheTarget = useMemo(() => {
    const activeDebts = [...debts].filter(d => d.remaining > 0);
    return activeDebts.sort((a, b) => b.apr - a.apr)[0] || null;
  }, [debts]);

  const debtProgress = useMemo(() => {
    if (!avalancheTarget) return 0;
    return (avalancheTarget.paid / (avalancheTarget.remaining + avalancheTarget.paid)) * 100;
  }, [avalancheTarget]);

  // 2. Liquidity Gap Engine (Timeline Vector Intersection)
  const { isOverdraftRisk, liquidBuffer, imminentTotal, nextPaydayStr } = useMemo(() => {
    const today = new Date();
    // Find absolute closest active income date as Next Payday
    const activeIncomes = incomes.filter(i => i.status === 'active' && new Date(i.nextDate) >= today);
    const nextPayday = activeIncomes.sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())[0];
    
    // Default sniper window to 14 days if no payday exists
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

  // 3. Burn Velocity Tracker (72-Hour Pulse Detection)
  const burnVelocity = useMemo(() => {
    const today = new Date();
    const seventyTwoHoursAgo = new Date(today.getTime() - (72 * 60 * 60 * 1000));
    
    const recentExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      new Date(t.date) >= seventyTwoHoursAgo
    );
    
    const totalSpent = recentExpenses.reduce((sum, t) => sum + t.amount, 0);
    const frequency = recentExpenses.length;
    
    // Thresholds for "High Velocity"
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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-elevated rounded-sm w-1/4"></div>
        <div className="bg-surface-raised rounded-sm border border-surface-border p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-raised rounded-sm border border-surface-border p-5 h-24"></div>
          ))}
        </div>
        <div className="bg-surface-raised rounded-sm border border-surface-border h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-content-primary uppercase group">
            Welcome back, <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors">{user.firstName}</span>.
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">Here is your financial overview for the day.</p>
        </div>
      </div>

      {/* Strategic Survival Meter */}
      <CollapsibleModule title="Financial Runway Overview" icon={Activity}>
        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-none animate-pulse ${survivalMonths < 3 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Status: Tracking Active</p>
              </div>
              <div className="flex items-baseline gap-4">
                <h2 className="text-4xl font-mono font-bold text-content-primary tabular-nums">
                  <AnimatedValue value={survivalMonths} decimals={1} />
                  <span className="text-sm font-normal text-zinc-500 ml-1">Months</span>
                </h2>
                <div className="h-8 w-[1px] bg-surface-border" />
                <p className="text-sm font-mono text-zinc-300 uppercase tracking-widest">
                  <AnimatedValue value={survivalDays} /> <span className="text-zinc-600">Days of coverage</span>
                </p>
              </div>
            </div>

            <div className="lg:w-1/3 space-y-3">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                <span className="text-zinc-500">Available Cash</span>
                <span className="text-emerald-400">$<AnimatedValue value={liquidCash} /></span>
              </div>
              <div className="w-full h-1 bg-surface-border rounded-none overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (survivalMonths / 12) * 100)}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 50, delay: 0.2 }}
                  className={`h-full ${survivalMonths < 3 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                <span className="text-zinc-500">Monthly Expenses</span>
                <span className="text-rose-400">$<AnimatedValue value={monthlyBurn} />/mo</span>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleModule>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => openQuickAdd('obligation')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-600 shadow-[0_2px_10px_rgba(79,70,229,0.3)]"
          >
            <Plus className="w-4 h-4" />
            Add Bill
          </motion.button>
        </div>
      </div>

      {/* Net Worth Hero Section */}
      <CollapsibleModule title="Net Worth Overview" icon={ShieldCheck}>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Valuation</p>
            <div className="flex items-center gap-2 bg-surface-base border border-surface-border px-3 py-1 rounded-sm shadow-inner">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono text-zinc-300 uppercase">Buffer Status: <span className="text-emerald-400 font-bold">$2,450.00 SAFE</span></span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-4">
            <h2 className="text-5xl font-mono font-bold tracking-tight text-content-primary tabular-nums">
              $<AnimatedValue value={netWorth} decimals={2} />
            </h2>
            <span className="flex items-center text-sm font-mono text-[#22C55E]">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +5.2%
            </span>
          </div>
          
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-surface-border pt-6">
            <div className="bg-surface-base p-3 rounded-sm border border-surface-border shadow-inner">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Wallet className="w-3 h-3 text-zinc-600" /> Assets
              </p>
              <p className="text-xl font-bold font-mono text-content-primary tabular-nums">
                $<AnimatedValue value={totalAssets} decimals={2} />
              </p>
            </div>
            <div className="bg-surface-base p-3 rounded-sm border border-surface-border shadow-inner">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <CreditCard className="w-3 h-3 text-zinc-600" /> Debts
              </p>
              <p className="text-xl font-bold font-mono text-content-primary tabular-nums">
                $<AnimatedValue value={totalDebts} decimals={2} />
              </p>
            </div>
            <div className="bg-surface-base p-3 rounded-sm border border-surface-border shadow-inner">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <Activity className="w-3 h-3 text-zinc-600" /> 30D Velocity
              </p>
              <p className="text-xl font-bold font-mono text-emerald-500 tabular-nums">+$60/day</p>
            </div>
            <div className="bg-surface-base p-3 rounded-sm border border-surface-border shadow-inner">
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-zinc-600" /> Burn Rate
              </p>
              <p className="text-xl font-bold font-mono text-rose-500 tabular-nums">-$150/day</p>
            </div>
          </div>
        </div>
      </CollapsibleModule>

      {/* Tactical Grid: Core Algorithms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash Safety Card */}
        <div className={`col-span-1 lg:col-span-1 border rounded-sm p-6 bg-surface-raised transition-all duration-500 relative overflow-hidden group shadow-md ${isOverdraftRisk ? 'border-rose-500/50 bg-rose-500/5 shadow-[inset_0_0_20px_rgba(244,63,94,0.1)]' : 'border-surface-border'}`}>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-8 h-8 border flex items-center justify-center shrink-0 ${isOverdraftRisk ? 'border-rose-500/50 bg-rose-500/10 text-rose-400' : 'border-surface-border bg-surface-base text-zinc-500'}`}>
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest border ${isOverdraftRisk ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 font-black' : 'bg-surface-base text-emerald-400 border-emerald-500/20'}`}>
                {isOverdraftRisk ? 'CRITICAL RISK' : 'SECURE'}
              </span>
            </div>
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-content-primary mb-4 font-bold">Cash Safety Check</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-surface-base p-2 border border-surface-border shadow-inner">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Bills Due</span>
                <span className="text-sm font-mono font-bold text-content-primary">${imminentTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center bg-surface-base p-2 border border-surface-border shadow-inner">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Current Cash</span>
                <span className={`text-sm font-mono font-bold ${isOverdraftRisk ? 'text-rose-500' : 'text-emerald-400'}`}>${liquidCash.toFixed(2)}</span>
              </div>
            </div>
            <p className={`text-[10px] font-mono mt-4 leading-relaxed border-l-2 pl-3 py-1 ${isOverdraftRisk ? 'text-rose-400 border-rose-500/50' : 'text-zinc-500 border-surface-border'}`}>
              {isOverdraftRisk 
                ? `INSUFFICIENT FUNDS: You need $${Math.abs(liquidBuffer).toLocaleString()} more to cover payments before ${nextPaydayStr}.`
                : `SAFE: All obligations covered until ${nextPaydayStr}.`}
            </p>
          </div>
          {isOverdraftRisk && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />}
        </div>
        
        {/* Spending Pulse Card */}
        <div className={`col-span-1 border rounded-sm p-6 bg-surface-raised border-surface-border transition-all duration-300 relative overflow-hidden group shadow-md ${burnVelocity.isHighVelocity ? 'border-amber-500/50 bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]' : ''}`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-8 h-8 border flex items-center justify-center shrink-0 ${burnVelocity.isHighVelocity ? 'border-amber-500/50 bg-amber-500/10 text-amber-500' : 'border-surface-border bg-surface-base text-zinc-500'}`}>
                <Zap className={`w-4 h-4 ${burnVelocity.isHighVelocity ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-sm border uppercase tracking-widest ${
                burnVelocity.isHighVelocity ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                burnVelocity.isModerateVelocity ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {burnVelocity.status}
              </span>
            </div>
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-content-primary mb-1 font-bold">Spending Pulse</h3>
            <p className="text-[10px] font-mono text-zinc-600 mb-4 uppercase tracking-widest">Rolling 72H Window</p>
            
            <div className="flex items-baseline gap-2 mb-4">
              <p className="text-3xl font-mono font-bold text-content-primary tabular-nums">${burnVelocity.totalSpent.toFixed(0)}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Log: {burnVelocity.frequency}</p>
            </div>
            
            <p className={`text-[10px] font-mono border-l-2 pl-3 py-1 ${burnVelocity.isHighVelocity ? 'text-amber-500 border-amber-500/50' : 'text-zinc-500 border-surface-border'}`}>
              {burnVelocity.isHighVelocity 
                ? "WARNING: High frequency impulse burn detected. Cooling protocol suggested."
                : "STABLE: Recent spending habits remain within target baseline."}
            </p>
          </div>
        </div>

        {/* Debt Detonator Card */}
        <div className="col-span-1 border border-surface-border rounded-sm p-6 bg-surface-raised border-surface-border relative overflow-hidden group shadow-md hover:border-zinc-700 transition-colors">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 border border-surface-border bg-surface-base flex items-center justify-center shrink-0 text-zinc-500">
                <Flame className="w-4 h-4" />
              </div>
              {avalancheTarget && (
                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[9px] font-mono font-black text-rose-500 uppercase tracking-widest">Target Locked</span>
                </div>
              )}
            </div>
            
            <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-content-primary mb-1 font-bold">Debt Detonator</h3>
            <p className="text-[10px] font-mono text-zinc-600 mb-4 uppercase tracking-widest">Avalanche Strategy</p>
            
            {avalancheTarget ? (
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 mb-1 truncate">{avalancheTarget.name}</p>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xl font-mono font-bold text-content-primary tabular-nums">${avalancheTarget.remaining.toLocaleString()}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{debtProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1 bg-surface-base border border-surface-border p-0.5 rounded-none overflow-hidden mb-4 shadow-inner">
                  <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${debtProgress}%` }}></div>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 border-l-2 border-surface-border pl-3 mt-auto leading-relaxed">
                  Focus all excess cash on this <span className="text-indigo-400 font-bold">{avalancheTarget.apr}% APR</span> principal.
                </p>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-zinc-500 border-l-2 border-surface-border pl-3 mt-4 leading-relaxed">
                STATUS: DEBT FREE. All toxic liabilities neutralized. You are cleared for pure asset accumulation.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Timeline Chart */}
        <div className="lg:col-span-2">
          <CollapsibleModule title="Cash Flow Projection" icon={Terminal}>
            <div className="flex justify-between items-center mb-6">
              <p className="text-xs font-mono text-zinc-500">Estimated balance trajectory</p>
              <select className="text-[10px] font-mono bg-surface-base border border-surface-border text-zinc-200 rounded-sm focus:ring-1 focus:ring-zinc-500 px-3 py-1 outline-none">
                <option>NEXT 30 DAYS</option>
                <option>NEXT 90 DAYS</option>
              </select>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FAFAFA" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#FAFAFA" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderRadius: '4px', border: '1px solid #262626', color: '#FAFAFA', fontFamily: 'monospace', fontSize: '12px' }}
                    itemStyle={{ color: '#FAFAFA' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Projected Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#FAFAFA" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CollapsibleModule>
        </div>

        {/* Upcoming Bills & Subscriptions */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-raised rounded-sm border border-surface-border flex flex-col">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary">Upcoming Obligations</h3>
              <Link to="/bills" className="text-xs font-mono text-zinc-500 hover:text-white transition-colors">VIEW ALL</Link>
            </div>
            <div className="p-0">
              {/* Liquidity Gap Indicator */}
              <div className="bg-surface-elevated border-b border-surface-border px-6 py-3 flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">Next Payday: <span className="text-emerald-400">In 4 Days</span></span>
                <span className="text-xs font-mono text-zinc-500">Bills Before Payday: <span className="text-content-primary">$145.00</span></span>
              </div>
              {upcomingBills.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-zinc-500">No upcoming obligations.</div>
              ) : (
                <motion.ul 
                  className="divide-y divide-surface-highlight"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                >
                  {upcomingBills.slice(0, 3).map((bill) => (
                    <motion.li 
                      key={bill.id} 
                      className="px-6 py-3 hover:bg-surface-elevated transition-colors flex justify-between items-center"
                      variants={{
                        hidden: { opacity: 0, scale: 0.98 },
                        visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xs font-mono text-zinc-500 w-12 text-center leading-tight">
                          {bill.dueDate.split('-')[2]}<br/>{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][parseInt(bill.dueDate.split('-')[1], 10) - 1]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-content-primary">{bill.biller}</p>
                        </div>
                      </div>
                      <p className="text-sm font-mono text-content-primary tabular-nums">${bill.amount.toFixed(2)}</p>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </div>

          <div className="bg-surface-raised rounded-sm border border-surface-border flex flex-col">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center">
              <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-zinc-400" /> Subscription Sniper
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-500 tabular-nums">${monthlySubscriptionCost.toFixed(2)}/MO</span>
              </div>
            </div>
            <div className="p-0">
              <div className="bg-surface-elevated border-b border-surface-border p-4 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-none bg-red-500 mt-1.5 shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-content-primary">Netflix increased by $2.00</p>
                  <p className="text-xs font-mono text-zinc-500 mt-1">0 hours watched in 21 days.</p>
                  <button onClick={() => toast.success('Cancellation process started')} className="text-xs font-mono font-bold text-red-400 hover:text-red-300 mt-3 uppercase tracking-widest transition-colors">Execute Cancel</button>
                </div>
              </div>
              {activeSubscriptions.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-zinc-500">No active subscriptions.</div>
              ) : (
                <motion.ul 
                  className="divide-y divide-surface-highlight"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                >
                  {activeSubscriptions.slice(0, 3).map((sub) => (
                    <motion.li 
                      key={sub.id} 
                      className="px-6 py-3 hover:bg-surface-elevated transition-colors flex justify-between items-center"
                      variants={{
                        hidden: { opacity: 0, scale: 0.98 },
                        visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium text-content-primary">{sub.name}</p>
                        <p className="text-xs font-mono text-zinc-500 mt-0.5">RENEWS {sub.nextBillingDate.toUpperCase()}</p>
                      </div>
                      <p className="text-sm font-mono text-content-primary tabular-nums">${sub.amount.toFixed(2)}</p>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </div>
          </div>

          {/* Ambush Terminal */}
          <div className={`bg-surface-raised rounded-sm border flex flex-col transition-all duration-500 ${mockCitations.some(c => c.daysLeft <= 7) ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.05)] animate-[pulse_3s_ease-in-out_infinite]' : 'border-surface-border'}`}>
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-elevated/50">
              <h3 className="text-xs font-mono uppercase tracking-widest text-content-primary flex items-center gap-2 font-bold">
                <Siren className={`w-3.5 h-3.5 ${mockCitations.some(c => c.daysLeft <= 7) ? 'text-rose-500' : 'text-zinc-500'}`} /> Citations & Fines
              </h3>
              {mockCitations.some(c => c.daysLeft <= 7) && (
                <span className="text-[9px] font-mono bg-rose-500/20 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-sm font-bold animate-pulse">DUE SOON</span>
              )}
            </div>
            <div className="p-0">
              <motion.ul 
                className="divide-y divide-surface-highlight"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              >
                {mockCitations.map((citation) => (
                  <motion.li 
                    key={citation.id} 
                    className="px-6 py-4 hover:bg-surface-elevated transition-colors"
                    variants={{
                      hidden: { opacity: 0, scale: 0.98 },
                      visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 border ${citation.daysLeft <= 7 ? 'border-rose-500/30 bg-rose-500/10 text-rose-500' : 'border-surface-border bg-surface-base text-zinc-500'} flex flex-col justify-center items-center rounded-sm shrink-0 leading-none`}>
                          <span className="text-xs font-black font-mono">{citation.daysLeft}</span>
                          <span className="text-[8px] font-mono tracking-widest">DAYS</span>
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-content-primary uppercase">{citation.type}</p>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{citation.jurisdiction}</p>
                          <p className={`text-[10px] font-mono mt-1 ${citation.daysLeft <= 7 ? 'text-rose-400 shadow-rose-500/50' : 'text-zinc-500'}`}>
                            +${citation.penalty} PENALTY TRIGGER
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-content-primary tabular-nums">${citation.amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedCitation(citation); setIsCitationModalOpen(true); }}
                        className={`w-full text-[10px] font-mono font-bold px-3 py-2 uppercase tracking-widest transition-colors rounded-sm ${citation.daysLeft <= 7 ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-content-primary hover:bg-zinc-200 text-surface-base'}`}
                      >
                        Execute Resolution
                      </button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        </div>
      </div>

      {/* Citation Resolution Modal */}
      <Dialog open={isCitationModalOpen} onClose={() => setIsCitationModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md w-full rounded-sm bg-surface-raised border border-surface-border shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-surface-border flex justify-between items-center bg-surface-elevated">
              <h2 className="text-sm font-mono font-bold text-content-primary uppercase tracking-widest flex items-center gap-2">
                <Siren className="w-4 h-4 text-rose-400" /> Resolve Citation
              </h2>
              <button onClick={() => setIsCitationModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedCitation && (
              <div className="p-6">
                <div className="mb-6 bg-surface-elevated border border-surface-border p-4 rounded-sm">
                  <p className="text-[10px] font-mono text-zinc-500 mb-1 uppercase tracking-widest">Citation Details</p>
                  <p className="text-base font-mono font-bold text-content-primary">{selectedCitation.type} | {selectedCitation.jurisdiction}</p>
                  <p className={`text-xs font-mono mt-2 ${selectedCitation.daysLeft <= 7 ? 'text-rose-400 font-bold' : 'text-zinc-400'}`}>
                    {selectedCitation.daysLeft} DAYS LEFT → +${selectedCitation.penalty} FEE
                  </p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Citation Number</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={selectedCitation.citationNumber} className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none" />
                      <button onClick={() => toast.success('Copied to clipboard')} className="bg-surface-border hover:bg-surface-border text-white p-2 rounded-sm transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-500 mb-2 uppercase tracking-widest">Payment Portal</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={selectedCitation.paymentUrl} className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm font-mono text-content-primary focus:outline-none" />
                      <a href={selectedCitation.paymentUrl} target="_blank" rel="noreferrer" className="bg-content-primary hover:bg-zinc-300 text-surface-base p-2 rounded-sm transition-colors flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => { toast.success('Marked as resolved'); setIsCitationModalOpen(false); }}
                  className="w-full bg-emerald-500/10 border border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 font-mono font-bold py-3 rounded-sm transition-colors uppercase tracking-widest text-xs"
                >
                  Mark as Paid
                </button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
