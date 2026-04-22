import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionLink } from '../components/TransitionLink';
import { 
  ArrowRight, TrendingUp, ShieldCheck, Flame, Inbox, ShieldAlert,
  X, Copy, ExternalLink, Wallet
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { toast } from 'sonner';
import { Dialog } from '@headlessui/react';
import { motion, animate, useMotionValue, useTransform } from 'motion/react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useStore } from '../store/useStore';
import { sanitizeUrl } from '../lib/security';
import { projectNetWorth, calcMonthlyCashFlow, computeSafeToSpend, forecast30DayCashFlow, detectSpendingAnomalies } from '../lib/finance';
import { rechartsTooltipStableProps } from '../lib/rechartsTooltip';
import { AppPageShell } from '../components/AppPageShell';
import { SafeResponsiveContainer } from '../components/charts/SafeResponsiveContainer';
import { formatCategoryLabel } from '../lib/categoryDisplay';
import { ProWelcomeModal } from '../components/ProWelcomeModal';

import type { Citation } from '../store/useStore';

/** v3: one-time dismissal persisted across sessions/devices on this browser. */
const DASHBOARD_CALM_MODE_KEY = 'oweable_dashboard_calm_mode_v1';
const LOW_TAX_RESERVE_SNOOZE_UNTIL_KEY = 'oweable_low_tax_reserve_snooze_until_v1';
const SAFE_TO_SPEND_MIN_PROMPT = 5;

function parseCalmModeEnabled(): boolean {
  try {
    return localStorage.getItem(DASHBOARD_CALM_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function parseLowTaxSnoozeUntil(): number {
  try {
    const raw = localStorage.getItem(LOW_TAX_RESERVE_SNOOZE_UNTIL_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

// Helper for animated numbers — uses MotionValue to avoid React re-renders per frame
function AnimatedValue({ value, prefix = "", suffix = "", decimals = 0 }: { value: number, prefix?: string, suffix?: string, decimals?: number }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (val) =>
    `${prefix}${val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, mv, prefersReducedMotion]);

  if (prefersReducedMotion) {
    const text = `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    return <span>{text}</span>;
  }

  return <motion.span>{formatted}</motion.span>;
}


export default function Dashboard() {
  const location = useLocation();
  const bills = useStore(state => state.bills);
  const debts = useStore(state => state.debts);
  const debtsMissingDueDate = useMemo(
    () => (debts || []).filter((d) => (d?.remaining || 0) > 0 && !String(d?.paymentDueDate ?? '').trim()),
    [debts],
  );
  const transactions = useStore(state => state.transactions);
  const assets = useStore(state => state.assets);
  const subscriptions = useStore(state => state.subscriptions);
  const incomes = useStore(state => state.incomes);
  const user = useStore(state => state.user);
  const freelanceEntries = useStore(state => state.freelanceEntries);
  const pendingIngestions = useStore(state => state.pendingIngestions);
  const citations = useStore(state => state.citations);

  /** Global fetch flag from Zustand — true while `fetchData` runs after login/refresh. */
  const isLoading = useStore((state) => state.isLoading);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [lowTaxReserveSnoozeUntil, setLowTaxReserveSnoozeUntil] = useState<number>(() => parseLowTaxSnoozeUntil());
  const [calmMode, setCalmMode] = useState<boolean>(() => parseCalmModeEnabled());
  /** Stable anchor for citation due dates (matches Obligations / safe-to-spend math). */
  const [scheduleBaseMs] = useState(() => Date.now());
  /** Controls how many projected months show in the Cash Flow Trajectory chart. */
  const [trajectoryWindow, setTrajectoryWindow] = useState<'30' | '90'>('30');

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
    const monthLimit = trajectoryWindow === '30' ? 1 : 3;
    const rows = (projectedData || [])
      .filter((d) => d && typeof d.name === 'string' && Number.isFinite(d.balance))
      .slice(0, monthLimit + 1);
    if (rows.length === 0) return [{ name: '—', balance: 0 }];
    return rows;
  }, [projectedData, trajectoryWindow]);

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
  const monthlyIncome = cashFlow.monthlyIncome || 0;

  const spendingShareOfIncome = useMemo(() => {
    if (monthlyIncome <= 0) return null;
    const totalMonthlyCommitted = cashFlow.fixedExpenses + cashFlow.subscriptions;
    return Math.max(0, (totalMonthlyCommitted / monthlyIncome) * 100);
  }, [cashFlow.fixedExpenses, cashFlow.subscriptions, monthlyIncome]);
  const spendingBenchmark = useMemo(() => {
    if (spendingShareOfIncome === null) return null;
    if (spendingShareOfIncome <= 30) return { label: 'Well under budget', dotClass: 'bg-brand-profit', tone: 'text-brand-profit' };
    if (spendingShareOfIncome <= 50) return { label: 'On track', dotClass: 'bg-amber-300', tone: 'text-amber-300' };
    if (spendingShareOfIncome <= 75) return { label: 'Approaching limit', dotClass: 'bg-amber-400', tone: 'text-amber-400' };
    if (spendingShareOfIncome <= 100) return { label: 'At limit', dotClass: 'bg-rose-400', tone: 'text-rose-400' };
    return { label: 'Over budget', dotClass: 'bg-rose-400', tone: 'text-rose-400' };
  }, [spendingShareOfIncome]);

  const weeklySpendingRecap = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekExpenses = (transactions || []).filter((tx) => {
      if (tx?.type !== 'expense' || !tx?.date) return false;
      const txDate = new Date(tx.date);
      return txDate >= weekAgo && txDate <= now;
    });
    const total = lastWeekExpenses.reduce((sum, tx) => sum + (tx?.amount || 0), 0);
    const categoryTotals = new Map<string, number>();
    for (const tx of lastWeekExpenses) {
      const category = tx?.category || 'Uncategorized';
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + (tx?.amount || 0));
    }
    let topCategory: { name: string; amount: number } | null = null;
    for (const [name, amount] of categoryTotals.entries()) {
      if (!topCategory || amount > topCategory.amount) topCategory = { name, amount };
    }
    return {
      total,
      txCount: lastWeekExpenses.length,
      topCategory: topCategory?.name ?? null,
    };
  }, [transactions]);
  const weeklyTopCategoryLabel = weeklySpendingRecap.topCategory
    ? formatCategoryLabel(weeklySpendingRecap.topCategory)
    : null;

  const next30DayBills = useMemo(() => {
    const now = new Date();
    const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return (bills || []).filter((bill) => {
      if (!bill?.dueDate || bill.status === 'paid') return false;
      const due = new Date(bill.dueDate);
      return due >= now && due <= inThirtyDays;
    });
  }, [bills]);

  const next30DayBillsTotal = useMemo(
    () => next30DayBills.reduce((sum, bill) => sum + (bill?.amount || 0), 0),
    [next30DayBills],
  );

  const next30DayBillsVsIncomePct = useMemo(() => {
    if (monthlyIncome <= 0) return null;
    return (next30DayBillsTotal / monthlyIncome) * 100;
  }, [next30DayBillsTotal, monthlyIncome]);

  const safeToSpend = useMemo(
    () =>
      computeSafeToSpend({
        liquidCash,
        monthlySurplus: cashFlow.surplus ?? 0,
        bills: bills || [],
        incomes: incomes || [],
        subscriptions: subscriptions || [],
        debts: debts || [],
        citations: citations || [],
        scheduleBaseMs,
      }),
    [liquidCash, cashFlow.surplus, bills, incomes, subscriptions, debts, citations, scheduleBaseMs],
  );
  const hasIncomeWithNextPayday = useMemo(
    () => (incomes || []).some((inc) => inc?.status === 'active' && Boolean(inc?.nextDate)),
    [incomes],
  );
  const showSafeToSpendPrompt =
    !hasIncomeWithNextPayday || safeToSpend.dailySafeToSpend < SAFE_TO_SPEND_MIN_PROMPT;

  const survivalMonths = isFinite(liquidCash / (monthlyBurn || 1)) ? Math.max(0, liquidCash / (monthlyBurn || 1)) : 0;
  const showLowRunwayCoach = survivalMonths < 1;
  const nextBestMoveSteps = useMemo(() => {
    const steps: string[] = [];
    if (!hasIncomeWithNextPayday) {
      steps.push('Log your next income source and payday so your spending window is accurate.');
    }
    if ((subscriptions || []).some((s) => s.status === 'active')) {
      steps.push('Defer one non-essential subscription this week to extend runway immediately.');
    }
    const overdueCitation = (citations || []).find((c) => c.status === 'open' && c.daysLeft < 0);
    if (overdueCitation) {
      steps.push(`Resolve your overdue ${overdueCitation.type.toLowerCase()} before additional penalties accrue.`);
    }
    if (steps.length === 0) {
      steps.push('Review due bills in the next 7 days and align payment timing with expected income.');
    }
    return steps.slice(0, 3);
  }, [hasIncomeWithNextPayday, subscriptions, citations]);
  
  const dueSoonAndOverdueBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (bills || [])
      .filter((b) => b?.status !== 'paid' && b?.dueDate)
      .map((b) => {
        const dueDate = new Date(`${b.dueDate}T12:00:00`);
        const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);
        return { ...b, diffDays, isOverdue: diffDays < 0 };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [bills]);
  const upcomingBills = useMemo(
    () => dueSoonAndOverdueBills.filter((b) => !b.isOverdue),
    [dueSoonAndOverdueBills],
  );
  const overdueBills = useMemo(
    () => dueSoonAndOverdueBills.filter((b) => b.isOverdue),
    [dueSoonAndOverdueBills],
  );

  const taxInsolvencyRisk = useMemo(() => {
    const currentTaxLiability = (cashFlow?.taxReserve || 0) * 3; // Est quarterly
    return liquidCash < currentTaxLiability;
  }, [cashFlow.taxReserve, liquidCash]);
  const estimatedQuarterlyLiability = useMemo(
    () => (cashFlow.taxReserve || 0) * 3,
    [cashFlow.taxReserve],
  );
  const taxReservePosition = liquidCash - estimatedQuarterlyLiability;

  const showLowTaxReserveAlert = useMemo(() => {
    return taxInsolvencyRisk && scheduleBaseMs >= lowTaxReserveSnoozeUntil;
  }, [taxInsolvencyRisk, lowTaxReserveSnoozeUntil, scheduleBaseMs]);

  const snoozeLowTaxReserveAlert = useCallback(() => {
    const nextReminderAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(LOW_TAX_RESERVE_SNOOZE_UNTIL_KEY, String(nextReminderAt));
    } catch (err) {
      console.warn('[Dashboard] Failed to persist tax reserve snooze:', err);
    }
    setLowTaxReserveSnoozeUntil(nextReminderAt);
  }, []);

  /** HIGH-severity acknowledgment — shorter snooze than full “remind in 3 days”. */
  const acknowledgeLowTaxReserveForNow = useCallback(() => {
    const nextReminderAt = Date.now() + 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(LOW_TAX_RESERVE_SNOOZE_UNTIL_KEY, String(nextReminderAt));
    } catch (err) {
      console.warn('[Dashboard] Failed to persist tax reserve acknowledgment:', err);
    }
    setLowTaxReserveSnoozeUntil(nextReminderAt);
  }, []);

  const toggleCalmMode = useCallback(() => {
    setCalmMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DASHBOARD_CALM_MODE_KEY, next ? '1' : '0');
      } catch (err) {
        console.warn('[Dashboard] Failed to persist calm mode setting:', err);
      }
      return next;
    });
  }, []);

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
  const { isOverdraftRisk, liquidBuffer } = useMemo(() => {
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

  const hasAnyExpenseTransactions = useMemo(
    () => (transactions || []).some((t) => t?.type === 'expense'),
    [transactions],
  );

  // 5. Total Tax Shield
  const lifetimeTaxShield = useMemo(() => {
    return (freelanceEntries || []).reduce((sum, e) => sum + (e?.scouredWriteOffs || 0), 0);
  }, [freelanceEntries]);

  const hasOutstandingDebt = useMemo(
    () => (debts || []).some((d) => (d?.remaining || 0) > 0),
    [debts],
  );

  /** Smart Alerts cards: only when the underlying feature has real data. */
  const showTaxDeductionCard = (freelanceEntries?.length ?? 0) > 0 || lifetimeTaxShield > 0;
  /** Show if any expense exists in history, or there was activity in the last 72h. */
  const showSpendingPulseCard =
    hasAnyExpenseTransactions || burnVelocity.frequency > 0 || burnVelocity.totalSpent > 0;
  const showDebtAvalancheCard = hasOutstandingDebt;

  const smartAlertsVisibleCount = [showTaxDeductionCard, showSpendingPulseCard, showDebtAvalancheCard].filter(
    Boolean,
  ).length;

  const openCitations = useMemo(
    () => (citations || []).filter((c: Citation) => c.status === 'open'),
    [citations],
  );

  const cashFlowForecast = useMemo(() => {
    const liquidCash = assets.filter(a => a.type === 'Cash').reduce((s, a) => s + a.value, 0);
    const cashFlow = calcMonthlyCashFlow(incomes, bills, debts, subscriptions);
    return forecast30DayCashFlow({
      liquidCash,
      bills: bills.map(b => ({ dueDate: b.dueDate, amount: b.amount, status: b.status })),
      subscriptions: subscriptions.map(s => ({ nextBillingDate: s.nextBillingDate, amount: s.amount, status: s.status })),
      debts: debts.map(d => ({ minPayment: d.minPayment, remaining: d.remaining, paymentDueDate: d.paymentDueDate })),
      citations: citations.map(c => ({ status: c.status, daysLeft: c.daysLeft, amount: c.amount })),
      dailySurplus: cashFlow.surplus / 30,
    });
  }, [assets, bills, subscriptions, debts, citations, incomes]);

  const spendingAnomalies = useMemo(() =>
    detectSpendingAnomalies(transactions),
    [transactions]
  );

  const hasBillsSidebar = upcomingBills.length > 0;
  const hasCitationsSidebar = openCitations.length > 0;
  const hasLowerSidebar = hasBillsSidebar || hasCitationsSidebar;

  // Full-page skeleton until Supabase data has been merged into the store.
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-surface-border rounded-lg w-1/4"></div>
        <div className="bg-surface-raised rounded-lg border border-surface-border p-8 h-40"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-raised rounded-lg border border-surface-border p-6 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  const hasActionableAlerts =
    pendingIngestions.length > 0 ||
    isOverdraftRisk ||
    showLowTaxReserveAlert ||
    debtsMissingDueDate.length > 0;

  return (
    <AppPageShell>
      <ProWelcomeModal />
      <div className="space-y-8 w-full pb-8">
      
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-content-primary/10 text-content-primary text-xl font-sans font-semibold">
                {(user?.firstName?.charAt(0) || '')}{(user?.lastName?.charAt(0) || '')}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">
              Welcome back, <span className="text-content-primary">{user?.firstName || 'User'}</span>
            </h1>
            <p className="mt-1 text-sm font-medium text-content-secondary">Here is your financial overview for today.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleCalmMode}
          className="inline-flex items-center justify-center rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-content-secondary hover:text-content-primary focus-app"
        >
          {calmMode ? 'Calm mode: on' : 'Calm mode: off'}
        </button>
      </div>


      {/* 2. Action Center (Grouped Urgent Alerts) */}
      {!calmMode && hasActionableAlerts && (
        <div className="space-y-3">
          <h2 className="section-label pl-1">Action Center</h2>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Ingestion Action */}
            {pendingIngestions.length > 0 && (
              <TransitionLink to="/ingestion" className="block focus-app rounded-lg">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-raised border border-surface-border p-5 rounded-lg flex items-center justify-between hover:bg-content-primary/[0.03] transition-all shadow-none group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-content-primary/[0.06] rounded-full flex items-center justify-center shrink-0 border border-surface-border">
                      <Inbox className="w-5 h-5 text-content-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-content-primary">Requires Review</p>
                      <p className="text-xs font-sans text-content-secondary mt-0.5">{pendingIngestions.length} document{pendingIngestions.length === 1 ? '' : 's'} waiting for approval.</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-content-tertiary group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </TransitionLink>
            )}

            {/* Overdraft Risk Action */}
            {isOverdraftRisk && (
              <TransitionLink to="/bills" className="block focus-app rounded-lg">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-raised border border-surface-border p-5 rounded-lg flex items-center justify-between hover:bg-content-primary/[0.03] transition-all shadow-none group"
                >
                  <div className="flex items-center gap-5">
                    <div className="relative w-10 h-10 bg-content-primary/[0.06] rounded-full flex items-center justify-center shrink-0 border border-surface-border">
                      <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-[#0a0a0a]" aria-hidden />
                      <ShieldAlert className="w-5 h-5 text-content-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-content-primary">Cash Flow Warning</p>
                      <p className="text-xs font-sans text-content-secondary mt-0.5">
                        Upcoming bills exceed current cash by <span className="font-mono font-medium text-content-primary">${Math.abs(liquidBuffer).toFixed(2)}</span> before next payday.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-content-tertiary group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </TransitionLink>
            )}

            {/* Tax Insolvency Action */}
            {debtsMissingDueDate.length > 0 && (
              <TransitionLink to="/bills#due-soon" className="block focus-app rounded-lg">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-raised border border-amber-500/30 p-5 rounded-lg flex items-center justify-between hover:bg-content-primary/[0.03] transition-all shadow-none group"
                >
                  <div className="flex items-center gap-5">
                    <div className="relative w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center shrink-0 border border-amber-500/25">
                      <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-sans font-medium text-content-primary">Due dates missing</p>
                      <p className="text-xs font-sans text-content-secondary mt-0.5">
                        {debtsMissingDueDate.length} credit{' '}
                        {debtsMissingDueDate.length === 1 ? 'account has' : 'accounts have'} no due date — add them to avoid
                        missing payments.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-content-tertiary group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </TransitionLink>
            )}

            {showLowTaxReserveAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface-raised border border-surface-border rounded-lg shadow-none flex flex-col sm:flex-row sm:items-stretch overflow-hidden"
              >
                <TransitionLink
                  to="/taxes"
                  className="flex flex-1 items-center justify-between gap-4 p-5 min-w-0 hover:bg-content-primary/[0.03] transition-all group focus-app rounded-lg sm:rounded-none"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="relative w-10 h-10 bg-content-primary/[0.06] rounded-full flex items-center justify-center shrink-0 border border-surface-border">
                      <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-[#0a0a0a]" aria-hidden />
                      <ShieldAlert className="w-5 h-5 text-content-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-sans font-medium text-content-primary">Low Tax Reserve</p>
                      <p className="text-xs font-sans text-content-secondary mt-0.5">
                        Cash is below the estimated quarterly liability of ${Math.round(cashFlow.taxReserve * 3).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-content-tertiary shrink-0 group-hover:translate-x-1 transition-transform" aria-hidden />
                </TransitionLink>
                <div className="flex flex-col border-t border-surface-border sm:border-t-0 sm:border-l sm:border-surface-border sm:min-w-[11rem]">
                  <TransitionLink
                    to="/taxes"
                    className="inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm font-semibold text-content-primary hover:bg-content-primary/[0.04] transition-colors focus-app"
                  >
                    Go to Taxes →
                  </TransitionLink>
                  <button
                    type="button"
                    onClick={snoozeLowTaxReserveAlert}
                    className="inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm font-medium text-content-secondary hover:bg-content-primary/[0.04] transition-colors focus-app border-t border-surface-border"
                  >
                    Remind me in 3 days
                  </button>
                  <button
                    type="button"
                    onClick={acknowledgeLowTaxReserveForNow}
                    className="inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-xs font-medium text-content-tertiary hover:bg-content-primary/[0.04] transition-colors focus-app border-t border-surface-border"
                  >
                    I&apos;ll handle this later
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 3. Primary Metrics Panel — anchor for sidebar "Cash flow" */}
      <section id="cash-flow" className="scroll-mt-24 space-y-6">
      <div className="rounded-lg border border-surface-border bg-surface-raised p-6 shadow-none">
        {showSafeToSpendPrompt ? (
          <div className="rounded-lg border border-surface-border bg-surface-base/80 p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4 text-content-secondary" aria-hidden />
              <p className="text-xs font-mono uppercase tracking-wider text-content-tertiary">Setup required</p>
            </div>
            <h3 className="text-xl font-semibold text-content-primary">Unlock your real spending window</h3>
            <p className="mt-2 text-sm text-content-secondary max-w-2xl">
              Add your income source and next payday to see how much you can safely spend each day.
            </p>
            {/* 3-step mini-progress indicator */}
            <div className="mt-4 flex items-center gap-2 text-xs text-content-tertiary">
              <span className="rounded-full bg-brand-cta px-2.5 py-0.5 text-surface-base font-medium">Connect bank</span>
              <span className="text-content-muted">→</span>
              <span className="rounded-full border border-surface-border px-2.5 py-0.5">Add bills</span>
              <span className="text-content-muted">→</span>
              <span className="rounded-full border border-surface-border px-2.5 py-0.5">Set a budget</span>
            </div>
            <TransitionLink
              to="/income"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover"
            >
              Connect your bank to begin.
            </TransitionLink>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-profit shrink-0" aria-hidden />
                  <Wallet className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
                  <p className="metric-label normal-case text-content-secondary">Safe to spend (estimate)</p>
                </div>
                <p className="text-4xl sm:text-5xl font-mono font-bold text-content-primary tabular-nums tracking-tight">
                  $<AnimatedValue value={safeToSpend.dailySafeToSpend} decimals={2} />
                  <span className="text-lg sm:text-xl font-sans font-medium text-content-tertiary ml-2">/ day</span>
                </p>
                <p className="mt-2 text-sm text-content-secondary">
                  Through <span className="text-content-primary font-medium">{safeToSpend.windowEndLabel}</span> (until your next income date). Monthly surplus (modeled):{' '}
                  <span className="font-mono text-brand-profit">${safeToSpend.monthlySurplus.toLocaleString()}</span>.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:shrink-0 lg:max-w-xl w-full text-left">
                <div className="rounded-lg border border-surface-border bg-surface-base/80 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-1">Reserved in window</p>
                  <p className="text-lg font-mono text-content-primary tabular-nums">
                    ${safeToSpend.scheduledOutflowsTotal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-base/80 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-1">Cash after reservations</p>
                  <p className="text-lg font-mono text-content-primary tabular-nums">
                    ${safeToSpend.liquidAfterScheduled.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-base/80 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-1">Days in window</p>
                  <p className="text-lg font-mono text-content-primary tabular-nums">{safeToSpend.daysInWindow}</p>
                </div>
              </div>
            </div>
            <details className="mt-5 border-t border-surface-border pt-4 text-left">
              <summary className="cursor-pointer text-xs font-sans font-medium text-content-secondary hover:text-content-primary focus-app rounded-lg">
                How this is calculated
              </summary>
              <p className="mt-3 text-xs text-content-tertiary leading-relaxed">
                We take liquid cash (cash-type assets), subtract bills, subscriptions, minimum debt payments, and open fines with a due
                date in this window (today through your next paycheck), then divide by the number of days in that window for a rough daily amount.
              </p>
            </details>
          </>
        )}
      </div>

      {/* Spending Anomaly Callout */}
      {!calmMode && spendingAnomalies.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-1.5">Spending Anomalies Detected</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {spendingAnomalies.slice(0, 3).map(a => (
              <span key={a.category} className="text-xs text-content-secondary">
                <span className="font-medium text-amber-300">{formatCategoryLabel(a.category)}</span>
                {' '}is {a.overagePercent.toFixed(0)}% above your usual ${a.threeMonthAvg.toFixed(0)}/mo
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left">
          <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary">This week recap</p>
          <p className="mt-2 text-lg font-semibold text-content-primary">
            You spent ${weeklySpendingRecap.total.toFixed(0)} in the last 7 days.
          </p>
          <p className="mt-1 text-xs text-content-secondary">
            {weeklySpendingRecap.txCount} expense transactions
            {weeklyTopCategoryLabel ? ` • Top category: ${weeklyTopCategoryLabel}` : ''}.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left">
          <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary">Spending vs income</p>
          <p className="mt-2 text-lg font-semibold text-content-primary">
            {spendingShareOfIncome === null ? 'Add income to unlock this' : `${spendingShareOfIncome.toFixed(0)}% of monthly income`}
          </p>
          <p className="mt-1 text-xs text-content-secondary">Fixed bills, debt minimums, and subscriptions as share of income.</p>
          {spendingBenchmark && (
            <p className={`mt-1 text-xs font-medium flex items-center gap-1.5 ${spendingBenchmark.tone}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${spendingBenchmark.dotClass}`} aria-hidden="true" />
              {spendingBenchmark.label}
            </p>
          )}
          <p className="mt-1 text-[11px] text-content-tertiary">
            This represents your tracked spending as a % of your logged monthly income.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left">
          <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary">Bills due vs income</p>
          <p className="mt-2 text-lg font-semibold text-content-primary">
            ${next30DayBillsTotal.toFixed(0)} due in 30 days
          </p>
          <p className="mt-1 text-xs text-content-secondary">
            {next30DayBillsVsIncomePct === null
              ? 'Add income to compare this load.'
              : `${next30DayBillsVsIncomePct.toFixed(0)}% of your monthly income.`}
          </p>
        </div>
      </div>

      {/* 30-Day Cash Flow Forecast */}
      {cashFlowForecast.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-elevated p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-content-primary">30-Day Cash Flow Forecast</h3>
              <p className="mt-1 text-[11px] leading-snug text-content-secondary">
                <span className="font-semibold text-content-primary">Today</span>
                <span className="text-content-tertiary"> — start · </span>
                {cashFlowForecast[0]?.label}
              </p>
            </div>
            {(() => {
              const lowest = cashFlowForecast.reduce((min, d) => d.balance < min.balance ? d : min, cashFlowForecast[0]);
              return lowest.balance < 0 ? (
                <span className="shrink-0 text-xs text-amber-400 font-medium">⚠ Balance may dip on {lowest.label}</span>
              ) : null;
            })()}
          </div>
          <SafeResponsiveContainer width="100%" height={120}>
            <AreaChart data={cashFlowForecast} margin={{ top: 10, right: 8, left: 8, bottom: 6 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval={6}
                tickFormatter={(v) => String(v)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                {...rechartsTooltipStableProps}
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
                contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--surface-border)', borderRadius: '4px', fontSize: '11px' }}
              />
              {Math.min(...cashFlowForecast.map((d) => d.balance)) < 0 && (
                <ReferenceArea
                  y1={0}
                  y2={Math.min(...cashFlowForecast.map((d) => d.balance))}
                  fill="var(--color-error-highlight)"
                  fillOpacity={0.2}
                />
              )}
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
              <ReferenceLine
                x={cashFlowForecast[0]?.label}
                stroke="var(--content-tertiary)"
                strokeDasharray="4 3"
                strokeOpacity={0.85}
              />
              <Area type="monotone" dataKey="balance" name="Projected Balance" stroke="#6366f1" fill="url(#forecastGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </SafeResponsiveContainer>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-content-tertiary">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-px w-6 bg-[#6366f1]" aria-hidden />
              Projected balance
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-3 w-0 border-l border-dashed border-content-tertiary" aria-hidden />
              Today (chart)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-content-secondary">
            If current patterns continue, your projected balance could reach $
            {cashFlowForecast[cashFlowForecast.length - 1]?.balance.toFixed(0)} by {cashFlowForecast[cashFlowForecast.length - 1]?.label}.
          </p>
          <p className="mt-1 text-[11px] text-content-tertiary">
            Y-axis: projected balance (USD). X-axis dates are short month + day (e.g., Apr 18, Apr 25, May 2).
          </p>
        </div>
      )}

      <h2 className="section-label pl-1 mb-3">Core Financials</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Runway Metric Card */}
        <div className="bg-surface-raised border border-surface-border p-6 rounded-lg shadow-none md:flex md:flex-col md:justify-between">
          <div className="flex justify-between items-start mb-8">
            <div className="text-left w-full">
              <p className="metric-label mb-3">Operating Runway</p>
              <h2 className="text-5xl sm:text-6xl font-mono font-bold text-content-primary tracking-tighter tabular-nums leading-none data-numeric">
                <AnimatedValue value={survivalMonths} decimals={1} />
                <span className="text-2xl font-sans text-content-tertiary font-medium ml-3 uppercase tracking-wide">Months</span>
              </h2>
              {survivalMonths < 3 && (
                <p className="mt-4 text-sm text-content-secondary leading-relaxed max-w-md">
                  Add income or reduce expenses to extend your runway.{' '}
                  <TransitionLink
                    to="/dashboard#cash-flow"
                    className="text-content-primary font-medium underline underline-offset-2 hover:text-content-secondary"
                  >
                    View cash flow
                  </TransitionLink>
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 border-t border-surface-border pt-6 mt-4">
            <div className="text-left">
              <p className="metric-label mb-2">Liquid Cash</p>
              <p className="text-2xl font-mono text-brand-profit font-bold tabular-nums">${liquidCash.toLocaleString()}</p>
            </div>
            <div className="text-left">
              <p className="metric-label mb-2">Monthly Expenses</p>
              <p className="text-2xl font-mono text-content-primary font-bold tabular-nums">${Math.round(monthlyBurn).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Distributed 4-grid for standard numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-lg shadow-none text-left">
              <p className="metric-label mb-3">Net Worth</p>
              <p className={`text-2xl sm:text-4xl font-mono font-bold tabular-nums data-numeric ${netWorth < 0 ? 'text-rose-400' : 'text-content-primary'}`}>
                $<AnimatedValue value={netWorth} />
              </p>
              {netWorth < 0 && (
                <p className="mt-2 text-xs text-content-secondary leading-relaxed">
                  Net worth reflects assets minus debts — focus on cash flow and payoff plans to improve trajectory.{' '}
                  <TransitionLink to="/net-worth" className="text-content-primary underline underline-offset-2">
                    Explore projection
                  </TransitionLink>
                </p>
              )}
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-lg shadow-none text-left">
              <p className="metric-label mb-3">Total Assets</p>
              <p className="text-2xl sm:text-4xl font-mono text-content-primary font-bold tabular-nums data-numeric">$<AnimatedValue value={totalAssets} /></p>
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-lg shadow-none text-left">
              {taxReservePosition > 0 ? (
                <>
                  <p className="metric-label mb-3 flex items-center gap-2 text-brand-profit">
                    Tax Reserve <ShieldCheck className="w-3.5 h-3.5 text-brand-profit" />
                  </p>
                  <p className="text-2xl sm:text-4xl font-mono text-brand-profit font-bold tabular-nums data-numeric">
                    $<AnimatedValue value={taxReservePosition} />
                  </p>
                </>
              ) : taxReservePosition === 0 ? (
                <>
                  <p className="metric-label mb-3">Tax Reserve</p>
                  <p className="text-2xl sm:text-4xl font-mono text-content-primary font-bold tabular-nums data-numeric">$0</p>
                  <TransitionLink to="/taxes" className="mt-2 inline-flex text-xs text-content-secondary hover:text-content-primary">
                    Start saving for taxes →
                  </TransitionLink>
                </>
              ) : (
                <>
                  <p className="metric-label mb-3 text-rose-400">Tax Shortfall</p>
                  <p className="text-2xl sm:text-4xl font-mono text-rose-400 font-bold tabular-nums data-numeric">
                    $<AnimatedValue value={Math.abs(taxReservePosition)} />
                  </p>
                  <p className="mt-2 text-xs text-content-secondary">
                    You're ${Math.abs(taxReservePosition).toLocaleString()} below your estimated quarterly liability.
                  </p>
                </>
              )}
            </div>
            <div className="bg-surface-raised p-4 sm:p-6 border border-surface-border rounded-lg shadow-none text-left">
              <p className="metric-label mb-3">Monthly Surplus</p>
              <p
                className={`text-2xl sm:text-4xl font-mono font-bold tabular-nums data-numeric ${
                  cashFlow.surplus >= 0 ? 'text-brand-profit' : 'text-rose-400'
                }`}
              >
                {cashFlow.surplus >= 0 ? '+' : '−'}$
                <AnimatedValue value={Math.abs(cashFlow.surplus)} />
              </p>
              {cashFlow.surplus < 0 && (
                <p className="mt-2 text-xs text-content-secondary leading-relaxed">
                  You&apos;re spending more than income this month on paper — trim subscriptions or align bill due dates.{' '}
                  <TransitionLink to="/budgets" className="text-content-primary underline underline-offset-2">
                    Review budgets
                  </TransitionLink>
                </p>
              )}
            </div>
        </div>
      </div>
      {showLowRunwayCoach && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-content-tertiary mb-2">Your Next Best Move</p>
          <p className="text-sm text-content-secondary mb-3">
            Your runway is critically short. Focus on the highest-impact moves first:
          </p>
          <ol className="space-y-1.5 text-sm text-content-primary list-decimal pl-5">
            {nextBestMoveSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      </section>

      {/* 4. Active Intelligence Grid — only modules that have underlying data */}
      {!calmMode && smartAlertsVisibleCount > 0 && (
        <>
          <h2 className="section-label pl-1 mb-4">Smart Alerts & Active Monitoring</h2>
          <div
            className={
              smartAlertsVisibleCount === 1
                ? 'grid grid-cols-1 gap-6 max-w-xl'
                : smartAlertsVisibleCount === 2
                  ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                  : 'grid grid-cols-1 lg:grid-cols-3 gap-6'
            }
          >
            {showTaxDeductionCard && (
              <div className="bg-surface-raised rounded-lg p-6 border border-surface-border flex flex-col justify-between shadow-none group transition-all text-left">
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-lg flex items-center justify-center shrink-0 text-content-primary">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-2 text-[10px] font-sans uppercase tracking-wide text-content-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-profit" aria-hidden />
                      Active
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-content-primary mb-2">Tax Deduction Finder</h3>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Automatic extraction of valid deductions from freelancer platforms and records.
                  </p>
                </div>
                <div className="bg-surface-base border border-surface-border p-6 rounded-lg">
                  <p className="text-xs font-mono uppercase tracking-wider text-content-tertiary mb-2">Lifetime recovered</p>
                  <p className="text-4xl font-mono text-content-primary font-bold tabular-nums">${lifetimeTaxShield.toLocaleString()}</p>
                </div>
              </div>
            )}

            {showSpendingPulseCard && (
              <div
                className={`bg-surface-raised rounded-lg p-6 border transition-all text-left flex flex-col justify-between shadow-none ${
                  burnVelocity.isHighVelocity ? 'border-surface-border' : 'border-surface-border'
                }`}
              >
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className={`w-10 h-10 border rounded-lg flex items-center justify-center shrink-0 ${
                        burnVelocity.isHighVelocity
                          ? 'border-surface-border bg-surface-base text-content-primary'
                          : 'border-surface-border bg-surface-base text-content-tertiary'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-2 text-[10px] font-sans uppercase tracking-wide text-content-secondary">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          burnVelocity.isHighVelocity ? 'bg-brand-expense' : burnVelocity.isModerateVelocity ? 'bg-amber-500' : 'bg-brand-profit'
                        }`}
                        aria-hidden
                      />
                      {burnVelocity.isHighVelocity ? 'High' : burnVelocity.isModerateVelocity ? 'Moderate' : 'On Track'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-content-primary mb-2">Recent spending (72h)</h3>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Real-time monitoring of cash outflow velocity across all connected accounts.
                  </p>
                </div>
                <div>
                  <div className="flex items-baseline gap-3 mb-4">
                    <p className="text-4xl font-mono text-content-primary tabular-nums">${burnVelocity.totalSpent.toFixed(0)}</p>
                    <p className="text-[12px] font-mono text-content-tertiary uppercase tracking-wider">/ {burnVelocity.frequency} txs</p>
                  </div>
                  {burnVelocity.isHighVelocity && (
                    <p className="text-[11px] font-mono text-content-secondary bg-content-primary/[0.03] p-3 rounded-lg border border-surface-border">
                      Velocity Limit Exceeded
                    </p>
                  )}
                </div>
              </div>
            )}

            {showDebtAvalancheCard && avalancheTarget && (
              <div className="bg-surface-raised rounded-lg p-6 border border-surface-border flex flex-col justify-between shadow-none text-left group transition-all">
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 border border-surface-border bg-surface-base rounded-lg flex items-center justify-center shrink-0 text-content-tertiary">
                      <Flame className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-content-primary mb-2">Debt Avalanche Shield</h3>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    Mathematical priority on highest interest accounts to minimize capital waste.
                  </p>
                </div>

                <div>
                  <div className="mb-4">
                    <p className="text-xs font-mono text-brand-expense uppercase tracking-wider mb-2 truncate">
                      Prioritizing: {avalancheTarget.name}
                    </p>
                    <div className="flex justify-between items-baseline">
                      <span className="text-4xl font-mono text-content-primary tabular-nums">${avalancheTarget.remaining.toLocaleString()}</span>
                      <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{debtProgress.toFixed(0)}% Clear</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-surface-base border border-surface-border rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-content-primary transition-all duration-1000"
                      style={{ width: `${debtProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 5. Lower Content Panels */}
      <div className={`grid grid-cols-1 gap-6 ${hasLowerSidebar ? 'lg:grid-cols-3' : ''}`}>
        {/* Timeline Chart */}
        <div className={hasLowerSidebar ? 'lg:col-span-2' : ''}>
          <div className="bg-surface-raised rounded-lg border border-surface-border p-6 shadow-none">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-sans font-semibold text-content-primary tracking-tight">Cash Flow Trajectory</h3>
                <p className="text-xs font-sans text-content-secondary mt-1">Projected balances across all accounts</p>
              </div>
              <select
                value={trajectoryWindow}
                onChange={(e) => setTrajectoryWindow(e.target.value as '30' | '90')}
                className="h-10 rounded-lg border border-surface-border bg-surface-base px-3 text-sm font-medium text-content-secondary focus-app-field cursor-pointer"
              >
                <option value="30">Next 30 Days</option>
                <option value="90">Next 90 Days</option>
              </select>
            </div>
            
            <div className="h-[200px] sm:h-[280px] w-full min-h-[120px]">
              <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                <AreaChart data={cashFlowChartData} margin={{ top: 12, right: 12, left: 8, bottom: 12 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fafafa" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#fafafa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333333" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 11, fontFamily: 'sans-serif' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888888', fontSize: 11, fontFamily: 'sans-serif' }} tickFormatter={(val) => `$${Number(val ?? 0) / 1000}k`} />
                  <Tooltip 
                    {...rechartsTooltipStableProps}
                    contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '8px', border: '1px solid #333333', color: '#fafafa', fontFamily: 'sans-serif', fontSize: '13px' }}
                    itemStyle={{ color: '#fafafa' }}
                    formatter={(val) => [`$${Number(val ?? 0).toLocaleString()}`, 'Projected Balance']}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#fafafa" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
              </SafeResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar: only when there is something to show */}
        {hasLowerSidebar && (
          <div className="space-y-6">
            {hasBillsSidebar && (
              <div className="bg-surface-raised rounded-lg border border-surface-border shadow-none flex flex-col h-fit max-h-[350px]">
                <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-transparent">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-content-secondary">Upcoming Bills</h3>
                  <TransitionLink to="/bills" className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-content-primary hover:bg-content-primary/[0.04] hover:text-content-secondary transition-colors focus-app">
                    See all
                  </TransitionLink>
                </div>

                <div className="overflow-y-auto focus-app">
                  <ul>
                    {[...overdueBills.slice(0, 2), ...upcomingBills.slice(0, 4)].map((bill) => (
                      <li
                        key={bill.id}
                        className={`px-6 py-4 transition-colors flex justify-between items-center group cursor-default border-b border-transparent last:border-0 ${
                          bill.isOverdue ? 'bg-rose-500/10 hover:bg-rose-500/15' : 'hover:bg-content-primary/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-xs font-mono text-content-tertiary w-10 text-center uppercase">
                            {bill?.dueDate?.includes('-') ? (
                              <>
                                {bill.dueDate.split('-')[2]}
                                <br />
                                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][
                                  parseInt(bill.dueDate.split('-')[1], 10) - 1
                                ] || '---'}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-sans font-medium text-content-primary">{bill.biller}</p>
                            {bill.isOverdue ? (
                              <p className={`text-[11px] font-medium ${Math.abs(bill.diffDays) <= 7 ? 'text-amber-300' : 'text-rose-400'}`}>
                                ⚠️ OVERDUE — {Math.abs(bill.diffDays)} day{Math.abs(bill.diffDays) === 1 ? '' : 's'}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-sm font-mono text-content-secondary font-medium tabular-nums">${bill.amount.toFixed(2)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {hasCitationsSidebar && (
              <div className="bg-surface-raised rounded-lg border border-surface-border shadow-none flex flex-col h-fit">
                <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-transparent">
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-widest text-content-secondary">Citations & Tickets</h3>
                </div>
                <div className="p-0 focus-app">
                  <ul>
                    {openCitations.map((citation) => (
                      <li
                        key={citation.id}
                        className={`px-6 py-4 transition-colors border-b border-transparent last:border-0 ${
                          citation.daysLeft < 0
                            ? Math.abs(citation.daysLeft) >= 8
                              ? 'bg-rose-500/12 hover:bg-rose-500/15'
                              : 'bg-amber-500/10 hover:bg-amber-500/12'
                            : 'hover:bg-content-primary/[0.03]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded bg-surface-base border flex flex-col justify-center items-center shrink-0 ${
                                citation.daysLeft < 0
                                  ? Math.abs(citation.daysLeft) >= 8
                                    ? 'text-rose-400 border-rose-500/30'
                                    : 'text-amber-300 border-amber-500/30'
                                  : citation.daysLeft <= 7
                                    ? 'text-rose-400 border-rose-500/30'
                                    : 'text-content-tertiary border-surface-border'
                              }`}
                            >
                              <span className="text-xs font-bold font-mono leading-none">{Math.abs(citation.daysLeft)}</span>
                              <span className="text-[11px] font-sans font-medium text-content-tertiary">
                                {citation.daysLeft < 0 ? 'Late' : 'Days'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-sans font-medium text-content-primary">{citation.type}</p>
                              <p className="text-xs font-sans text-content-tertiary">{citation.jurisdiction}</p>
                              {citation.daysLeft < 0 ? (
                                <p className={`mt-1 text-[11px] font-semibold ${Math.abs(citation.daysLeft) >= 8 ? 'text-rose-400' : 'text-amber-300'}`}>
                                  ⚠️ OVERDUE — {Math.abs(citation.daysLeft)} day{Math.abs(citation.daysLeft) === 1 ? '' : 's'}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <p className="text-sm font-mono font-bold text-content-secondary tabular-nums">${citation.amount.toFixed(2)}</p>
                        </div>
                        {citation.daysLeft < 0 && (
                          <p className="mb-3 text-[11px] text-content-secondary leading-relaxed">
                            {citation.jurisdiction.toLowerCase().includes('rhode island')
                              ? 'Rhode Island toll violations may accrue additional penalties after 30 days. Resolve now to avoid escalation.'
                              : 'This overdue ticket may accrue additional penalties if unresolved. Resolve now to avoid escalation.'}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            // Fix: Defer non-critical state updates with startTransition for better INP
                            startTransition(() => {
                              setSelectedCitation(citation);
                              setIsCitationModalOpen(true);
                            });
                          }}
                          className={`inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-app ${
                            citation.daysLeft < 0
                              ? Math.abs(citation.daysLeft) >= 8
                                ? 'bg-rose-500 text-white hover:bg-rose-400'
                                : 'bg-amber-500 text-surface-base hover:bg-amber-400'
                              : citation.daysLeft <= 7
                                ? 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover'
                                : 'bg-transparent border border-surface-border hover:bg-content-primary/[0.04] text-content-primary'
                          }`}
                        >
                          {citation.daysLeft < 0 ? 'Resolve Now →' : 'Resolve Ticket'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

       {/* Citation Resolution Modal */}
       <Dialog open={isCitationModalOpen} onClose={() => setIsCitationModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm w-full rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.55)] bg-surface-elevated border border-surface-border overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-border flex justify-between items-center bg-surface-raised">
              <Dialog.Title className="text-sm font-sans font-semibold text-content-primary">
                Ticket Details
              </Dialog.Title>
              <button 
                onClick={() => setIsCitationModalOpen(false)} 
                className="text-content-tertiary hover:text-content-primary transition-colors focus-app rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedCitation && (
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-sans font-medium text-content-primary mb-1">{selectedCitation.type}</h4>
                  <p className="text-sm text-content-tertiary">{selectedCitation.jurisdiction}</p>
                  {selectedCitation.daysLeft <= 7 && (
                    <p className="text-xs font-medium text-rose-400 mt-2 bg-rose-500/10 px-2 py-1 rounded inline-block">
                      {selectedCitation.daysLeft < 0
                        ? `Overdue by ${Math.abs(selectedCitation.daysLeft)} days.`
                        : `Due in ${selectedCitation.daysLeft} days.`}{' '}
                      ${selectedCitation.penaltyFee} penalty fee approaching.
                    </p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Citation Number</label>
                    <div className="flex">
                      <input 
                        type="text" 
                        readOnly 
                        value={selectedCitation.citationNumber} 
                        className="bg-surface-base border border-surface-border rounded-l px-3 py-2 text-sm font-mono text-content-secondary w-full focus-app-field" 
                      />
                      <button 
                        onClick={async () => { 
                          // Fix: Yield to main thread before clipboard operation to avoid blocking paint
                          const sched = (window as any).scheduler;
                          if (sched && typeof sched.yield === 'function') {
                            await sched.yield();
                          }
                          navigator.clipboard.writeText(selectedCitation.citationNumber)
                            .then(() => toast.success('Copied to clipboard'))
                            .catch(() => toast.error('Failed to copy')); 
                        }} 
                        className="inline-flex min-h-10 items-center justify-center bg-surface-border hover:bg-surface-elevated text-content-secondary px-3 border border-l-0 border-surface-border rounded-r transition-colors focus-app z-10"
                        title="Copy"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Online Payment Portal</label>
                    {(() => {
                      const safePaymentUrl = sanitizeUrl(selectedCitation.paymentUrl);
                      return safePaymentUrl ? (
                      <a
                        href={safePaymentUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="flex items-center justify-center gap-2 w-full bg-brand-cta text-surface-base hover:bg-brand-cta-hover rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-app"
                      >
                        Open Payment Portal <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="flex items-center justify-center gap-2 w-full bg-surface-elevated text-content-tertiary rounded px-4 py-2.5 text-sm font-medium cursor-not-allowed">
                        No Payment Link Available
                      </span>
                    );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      </div>
    </AppPageShell>
  );
}
