/**
 * Bills & Debts — Total Bills & Debt record
 * Avalanche/Snowball payoff algorithm with projected payoff dates and interest savings.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Flame,
  Calculator, ChevronDown, ChevronUp, Plus, Minus, Pencil, CalendarDays, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { Dialog } from '@headlessui/react';
import {
  buildBillNegotiationSuggestions,
  generateAmortizationSchedule,
  groupOutflowsByHorizon,
} from '../lib/finance';
import { TransitionLink } from '../components/TransitionLink';
import { rechartsTooltipStableProps } from '../lib/rechartsTooltip';
import { SafeResponsiveContainer } from '../components/charts/SafeResponsiveContainer';
import type { Bill, Debt } from '../store/useStore';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../components/FullSuiteGate';
import { formatCategoryLabel } from '../lib/categoryDisplay';
import { cn } from '../lib/utils';
import { canUseDebtActions, TRACKER_FREE_TIER_SUMMARY } from '../lib/trackerTier';
import { getCustomIcon } from '../lib/customIcons';

type ObligationType = 'recurring' | 'debt' | 'ambush';
type Strategy = 'avalanche' | 'snowball';
const RecurringIcon = getCustomIcon('recurring');
const DebtIcon = getCustomIcon('debt');
const TicketIcon = getCustomIcon('ticket');
const PaymentsIcon = getCustomIcon('payments');
const PlanningIcon = getCustomIcon('planning');
const CalendarIcon = getCustomIcon('planning');
const ChartIcon = getCustomIcon('payments');

interface Obligation {
  id: string;
  name: string;
  type: ObligationType;
  subType: string;
  /** ISO date for sorting; far-future sentinel when no payment due (debts). */
  dueDate: string;
  /** Human-readable due column (date or "No due date"). */
  dueLabel: string;
  amount: number;
  icon: React.ElementType;
  status?: 'active' | 'resolved';
}



type FilterTab = 'all' | 'recurring' | 'debt' | 'ambush';

// Avalanche / Snowball payoff calculator
function calcPayoff(debts: { remaining: number; apr: number; minPayment: number; name: string }[], extraMonthly: number, strategy: Strategy) {
  if (!debts.length) return { months: 0, totalInterest: 0, minOnlyInterest: 0, order: [] as string[] };

  let remaining = debts.map(d => ({ ...d }));
  // Sort strategy
  if (strategy === 'avalanche') remaining.sort((a, b) => b.apr - a.apr);
  else remaining.sort((a, b) => a.remaining - b.remaining);

  const order = remaining.map(d => d.name);
  let months = 0;
  let totalInterest = 0;

  while (remaining.some(d => d.remaining > 0) && months < 600) {
    months++;
    let extra = extraMonthly;

    // Pay minimums on all, calculate interest
    remaining.forEach(d => {
      if (d.remaining <= 0) return;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.remaining * monthlyRate;
      totalInterest += interest;
      d.remaining = Math.max(0, d.remaining + interest - d.minPayment);
    });

    // Apply extra to first non-zero in priority order
    for (const d of remaining) {
      if (d.remaining > 0 && extra > 0) {
        const payment = Math.min(extra, d.remaining);
        d.remaining -= payment;
        extra -= payment;
        break;
      }
    }
  }

  // Min-only interest (no extra)
  let minOnlyInterest = 0;
  let minRemaining = debts.map(d => ({ ...d }));
  let minMonths = 0;
  while (minRemaining.some(d => d.remaining > 0) && minMonths < 600) {
    minMonths++;
    minRemaining.forEach(d => {
      if (d.remaining <= 0) return;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.remaining * monthlyRate;
      minOnlyInterest += interest;
      d.remaining = Math.max(0, d.remaining + interest - d.minPayment);
    });
  }

  return { months, totalInterest, minOnlyInterest, order };
}

function monthsToDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

