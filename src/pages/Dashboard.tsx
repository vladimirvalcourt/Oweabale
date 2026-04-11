import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ArrowRight, Activity, ShieldCheck, Calendar, Flame, Inbox, ShieldAlert,
  X, Copy, ExternalLink
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { motion } from 'motion/react';
import { animate } from 'motion/react';
import { useStore } from '../store/useStore';
import { sanitizeUrl } from '../lib/security';
import { projectNetWorth, calcMonthlyCashFlow, calcSurplusRouting } from '../lib/finance';
import { BorderRotate } from '../components/ui/animated-gradient-border';

import type { Citation } from '../store/useStore';

/** v2: JSON { liquid, liability } — re-show when fingerprint changes (cash or est. quarterly tax moves). */
const LOW_TAX_RESERVE_DISMISS_KEY = 'oweable_dismiss_dashboard_low_tax_reserve_v2';

type LowTaxFingerprint = { liquid: number; liability: number };

function roundMoneyFingerprint(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 25) * 25;
}

function parseStoredLowTaxFingerprint(): LowTaxFingerprint | null {
  try {
    const raw = sessionStorage.getItem(LOW_TAX_RESERVE_DISMISS_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as unknown;
    if (!j || typeof j !== 'object') return null;
    const o = j as Record<string, unknown>;
    const liquid = Number(o.liquid);
    const liability = Number(o.liability);
    if (Number.isFinite(liquid) && Number.isFinite(liability)) return { liquid, liability };
  } catch {
    /* ignore */
  }
  return null;
}

function lowTaxFingerprintsEqual(a: LowTaxFingerprint, b: LowTaxFingerprint): boolean {
  return a.liquid === b.liquid && a.liability === b.liability;
}

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


export default function Dashboard() {
  const location = useLocation();
  const bills = useStore(state => state.bills);
  const debts = useStore(state => state.debts);
  const transactions = useStore(state => state.transactions);
  const assets = useStore(state => state.assets);
  const subscriptions = useStore(state => state.subscriptions);
  const incomes = useStore(state => state.incomes);
  const user = useStore(state => state.user);
  const goals = useStore(state => state.goals);
  const freelanceEntries = useStore(state => state.freelanceEntries);
  const pendingIngestions = useStore(state => state.pendingIngestions);
  const citations = useStore(state => state.citations);
  const resolveCitation = useStore(state => state.resolveCitation);
  
  /** Global fetch flag from Zustand — true while `fetchData` runs after login/refresh. */
  const isLoading = useStore((state) => state.isLoading);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [dismissedLowTaxFingerprint, setDismissedLowTaxFingerprint] = useState<LowTaxFingerprint | null>(
    () => parseStoredLowTaxFingerprint()
  );

  useEffect(() => {
    if (location.hash === '#cash-flow') {
      requestAnimationFrame(() => {
        document.getElementById('cash-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const projectedData = useMemo(() => {
    return projectNetWorth(assets, debts, incomes, bills, subscriptions, 6, 0).map(r => ({
      name: r.label,
      balance: Number.isFinite(r.netWorth) ? r.netWorth : 0
    }));
  }, [assets, debts, incomes, bills, subscriptions]);

  /** Recharts can emit invalid SVG lines if all values are NaN or data is empty. */
  const cashFlowChartData = useMemo(() => {
    const rows = (projectedData || []).filter(
      (d) => d && typeof d.name === 'string' && Number.isFinite(d.balance)
    );
    if (rows.length === 0) return [{ name: '—', balance: 0 }];
    return rows;
  }, [projectedData]);

  // --- Financial Calcs ---
  const totalAssets = useMemo(() => (assets || []).reduce((acc, asset) => acc + (asset?.value || 0), 0), [assets]);
  const totalDebts = useMemo(() => (debts || []).reduce((acc, debt) => acc + (debt?.remaining || 0), 0), [debts]);
  const netWorth = totalAssets - totalDebts;

  const liquidCash = useMemo(() => (assets || []).filter(a => a?.type === 'Cash').reduce((s, a) => s + (a?.value || 0), 0), [assets]);
  
  const monthlyBurn = useMemo(() => {
    const toMonthly = (amount: number, frequency: string) => {
      const amt = amount || 0;
      switch (frequency) {
        case 'Weekly':    return amt * 4.33;
        case 'Bi-weekly': return amt * 2.165;
        case 'Quarterly': return amt / 3;
        case 'Yearly':    return amt / 12;
        default:          return amt; // Monthly
      }
    };
    const billsTotal = (bills || []).reduce((s, b) => s + toMonthly(b?.amount, b?.frequency), 0);
    const debtMins = (debts || []).reduce((s, d) => s + (d?.minPayment || 0), 0);
    const subTotal = (subscriptions || [])
      .filter(s => s?.status === 'active')
      .reduce((s, sub) => s + toMonthly(sub?.amount, sub?.frequency), 0);
    return billsTotal + debtMins + subTotal;
  }, [bills, debts, subscriptions]);

  const cashFlow = useMemo(
    () => calcMonthlyCashFlow(incomes || [], bills || [], debts || [], subscriptions || []),
    [incomes, bills, debts, subscriptions]
  );

  const surplusRouting = useMemo(
    () => calcSurplusRouting(cashFlow.surplus || 0, goals || [], debts || []),
    [cashFlow.surplus, goals, debts]
  );

  const survivalMonths = isFinite(liquidCash / (monthlyBurn || 1)) ? Math.max(0, liquidCash / (monthlyBurn || 1)) : 0;
  
  const upcomingBills = useMemo(() => (bills || [])
    .filter(b => b?.status === 'upcoming' && b?.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()), 
  [bills]);

  const activeSubscriptions = useMemo(() => (subscriptions || []).filter(s => s?.status === 'active'), [subscriptions]);
  
  const taxInsolvencyRisk = useMemo(() => {
    const currentTaxLiability = (cashFlow?.taxReserve || 0) * 3; // Est quarterly
    return liquidCash < currentTaxLiability;
  }, [cashFlow.taxReserve, liquidCash]);

  const lowTaxFingerprint = useMemo(
    (): LowTaxFingerprint => ({
      liquid: roundMoneyFingerprint(liquidCash),
      liability: roundMoneyFingerprint((cashFlow?.taxReserve ?? 0) * 3),
    }),
    [liquidCash, cashFlow.taxReserve]
  );

  const showLowTaxReserveAlert = useMemo(() => {
    if (!taxInsolvencyRisk) return false;
    if (!dismissedLowTaxFingerprint) return true;
    return !lowTaxFingerprintsEqual(dismissedLowTaxFingerprint, lowTaxFingerprint);
  }, [taxInsolvencyRisk, dismissedLowTaxFingerprint, lowTaxFingerprint]);

  const dismissLowTaxReserveAlert = useCallback(() => {
    try {
      sessionStorage.setItem(LOW_TAX_RESERVE_DISMISS_KEY, JSON.stringify(lowTaxFingerprint));
    } catch {
      /* ignore quota / private mode */
    }
    setDismissedLowTaxFingerprint(lowTaxFingerprint);
  }, [lowTaxFingerprint]);

  const subscriptionSpend = useMemo(() => activeSubscriptions.reduce((acc, sub) => {
    const toMonthly = (amount: number, freq: string) => freq === 'Yearly' ? (amount / 12) : (amount || 0);
    return acc + toMonthly(sub.amount, sub.frequency);
  }, 0), [activeSubscriptions]);

  // --- Intelligent Modules ---

  // 1. Debt
  const avalancheTarget = useMemo(() => {
    const activeDebts = [...(debts || [])].filter(d => (d?.remaining || 0) > 0);
    return activeDebts.sort((a, b) => (b?.apr || 0) - (a?.apr || 0))[0] || null;
  }, [debts]);

  const debtProgress = useMemo(() => {
    if (!avalancheTarget) return 0;
    const total = (avalancheTarget.remaining || 0) + (avalancheTarget.paid || 0);
    if (total === 0) return 0;
    return ((avalancheTarget.paid || 0) / total) * 100;
  }, [avalancheTarget]);

  // 2. Cash Gap
  const { isOverdraftRisk, liquidBuffer, imminentTotal, nextPaydayStr } = useMemo(() => {
    const today = new Date();
    const activeIncomes = (incomes || []).filter(i => i?.status === 'active' && i?.nextDate && new Date(i.nextDate) >= today);
    const nextPayday = activeIncomes.sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())[0];
    
    let sniperWindowMs = 14 * 24 * 60 * 60 * 1000;
    if (nextPayday) {
      const paydayDate = new Date(nextPayday.nextDate);
      if (!isNaN(paydayDate.getTime())) {
        sniperWindowMs = paydayDate.getTime() - today.getTime();
      }
    }

    const imminent = upcomingBills.filter(b => {
      if (!b?.dueDate) return false;
      const msUntilDue = new Date(b.dueDate).getTime() - today.getTime();
      return msUntilDue >= 0 && msUntilDue <= sniperWindowMs;
    });

    const sumImminent = imminent.reduce((s, b) => s + (b?.amount || 0), 0);
    const buffer = liquidCash - sumImminent;
    
    return {
      isOverdraftRisk: buffer < 0,
      liquidBuffer: buffer,
      imminentTotal: sumImminent,
      nextPaydayStr: nextPayday?.nextDate ? new Date(nextPayday.nextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '14 Days'
    };
  }, [upcomingBills, liquidCash, incomes]);

  // 3. Subscription Scrutiny
  const redundantSubs = useMemo(() => {
    const normalized = activeSubscriptions.map(s => ({ ...s, name: (s?.name || '').toLowerCase() }));
    return normalized.filter(s => s.name.includes('netflix') || s.name.includes('hulu'));
  }, [activeSubscriptions]);

  // 4. Burn Velocity (Transactions)
  const burnVelocity = useMemo(() => {
    const today = new Date();
    const seventyTwoHoursAgo = new Date(today.getTime() - (72 * 60 * 60 * 1000));
    
    const recentExpenses = (transactions || []).filter(t => 
      t?.type === 'expense' && 
      t?.date &&
      new Date(t.date) >= seventyTwoHoursAgo
    );
    
    const totalSpent = recentExpenses.reduce((sum, t) => sum + (t?.amount || 0), 0);
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
    return (freelanceEntries || []).reduce((sum: number, e: any) => sum + (e?.scouredWriteOffs || 0), 0);
  }, [freelanceEntries]);


  // Full-page skeleton until Supabase data has been merged into the store.
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

  const hasActionableAlerts = pendingIngestions.length > 0 || isOverdraftRisk || showLowTaxReserveAlert;

  return (
    <BorderRotate
      animationSpeed={15}
      borderRadius={0}
      borderWidth={1}
      backgroundColor="#050607"
      gradientColors={{
        primary: "#6366f1", // Indigo
        secondary: "#a855f7", // Purple
        accent: "#ec4899" // Pink
      }}
      className="min-h-[100dvh]"
    >
      <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-indigo-500/10 text-brand-violet font-mono text-xl font-bold">
                {(user?.firstName?.charAt(0) || '')}{(user?.lastName?.charAt(0) || '')}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-sans font-semibold tracking-tight text-white">
              Welcome back, <span className="text-brand-indigo">{user?.firstName || 'User'}</span>
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
              <Link to="/bills" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-sm">
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
            {showLowTaxReserveAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-500/10 border border-amber-500/30 rounded-sm shadow-sm flex flex-col sm:flex-row sm:items-stretch overflow-hidden"
              >
                <Link
                  to="/taxes"
                  className="flex flex-1 items-center justify-between gap-4 p-5 min-w-0 hover:bg-amber-500/15 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset rounded-sm sm:rounded-none"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-sans font-medium text-amber-400">Low Tax Reserve</p>
                      <p className="text-xs font-sans text-amber-300/80 mt-0.5">
                        Cash is below the estimated quarterly liability of ${Math.round(cashFlow.taxReserve * 3).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-400 shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden />
                </Link>
                <div className="flex border-t border-amber-500/30 sm:border-t-0 sm:border-l sm:border-amber-500/30">
                  <button
                    type="button"
                    onClick={dismissLowTaxReserveAlert}
                    aria-label="Dismiss low tax reserve alert"
                    className="w-full sm:w-auto px-5 py-3 sm:py-0 text-xs font-mono font-bold uppercase tracking-widest text-amber-200/90 hover:bg-amber-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
                  >
                    Got it
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 3. Primary Metrics Panel — anchor for sidebar "Cash flow" */}
      <section id="cash-flow" className="scroll-mt-24">
      <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 pl-1 mt-8 mb-3">Core Financials</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Runway Metric Card */}
        <div className="bg-surface-raised border border-surface-border p-6 rounded-sm shadow-sm md:flex md:flex-col md:justify-between">
          <div className="flex justify-between items-start mb-8">
            <div className="text-left w-full">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-3">Operating Runway</p>
              <h2 className="text-5xl sm:text-6xl font-mono font-bold text-white tracking-tighter tabular-nums leading-none">
                <AnimatedValue value={survivalMonths} decimals={1} />
                <span className="text-2xl font-sans text-content-tertiary font-medium ml-3 uppercase tracking-wide">Months</span>
              </h2>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 border-t border-surface-border pt-6 mt-4">
            <div className="text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-2">Liquid Cash</p>
              <p className="text-2xl font-mono text-brand-profit font-bold">${liquidCash.toLocaleString()}</p>
            </div>
            <div className="text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-2">Monthly Expenses</p>
              <p className="text-2xl font-mono text-white font-bold">${Math.round(monthlyBurn).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Distributed 4-grid for standard numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-sm shadow-sm text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-3">Net Worth</p>
              <p className="text-2xl sm:text-4xl font-mono text-white font-bold tabular-nums">$<AnimatedValue value={netWorth} /></p>
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-sm shadow-sm text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-3">Total Assets</p>
              <p className="text-2xl sm:text-4xl font-mono text-white font-bold tabular-nums">$<AnimatedValue value={totalAssets} /></p>
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-sm shadow-sm text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-3 flex items-center gap-2">
                Tax Savings <ShieldCheck className="w-3.5 h-3.5 text-brand-tax" />
              </p>
              <p className="text-2xl sm:text-4xl font-mono text-brand-tax font-bold tabular-nums">-$<AnimatedValue value={cashFlow.taxReserve} /></p>
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-sm shadow-sm text-left">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-3">Monthly Surplus</p>
              <p className="text-2xl sm:text-4xl font-mono text-brand-profit font-bold tabular-nums">+$<AnimatedValue value={cashFlow.surplus} /></p>
            </div>
        </div>
      </div>
      </section>

      {/* 4. Active Intelligence Grid */}
      <h2 className="text-[12px] font-mono font-bold uppercase tracking-[0.1em] text-content-tertiary pl-1 mt-12 mb-4">Smart Alerts & Active Monitoring</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tax Shield */}
        <div className="bg-surface-raised rounded-sm p-6 border border-surface-border flex flex-col justify-between shadow-sm group transition-all text-left">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-sm flex items-center justify-center shrink-0 text-brand-tax">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono bg-brand-tax/10 text-brand-tax px-2 py-1 rounded-sm uppercase tracking-widest font-semibold border border-brand-tax/20">Active</span>
            </div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-tight mb-2">Tax Deduction Finder</h3>
            <p className="text-xs font-sans text-content-tertiary leading-relaxed">
              Automatic extraction of valid deductions from freelancer platforms and records.
            </p>
          </div>
          <div className="bg-surface-base border border-surface-border p-6 rounded-sm">
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-[0.05em] mb-2">Lifetime Recovered</p>
              <p className="text-4xl font-mono text-white font-bold tabular-nums">${lifetimeTaxShield.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Spending Pulse */}
        <div className={`bg-surface-raised rounded-sm p-6 border transition-all text-left flex flex-col justify-between shadow-sm ${burnVelocity.isHighVelocity ? 'border-brand-expense/30' : 'border-surface-border'}`}>
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div className={`w-10 h-10 border rounded-sm flex items-center justify-center shrink-0 ${burnVelocity.isHighVelocity ? 'border-brand-expense/30 bg-brand-expense/10 text-brand-expense' : 'border-surface-border bg-surface-base text-content-tertiary'}`}>
                <Activity className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-mono px-2 py-1 rounded-sm uppercase tracking-widest font-semibold border ${burnVelocity.isHighVelocity ? 'bg-brand-expense/10 text-brand-expense border-brand-expense/20' : 'bg-surface-base text-content-tertiary border-surface-border'}`}>
                {burnVelocity.isHighVelocity ? 'High' : burnVelocity.isModerateVelocity ? 'Moderate' : 'On Track'}
              </span>
            </div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-tight mb-2">Recent Spending (72h)</h3>
            <p className="text-xs font-sans text-content-tertiary leading-relaxed">
              Real-time monitoring of cash outflow velocity across all connected accounts.
            </p>
          </div>
          <div>
            <div className="flex items-baseline gap-3 mb-4">
              <p className="text-4xl font-mono text-white tabular-nums">${burnVelocity.totalSpent.toFixed(0)}</p>
              <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-wider">/ {burnVelocity.frequency} txs</p>
            </div>
            {burnVelocity.isHighVelocity && (
              <p className="text-[11px] font-mono text-brand-expense bg-brand-expense/5 p-3 rounded-sm border border-brand-expense/20">
                Velocity Limit Exceeded
              </p>
            )}
          </div>
        </div>

        {/* Debt Target */}
        <div className="bg-surface-raised rounded-sm p-6 border border-surface-border flex flex-col justify-between shadow-sm text-left group transition-all">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-sm flex items-center justify-center shrink-0 text-content-tertiary">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-sm font-sans font-bold text-white uppercase tracking-tight mb-2">Debt Avalanche Shield</h3>
            <p className="text-xs font-sans text-content-tertiary leading-relaxed">
              Mathematical priority on highest interest accounts to minimize capital waste.
            </p>
          </div>
          
          {avalancheTarget ? (
            <div>
              <div className="mb-4">
                <p className="text-[12px] font-mono text-brand-expense uppercase tracking-wider mb-2 truncate">Prioritizing: {avalancheTarget.name}</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-4xl font-mono text-white tabular-nums">${avalancheTarget.remaining.toLocaleString()}</span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{debtProgress.toFixed(0)}% Clear</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 border border-surface-border rounded-full overflow-hidden mt-4">
                <div className="h-full bg-brand-expense transition-all duration-1000 shadow-[0_0_8px_rgba(248,113,113,0.3)]" style={{ width: `${debtProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-base border border-surface-border p-6 rounded-sm">
              <p className="text-sm font-sans text-brand-profit font-bold">Debt Free</p>
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
            
            <div className="h-[200px] sm:h-[280px] w-full min-h-[120px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={120}>
                <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272A" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'sans-serif' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'sans-serif' }} tickFormatter={(val) => `$${Number(val ?? 0) / 1000}k`} />
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
              <Link to="/bills" className="text-xs font-sans text-indigo-400 hover:text-indigo-300 transition-colors font-medium">See all</Link>
            </div>
            
            <div className="overflow-y-auto outline-none">
              {isLoading ? (
                <div className="space-y-2 p-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-zinc-800 rounded-sm" />
                  ))}
                </div>
              ) : upcomingBills.length === 0 ? (
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
                          {bill?.dueDate?.includes('-') ? (
                            <>
                              {bill.dueDate.split('-')[2]}<br/>
                              {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][parseInt(bill.dueDate.split('-')[1], 10) - 1] || '---'}
                            </>
                          ) : (
                            'N/A'
                          )}
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
               {citations.filter((c: any) => c.status === 'open').length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <ShieldCheck className="w-8 h-8 text-emerald-500/50 mb-3" />

                    <p className="text-sm font-sans font-medium text-zinc-300">Clean Record</p>
                    <p className="text-xs text-zinc-500 mt-1">No outstanding tickets found.</p>
                  </div>
               ) : (
                 <ul className="divide-y divide-surface-border">
                  {citations.filter((c: any) => c.status === 'open').map((citation: any) => (
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
                        onClick={() => { navigator.clipboard.writeText(selectedCitation.citationNumber).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Failed to copy')); }} 
                        className="bg-surface-border hover:bg-zinc-700 text-zinc-300 px-3 border border-l-0 border-surface-border rounded-r transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 z-10"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-medium text-zinc-500 mb-1.5">Online Payment Portal</label>
                    {sanitizeUrl(selectedCitation.paymentUrl) ? (
                      <a
                        href={sanitizeUrl(selectedCitation.paymentUrl)!}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated focus-visible:ring-indigo-500"
                      >
                        Open Payment Portal <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="flex items-center justify-center gap-2 w-full bg-zinc-800 text-zinc-500 rounded px-4 py-2.5 text-sm font-medium cursor-not-allowed">
                        No Payment Link Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      </div>
    </BorderRotate>
  );
}