export default function Obligations() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bills, debts, citations, subscriptions, transactions, assets, resolveCitation, openQuickAdd, editBill, editDebt, markBillPaid } = useStore(
    useShallow((s) => ({
      bills: s.bills,
      debts: s.debts,
      citations: s.citations,
      subscriptions: s.subscriptions,
      transactions: s.transactions,
      assets: s.assets,
      resolveCitation: s.resolveCitation,
      openQuickAdd: s.openQuickAdd,
      editBill: s.editBill,
      editDebt: s.editDebt,
      markBillPaid: s.markBillPaid,
    }))
  );
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    const param = new URLSearchParams(window.location.search).get('tab');
    return (param === 'ambush' || param === 'recurring' || param === 'debt') ? param : 'all';
  });

  useEffect(() => {
    const param = searchParams.get('tab');
    const next: FilterTab =
      param === 'ambush' || param === 'recurring' || param === 'debt' ? param : 'all';
    setActiveTab(next);
  }, [searchParams]);

  const selectTab = (key: FilterTab) => {
    setActiveTab(key);
    if (key === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: key }, { replace: true });
    }
  };
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [editBillRow, setEditBillRow] = useState<Bill | null>(null);
  const [editDebtRow, setEditDebtRow] = useState<Debt | null>(null);
  const { hasFullSuite } = useFullSuiteAccess();
  const canUseDebt = canUseDebtActions(hasFullSuite);

  useEffect(() => {
    if (location.hash === '#due-soon') {
      requestAnimationFrame(() => {
        document.getElementById('due-soon')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  /** Stable anchor for synthetic due dates (set once per mount). */
  const [scheduleBaseMs] = useState(() => Date.now());
  const [obligationNowMs] = useState(() => Date.now());

  const allObligations: Obligation[] = useMemo(() => {
    const recurringObligations: Obligation[] = bills.map(b => ({
      id: b.id,
      name: b.biller,
      type: 'recurring' as ObligationType,
      subType: b.frequency === 'Monthly' ? 'Fixed Bill' : `${b.frequency} Bill`,
      dueDate: b.dueDate,
      dueLabel: b.dueDate,
      amount: b.amount,
      icon: RecurringIcon,
    }));
    return [
      ...recurringObligations,
      ...debts.map(d => {
        const pdd = d.paymentDueDate?.trim() || null;
        const sortDue = pdd || '9999-12-31';
        return {
          id: d.id,
          name: d.name,
          type: 'debt' as ObligationType,
          subType: d.type,
          dueDate: sortDue,
          dueLabel: pdd ?? 'No due date',
          amount: d.remaining,
          icon: DebtIcon,
        };
      }),
      ...citations.filter(c => c.status === 'open').map(c => ({
        id: c.id,
        name: `${c.type} — ${c.jurisdiction}`,
        type: 'ambush' as ObligationType,
        subType: 'Citation',
        dueDate: new Date(scheduleBaseMs + c.daysLeft * 86400000).toISOString().split('T')[0],
        dueLabel: new Date(scheduleBaseMs + c.daysLeft * 86400000).toISOString().split('T')[0],
        amount: c.amount,
        icon: TicketIcon,
      })),
    ];
  }, [bills, debts, citations, scheduleBaseMs]);

  const horizonBuckets = useMemo(
    () =>
      groupOutflowsByHorizon({
        bills: bills || [],
        subscriptions: subscriptions || [],
        debts: debts || [],
        citations: citations || [],
        scheduleBaseMs,
      }),
    [bills, subscriptions, debts, citations, scheduleBaseMs],
  );

  const horizonTotals = useMemo(() => {
    const sum = (items: { amount: number }[]) => items.reduce((s, i) => s + (i.amount || 0), 0);
    return {
      '0-30': sum(horizonBuckets['0-30']),
      '31-60': sum(horizonBuckets['31-60']),
      '61-90': sum(horizonBuckets['61-90']),
    };
  }, [horizonBuckets]);

  const filteredObligations = allObligations
    .filter(ob => activeTab === 'all' || ob.type === activeTab)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const totalMonthlyBurn = allObligations.filter(o => o.type === 'recurring').reduce((sum, o) => sum + o.amount, 0);
  const activePrincipal = debts.reduce((sum, d) => sum + d.remaining, 0);
  const liquidCash = useMemo(
    () =>
      (assets || [])
        .filter((a) => {
          const t = (a.type || '').toLowerCase();
          return t.includes('cash') || t.includes('checking');
        })
        .reduce((sum, a) => sum + (a.value || 0), 0),
    [assets],
  );

  const weekAheadDueTotal = useMemo(() => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const dueBills = (bills || []).filter((b) => {
      if (b.status === 'paid' || !b.dueDate) return false;
      const dueMs = new Date(b.dueDate).getTime();
      const delta = dueMs - obligationNowMs;
      return delta >= 0 && delta <= weekMs;
    });
    return dueBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [bills, obligationNowMs]);

  const isLowBalanceWeekRisk = liquidCash < weekAheadDueTotal;

  const billAmountChanges = useMemo(() => {
    const changes = new Map<string, { previous: number; current: number; pct: number }>();
    for (const bill of bills) {
      const matches = (transactions || [])
        .filter((tx) => tx.type === 'expense')
        .filter((tx) => {
          const txName = tx.name.toLowerCase();
          const biller = bill.biller.toLowerCase();
          return txName.includes(biller) || biller.includes(txName);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (matches.length < 2) continue;
      const current = matches[matches.length - 1]?.amount ?? 0;
      const previous = matches[matches.length - 2]?.amount ?? 0;
      if (previous <= 0) continue;
      const pct = ((current - previous) / previous) * 100;
      if (pct < 5 || current <= previous) continue;
      changes.set(bill.id, { previous, current, pct });
    }
    return changes;
  }, [bills, transactions]);
  const billNegotiationSuggestions = useMemo(
    () =>
      buildBillNegotiationSuggestions({
        bills: bills.map((b) => ({
          id: b.id,
          biller: b.biller,
          category: b.category,
          amount: b.amount,
          frequency: b.frequency,
          status: b.status,
        })),
      }),
    [bills],
  );

  const today = new Date();
  const urgentCitations = citations.filter(c => c.status === 'open' && c.daysLeft <= 7);
  const urgentTotal = urgentCitations.reduce((sum, c) => sum + c.amount, 0);

  // Debt Payoff Engine calculation
  const payoffResult = useMemo(() => calcPayoff(
    debts.map(d => ({ remaining: d.remaining, apr: d.apr, minPayment: d.minPayment, name: d.name })),
    extraPayment,
    strategy
  ), [debts, extraPayment, strategy]);

  const payoffIfExtra50 = useMemo(
    () =>
      calcPayoff(
        debts.map((d) => ({ remaining: d.remaining, apr: d.apr, minPayment: d.minPayment, name: d.name })),
        extraPayment + 50,
        strategy,
      ),
    [debts, extraPayment, strategy],
  );
  const monthsSavedBy50 = Math.max(0, payoffResult.months - payoffIfExtra50.months);

  const interestSaved = Math.max(0, payoffResult.minOnlyInterest - payoffResult.totalInterest);
  const overallDebtProgress = useMemo(() => {
    const totalPaid = debts.reduce((sum, d) => sum + (d.paid || 0), 0);
    const totalRemaining = debts.reduce((sum, d) => sum + (d.remaining || 0), 0);
    const denom = totalPaid + totalRemaining;
    return denom > 0 ? (totalPaid / denom) * 100 : 0;
  }, [debts]);
  const debtMilestones = [25, 50, 75, 100];
  const unlockedMilestone = debtMilestones.filter((m) => overallDebtProgress >= m).at(-1) ?? 0;
  const nextMilestone = debtMilestones.find((m) => m > overallDebtProgress) ?? null;
  const paymentHistoryRows = useMemo(() => {
    const knownNames = new Set([
      ...bills.map((b) => b.biller.toLowerCase()),
      ...subscriptions.map((s) => s.name.toLowerCase()),
      ...debts.map((d) => d.name.toLowerCase()),
    ]);
    return (transactions || [])
      .filter((tx) => tx.type === 'expense')
      .filter((tx) => {
        const name = tx.name.toLowerCase();
        for (const known of knownNames) {
          if (name.includes(known) || known.includes(name)) return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }, [bills, subscriptions, debts, transactions]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allObligations.length },
    { key: 'recurring', label: 'Regular Bills', count: allObligations.filter(o => o.type === 'recurring').length },
    { key: 'debt', label: 'Loans & Credit', count: allObligations.filter(o => o.type === 'debt').length },
    { key: 'ambush', label: 'Tickets & Fines', count: allObligations.filter(o => o.type === 'ambush').length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Bills & debts</h1>
          <p className="text-sm text-content-tertiary">Everything you owe, in one place.</p>
          {!hasFullSuite && (
            <p className="mt-2 text-xs text-content-secondary max-w-xl leading-relaxed">
              {TRACKER_FREE_TIER_SUMMARY}
            </p>
          )}
        </div>
        <button 
          type="button"
          onClick={() => {
            if (activeTab === 'debt' && !canUseDebt) {
              toast.error('Loans and credit cards are a Full Suite feature. Upgrade to add debt.');
              return;
            }
            openQuickAdd(activeTab === 'ambush' ? 'citation' : 'obligation');
          }}
          aria-disabled={activeTab === 'debt' && !canUseDebt}
          title={activeTab === 'debt' && !canUseDebt ? 'Full Suite required to add debt' : undefined}
          className={`px-4 py-2.5 rounded-lg text-sm font-sans font-semibold shadow-sm transition-all flex items-center gap-2 self-start btn-tactile ${
            activeTab === 'debt' && !canUseDebt
              ? 'bg-surface-elevated border border-surface-border text-content-tertiary'
              : 'bg-brand-cta hover:bg-brand-cta-hover text-surface-base'
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          {activeTab === 'ambush' ? 'Add ticket or fine' : activeTab === 'debt' ? (hasFullSuite ? 'Add debt' : 'Add debt (Full Suite)') : 'Add bill'}
        </button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-lg">
          <div className="flex items-center gap-2 text-content-tertiary mb-3">
            <RecurringIcon className="w-3.5 h-3.5" />
            <span className="metric-label normal-case text-[11px]">Monthly payments</span>
          </div>
          <p className="text-2xl font-mono text-red-400 font-bold">${totalMonthlyBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-lg">
          <div className="flex items-center gap-2 text-content-tertiary mb-3">
            <DebtIcon className="w-3.5 h-3.5" />
            <span className="metric-label normal-case text-[11px]">Total debt</span>
          </div>
          <p className="text-2xl font-mono text-amber-400 font-bold">${activePrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`bg-surface-elevated border p-5 rounded-lg relative overflow-hidden ${urgentTotal > 0 ? 'border-rose-500/50' : 'border-surface-border'}`}>
          {urgentTotal > 0 && <div className="absolute inset-0 bg-rose-500/3" />}
          <div className="flex items-center gap-2 text-content-tertiary mb-3 relative z-10">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="metric-label normal-case text-[11px]">Urgent tickets</span>
            {urgentCitations.length > 0 && <span className="text-[9px] font-mono font-bold text-rose-400 border border-rose-500/50 px-1 rounded-lg ml-auto">{urgentCitations.length} DUE</span>}
          </div>
          <p className={`text-2xl font-mono font-bold relative z-10 ${urgentTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${urgentTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {isLowBalanceWeekRisk && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm font-medium text-rose-200">
            Low-balance warning: ${liquidCash.toFixed(0)} cash vs ${weekAheadDueTotal.toFixed(0)} due in the next 7 days.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {hasFullSuite ? (
              <>
                <TransitionLink to="/dashboard#cash-flow" className="text-content-primary hover:text-content-secondary underline underline-offset-2">
                  Open safe-to-spend
                </TransitionLink>
                <TransitionLink to="/calendar#calendar-view" className="text-content-primary hover:text-content-secondary underline underline-offset-2">
                  Open due-date calendar
                </TransitionLink>
              </>
            ) : (
              <span className="text-content-secondary">
                Tracker tip: pay urgent items first and keep 7-day due totals below your available cash.
              </span>
            )}
          </div>
        </div>
      )}

      {billAmountChanges.size > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">
            {billAmountChanges.size} bill {billAmountChanges.size === 1 ? 'has' : 'have'} increased based on recent charges.
          </p>
          <p className="mt-1 text-xs text-content-secondary">
            Review these line items below before the next due date.
          </p>
        </div>
      )}

      {billNegotiationSuggestions.length > 0 && (
        <CollapsibleModule title="Bill Negotiation Suggestions" icon={PlanningIcon} defaultOpen={false}>
          <div className="space-y-3">
            {billNegotiationSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-lg border border-surface-border bg-surface-base p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-content-primary">{suggestion.provider}</p>
                    <p className="mt-1 text-xs text-content-secondary">
                      Current spend is about ${suggestion.currentMonthlyCost.toFixed(0)}/mo in{' '}
                      {formatCategoryLabel(suggestion.category)}.
                    </p>
                    <p className="mt-1 text-xs text-content-tertiary">
                      Users who renegotiate similar bills often save around ${suggestion.benchmarkMonthlySavings.toFixed(0)}/mo.
                    </p>
                    <p className="mt-1 text-xs text-content-tertiary">{suggestion.action}</p>
                  </div>
                  <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-mono text-emerald-300">
                    Est. save ${suggestion.estimatedMonthlySavings.toFixed(0)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleModule>
      )}

      <CollapsibleModule
        title="Upcoming cash out (30 / 60 / 90 days)"
        icon={CalendarIcon}
        defaultOpen={false}
        extraHeader={
          <TransitionLink
            to="/calendar#calendar-view"
            className="text-[10px] font-sans font-medium text-content-primary hover:text-content-secondary border border-content-primary/20 rounded-lg px-2 py-0.5"
          >
            Month view →
          </TransitionLink>
        }
      >
        <div className="p-0 space-y-4">
          <p className="text-xs text-content-tertiary leading-relaxed">
            Totals include unpaid bills, active subscriptions, minimum debt payments with a due date, and open fines — same buckets as
            the list below, grouped by days from today. The{' '}
            <TransitionLink to="/calendar#calendar-view" className="text-content-primary hover:underline">
              Calendar
            </TransitionLink>{' '}
            shows the same items on specific dates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                { key: '0-30' as const, label: 'Next 30 days' },
                { key: '31-60' as const, label: '31–60 days' },
                { key: '61-90' as const, label: '61–90 days' },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="rounded-lg border border-surface-border bg-surface-base p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-2">{label}</p>
                <p className="text-xl font-mono font-bold text-content-primary tabular-nums">
                  ${horizonTotals[key].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] font-mono text-content-muted mt-1">{horizonBuckets[key].length} line items</p>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleModule>

      {/* Debt Payoff Engine Panel */}
      {debts.length > 0 && hasFullSuite && (
        <CollapsibleModule 
          title="Debt Payoff Plan" 
          icon={ChartIcon}
          extraHeader={
            <span className="text-xs font-sans text-content-tertiary bg-surface-base border border-surface-border px-2 py-0.5 rounded-lg">
              Payoff {payoffResult.months > 0 ? monthsToDate(payoffResult.months) : '—'}
            </span>
          }
        >
          <div className="p-0">
            <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-sm font-medium text-emerald-200">
                Debt progress milestone: {unlockedMilestone > 0 ? `${unlockedMilestone}% unlocked` : 'Starting strong'}.
              </p>
              <p className="mt-1 text-xs text-content-secondary">
                {nextMilestone
                  ? `${(nextMilestone - overallDebtProgress).toFixed(1)}% to your next milestone (${nextMilestone}%).`
                  : 'You reached 100% — debt-free milestone complete. Great work.'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex bg-surface-base border border-surface-border rounded-lg p-1">
                {(['avalanche', 'snowball'] as Strategy[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors uppercase tracking-wider ${
                      strategy === s ? 'bg-brand-cta text-surface-base' : 'text-content-tertiary hover:text-content-secondary'
                    }`}
                  >
                    {s === 'avalanche' ? '⚡ Highest Interest First' : '❄️ Smallest Debt First'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-surface-base border border-surface-border rounded-lg px-3 py-1.5">
                <Calculator className="w-3.5 h-3.5 text-content-tertiary" />
                <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Extra per month:</span>
                <button type="button" aria-label="Decrease extra monthly payment by 100" onClick={() => setExtraPayment(e => Math.max(0, e - 100))} className="focus-app rounded text-content-tertiary hover:text-content-primary"><Minus className="w-3 h-3" aria-hidden /></button>
                <span className="text-sm font-mono text-content-primary w-16 text-center">${extraPayment}</span>
                <button type="button" aria-label="Increase extra monthly payment by 100" onClick={() => setExtraPayment(e => e + 100)} className="focus-app rounded text-content-tertiary hover:text-content-primary"><Plus className="w-3 h-3" aria-hidden /></button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-elevated border border-surface-border rounded-lg p-4">
                <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider mb-1">Debt-Free Date</p>
                <p className="text-lg font-mono font-bold text-content-primary">{payoffResult.months > 0 ? monthsToDate(payoffResult.months) : '—'}</p>
                <p className="text-[10px] font-mono text-content-muted">{payoffResult.months} months</p>
                {payoffResult.months > 12 && monthsSavedBy50 > 0 && (
                  <p className="mt-2 text-[11px] text-content-secondary leading-relaxed">
                    Add $50/month extra to cut{' '}
                    <span className="font-mono font-medium text-content-primary">{monthsSavedBy50}</span> months off your payoff
                    timeline — adjust &quot;Extra per month&quot; above to model it.{' '}
                    <TransitionLink to="/dashboard#cash-flow" className="text-content-primary underline underline-offset-2">
                      Tighten cash flow
                    </TransitionLink>
                  </p>
                )}
              </div>
              <div className="bg-surface-elevated border border-surface-border rounded-lg p-4">
                <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider mb-1">Interest Paid</p>
                <p className="text-lg font-mono font-bold text-red-400">${payoffResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                {payoffResult.totalInterest > 10_000 && (
                  <p className="mt-2 text-[11px] text-content-secondary leading-relaxed">
                    Interest is sensitive to APR and payoff order — even small extra payments compound. Use the slider above or{' '}
                    <TransitionLink to="/analytics" className="text-content-primary underline underline-offset-2">
                      review spending trends
                    </TransitionLink>
                    .
                  </p>
                )}
              </div>
              <div className="bg-surface-elevated border border-emerald-500/20 rounded-lg p-4">
                <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider mb-1">Interest Saved</p>
                <p className="text-lg font-mono font-bold text-emerald-400">${interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] font-mono text-content-muted">vs. minimum payments only</p>
              </div>
            </div>

            {/* Per-debt timeline bars */}
            <div className="space-y-4">
              <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Payoff Order — {strategy === 'avalanche' ? 'Highest Interest First' : 'Smallest Balance First'}</p>
              {[...debts]
                .sort((a, b) => strategy === 'avalanche' ? b.apr - a.apr : a.remaining - b.remaining)
                .map((d, i) => {
                  const paid = d.paid ?? 0;
                  const rem = d.remaining ?? 0;
                  const denom = paid + rem;
                  const pct = denom > 0 ? Math.round((paid / denom) * 100) : 0;
                  const isExpanded = expandedDebtId === d.id;
                  return (
                    <div key={d.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-content-primary/[0.08] border border-surface-border text-content-primary text-[10px] font-mono font-bold flex items-center justify-center rounded-lg">{i + 1}</span>
                          <span className="text-sm text-content-primary">{d.name}</span>
                          <span className="text-[10px] font-mono text-content-muted border border-surface-border px-1.5 py-0.5 rounded-lg">{d.apr}% interest rate</span>
                        </div>
                        <span className="text-xs font-mono text-content-tertiary">${d.remaining.toLocaleString()} left</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-border rounded-none overflow-hidden">
                        <div className="h-full bg-brand-cta transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-content-muted mt-0.5">
                        <span>{pct}% paid</span>
                        <span>Min: ${d.minPayment}/mo</span>
                      </div>
                      <div className="mt-1">
                        <button
                          onClick={() => setExpandedDebtId(isExpanded ? null : d.id)}
                          className="text-[10px] font-mono text-content-muted hover:text-content-primary transition-colors uppercase tracking-widest flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? 'Hide Schedule' : 'Show 12-Month Schedule'}
                        </button>
                      </div>
                      {isExpanded && (() => {
                        const schedule = generateAmortizationSchedule(d).slice(0, 12);
                        const chartData = schedule.map(row => ({
                          name: `M${row.month}`,
                          principal: row.principal,
                          interest: row.interest,
                        }));
                        const totalInterest12 = schedule.reduce((s, r) => s + r.interest, 0);
                        return (
                          <div className="mt-3 border-t border-surface-border pt-3">
                            <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest mb-2">
                              Principal vs. Interest — First 12 Months
                            </p>
                            <div className="h-[120px] w-full min-h-0 overflow-visible relative isolate">
                              <SafeResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
                                <BarChart data={chartData} margin={{ top: 6, right: 4, left: 4, bottom: 10 }} barSize={8}>
                                  <XAxis dataKey="name" tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                  <Tooltip
                                    {...rechartsTooltipStableProps}
                                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}
                                    formatter={(value, name) => [`$${Number(value ?? 0).toFixed(2)}`, name === 'principal' ? 'Principal' : 'Interest']}
                                  />
                                  <Bar dataKey="principal" fill="#d4d4d4" stackId="a" />
                                  <Bar dataKey="interest" fill="#EF4444" stackId="a" />
                                </BarChart>
                              </SafeResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-2">
                              <span className="text-[10px] font-mono text-content-primary">■ Principal</span>
                              <span className="text-[10px] font-mono text-red-400">■ Interest</span>
                              <span className="text-[10px] font-mono text-content-muted ml-auto">
                                12-mo interest: ${totalInterest12.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
            </div>
          </div>
        </CollapsibleModule>
      )}
      {debts.length > 0 && !hasFullSuite && (
        <FullSuiteGateCard
          title="Debt Payoff Plan is available on Full Suite"
          description="Unlock Avalanche/Snowball strategy modeling, debt-free projections, and interest-saved analytics."
          compact
        />
      )}

      <CollapsibleModule title="Debt Learning Lab" icon={PlanningIcon} defaultOpen={false}>
        <div className="space-y-3 text-sm text-content-secondary">
          <p>
            <span className="font-medium text-content-primary">APR:</span> Annual Percentage Rate is the cost of borrowing. Higher APR
            debts should usually be prioritized first to reduce total interest.
          </p>
          <p>
            <span className="font-medium text-content-primary">Minimum payment trap:</span> Paying only the minimum can stretch payoff for
            years and increase total interest paid.
          </p>
          <p>
            <span className="font-medium text-content-primary">Action:</span> add a small extra monthly payment in the Debt Payoff Plan to
            bring your debt-free date closer and reduce lifetime interest.
          </p>
        </div>
      </CollapsibleModule>

      {/* Tabs */}
      <div className="border-b border-surface-border">
        <div className="flex space-x-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                activeTab === tab.key ? 'text-content-primary' : 'text-content-tertiary hover:text-content-secondary'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-lg ${
                activeTab === tab.key ? 'bg-content-primary/10 text-content-primary' : 'bg-surface-elevated text-content-muted'
              }`}>{tab.count}</span>
              {activeTab === tab.key && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-cta" />}
            </button>
          ))}
        </div>
      </div>

      <div id="due-soon" className="scroll-mt-24">
      <CollapsibleModule title="Scheduled Payments" icon={PaymentsIcon}>
        <div className="overflow-x-auto -mx-6 -my-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised">
                <th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-[10px] font-mono text-content-tertiary uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredObligations.map(ob => {
                const Icon = ob.icon;
                const isDebtNoDue = ob.type === 'debt' && ob.dueLabel === 'No due date';
                const dueNorm = new Date(ob.dueDate.includes('T') ? ob.dueDate : `${ob.dueDate}T12:00:00`);
                const todayNorm = new Date(today);
                todayNorm.setHours(0, 0, 0, 0);
                dueNorm.setHours(0, 0, 0, 0);
                const isPastDue = !isDebtNoDue && !Number.isNaN(dueNorm.getTime()) && dueNorm < todayNorm;
                const overdueDays = isPastDue
                  ? Math.max(1, Math.floor((todayNorm.getTime() - dueNorm.getTime()) / 86400000))
                  : 0;
                const overdueBand: 'none' | 'warn' | 'critical' = !isPastDue
                  ? 'none'
                  : overdueDays <= 7
                    ? 'warn'
                    : 'critical';
                const tollHint =
                  ob.type === 'ambush' &&
                  /toll|violation|ez-?pass|fastrak|sunpass/i.test(`${ob.name} ${ob.subType}`);
                return (
                  <tr 
                    key={ob.id} 
                    className={cn(
                      'hover:bg-surface-highlight transition-colors',
                      overdueBand === 'warn' && 'bg-amber-500/[0.08] border-l-[3px] border-l-amber-500',
                      overdueBand === 'critical' && 'bg-rose-500/[0.1] border-l-[3px] border-l-rose-500',
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <BrandLogo name={ob.name} fallbackIcon={<Icon className="w-3.5 h-3.5 text-content-tertiary" />} />
                        <span className="text-sm font-medium text-content-primary">{ob.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-lg border ${
                        ob.type === 'debt' ? 'border-surface-border text-content-primary bg-content-primary/[0.05]' :
                        ob.type === 'ambush' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                        'border-surface-border text-content-tertiary bg-surface-elevated'
                      }`}>{ob.subType}</span>
                      {ob.type === 'recurring' && billAmountChanges.get(ob.id) && (
                        <span className="ml-2 inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                          +{billAmountChanges.get(ob.id)?.pct.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-sm font-mono ${
                            overdueBand === 'critical'
                              ? 'text-rose-400'
                              : overdueBand === 'warn'
                                ? 'text-amber-400'
                                : isDebtNoDue
                                  ? 'text-content-muted'
                                  : 'text-content-secondary'
                          }`}
                        >
                          {ob.dueLabel}
                          {overdueBand === 'warn' && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              ⚠️ OVERDUE {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                            </span>
                          )}
                          {overdueBand === 'critical' && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                              ⚠️ OVERDUE {overdueDays} days
                            </span>
                          )}
                        </span>
                        {tollHint && overdueBand !== 'none' && (
                          <p className="max-w-xs text-[11px] text-content-tertiary leading-snug">
                            Toll violations may accrue penalties after 30 days.
                          </p>
                        )}
                        {overdueBand === 'critical' && !tollHint && ob.type === 'ambush' && (
                          <p className="max-w-xs text-[11px] text-rose-300/90 leading-snug">
                            Unpaid fines can add late fees and collection risk — resolve as soon as you can.
                          </p>
                        )}
                        {isDebtNoDue && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!canUseDebt) {
                                toast.error('Editing debt requires Full Suite.');
                                return;
                              }
                              const d = debts.find((x) => x.id === ob.id);
                              if (d) setEditDebtRow(d);
                            }}
                            className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Add due date
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono text-content-primary">
                        ${ob.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex flex-col items-end gap-2">
                        {ob.type === 'recurring' && isPastDue && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const b = bills.find((x) => x.id === ob.id);
                              if (!b) return;
                              await markBillPaid(b.id);
                              toast.success(`✓ ${b.biller} marked as paid`);
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors',
                              overdueBand === 'critical'
                                ? 'bg-rose-600 text-white hover:bg-rose-500'
                                : 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover',
                            )}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                            Resolve Now →
                          </button>
                        )}
                        {ob.type === 'debt' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canUseDebt) {
                                toast.error('Editing debt requires Full Suite.');
                                return;
                              }
                              const d = debts.find((x) => x.id === ob.id);
                              if (d) setEditDebtRow(d);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-content-tertiary hover:text-content-secondary text-[11px] font-mono underline-offset-2 hover:underline"
                          >
                            <Pencil className="w-3 h-3" aria-hidden />
                            Edit
                          </button>
                        )}
                        {ob.type === 'recurring' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const b = bills.find((x) => x.id === ob.id);
                              if (b) setEditBillRow(b);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-content-tertiary hover:text-content-secondary text-[11px] font-mono underline-offset-2 hover:underline"
                          >
                            <Pencil className="w-3 h-3" aria-hidden />
                            Edit
                          </button>
                        )}
                        {ob.type === 'ambush' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const cit = citations.find((c) => c.id === ob.id);
                              if (cit) {
                                const ok = await resolveCitation(cit.id);
                                if (ok) toast.success(`${ob.name} resolved`);
                              } else toast.error('Citation not found');
                            }}
                            className={cn(
                              'px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors active:scale-[0.98]',
                              isPastDue
                                ? 'border border-rose-500 bg-rose-600 text-white hover:bg-rose-500'
                                : 'border border-rose-500/50 hover:bg-rose-500/10 text-rose-400',
                            )}
                          >
                            {isPastDue ? 'Resolve Now →' : 'PAY'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredObligations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    {activeTab === 'ambush' ? (
                      /* PAGE-04: Tickets & Fines empty state with context */
                      <div className="flex flex-col items-center justify-center gap-3">
                        <TicketIcon className="w-10 h-10 text-content-muted" />
                        <p className="text-base font-semibold text-content-primary">Track unexpected charges</p>
                        <p className="max-w-xs text-sm text-content-tertiary leading-relaxed">
                          Log parking tickets, court fines, late fees, or any one-time charge. We&apos;ll add them to your bill calendar.
                        </p>
                        <button
                          type="button"
                          onClick={() => openQuickAdd('citation')}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-sm font-semibold text-surface-base transition-colors hover:bg-brand-cta-hover"
                        >
                          <Plus className="w-4 h-4 shrink-0" aria-hidden />
                          Add a fine or ticket
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-content-tertiary">
                        <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500/50" />
                        <p className="text-sm font-mono">No obligations in this category.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleModule>
      </div>

      <CollapsibleModule title="Payment History Log" icon={PaymentsIcon} defaultOpen={false}>
        {paymentHistoryRows.length === 0 ? (
          <p className="text-sm text-content-tertiary">No recent payment-like transactions yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-6 p-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Date</th>
                  <th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Description</th>
                  <th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Category</th>
                  <th className="px-2 py-2 text-[10px] font-mono uppercase tracking-wider text-content-tertiary text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistoryRows.map((tx) => (
                  <tr key={tx.id} className="border-b border-surface-highlight last:border-0">
                    <td className="px-2 py-2 text-xs text-content-secondary">{tx.date}</td>
                    <td className="px-2 py-2 text-xs text-content-primary">{tx.name}</td>
                    <td className="px-2 py-2 text-xs text-content-tertiary">{formatCategoryLabel(tx.category)}</td>
                    <td className="px-2 py-2 text-xs font-mono text-content-primary text-right">${tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleModule>

      <EditBillDialog bill={editBillRow} onClose={() => setEditBillRow(null)} editBill={editBill} />
      <EditDebtDialog debt={editDebtRow} onClose={() => setEditDebtRow(null)} editDebt={editDebt} />
    </div>
  );
}

function EditBillDialog({
  bill,
  onClose,
  editBill,
}: {
  bill: Bill | null;
  onClose: () => void;
  editBill: (id: string, u: Partial<Bill>) => void | Promise<void>;
}) {
  const [biller, setBiller] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [frequency, setFrequency] = React.useState<Bill['frequency']>('Monthly');

  React.useEffect(() => {
    if (!bill) return;
    setBiller(bill.biller);
    setAmount(String(bill.amount));
    setCategory(bill.category);
    setDueDate(bill.dueDate);
    setFrequency(bill.frequency);
  }, [bill]);

  if (!bill) return null;

  const save = async () => {
    const n = parseFloat(amount);
    if (!biller.trim() || isNaN(n) || n <= 0) {
      toast.error('Enter a payee and a valid amount.');
      return;
    }
    await editBill(bill.id, {
      biller: biller.trim(),
      amount: n,
      category: category || bill.category,
      dueDate,
      frequency,
    });
    toast.success('Bill updated');
    onClose();
  };

  return (
    <Dialog open className="relative z-[100]" onClose={onClose}>
      <div className="fixed inset-0 bg-black/70" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg border border-surface-border bg-surface-elevated p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-4">Edit bill</Dialog.Title>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Payee</label>
            <input
              value={biller}
              onChange={(e) => setBiller(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-date-dark w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm"
            />
            <label className="block text-xs text-content-tertiary">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Bill['frequency'])}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
            >
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover">
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

function EditDebtDialog({
  debt,
  onClose,
  editDebt,
}: {
  debt: Debt | null;
  onClose: () => void;
  editDebt: (id: string, u: Partial<Debt>) => void | Promise<void>;
}) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('');
  const [remaining, setRemaining] = React.useState('');
  const [apr, setApr] = React.useState('');
  const [minPayment, setMinPayment] = React.useState('');
  const [paymentDue, setPaymentDue] = React.useState('');
  const [noPaymentDue, setNoPaymentDue] = React.useState(false);

  React.useEffect(() => {
    if (!debt) return;
    setName(debt.name);
    setType(debt.type);
    setRemaining(String(debt.remaining));
    setApr(String(debt.apr));
    setMinPayment(String(debt.minPayment));
    const pdd = debt.paymentDueDate?.trim();
    setNoPaymentDue(!pdd);
    setPaymentDue(pdd || '');
  }, [debt]);

  if (!debt) return null;

  const save = async () => {
    const rem = parseFloat(remaining);
    const ap = parseFloat(apr);
    const min = parseFloat(minPayment);
    if (!name.trim() || isNaN(rem) || rem < 0) {
      toast.error('Enter account name and a valid balance.');
      return;
    }
    await editDebt(debt.id, {
      name: name.trim(),
      type: type.trim() || debt.type,
      remaining: rem,
      apr: isNaN(ap) ? 0 : ap,
      minPayment: isNaN(min) ? 0 : Math.max(0, min),
      paymentDueDate: noPaymentDue ? null : paymentDue || null,
    });
    toast.success('Debt updated');
    onClose();
  };

  return (
    <Dialog open className="relative z-[100]" onClose={onClose}>
      <div className="fixed inset-0 bg-black/70" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg border border-surface-border bg-surface-elevated p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-1">Edit debt</Dialog.Title>
          <p className="text-xs text-content-tertiary mb-4">Update balance, APR, minimum payment, or payment due date.</p>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Account / loan name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Type</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Credit Card, Loan, …"
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Balance owed ($)</label>
            <input
              type="number"
              step="0.01"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">APR (%)</label>
            <input
              type="number"
              step="0.01"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="block text-xs text-content-tertiary">Minimum payment ($/mo)</label>
            <input
              type="number"
              step="0.01"
              value={minPayment}
              onChange={(e) => setMinPayment(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
            />
            <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={noPaymentDue}
                onChange={(e) => setNoPaymentDue(e.target.checked)}
                className="rounded border-surface-border focus-app"
              />
              No payment due date (e.g. closed card with balance)
            </label>
            {!noPaymentDue && (
              <>
                <label className="block text-xs text-content-tertiary">Next payment due</label>
                <input
                  type="date"
                  value={paymentDue}
                  onChange={(e) => setPaymentDue(e.target.value)}
                  className="input-date-dark w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover">
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
