/**
 * Bills & Debts — Total Bills & Debt record
 * Avalanche/Snowball payoff algorithm with projected payoff dates and interest savings.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Receipt, CreditCard, AlertTriangle, ShieldAlert,
  FileText, CheckCircle2, Flame,
  Calculator, ChevronDown, ChevronUp, Plus, Minus, Pencil, CalendarDays
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { Dialog } from '@headlessui/react';
import { generateAmortizationSchedule, groupOutflowsByHorizon } from '../lib/finance';
import { TransitionLink } from '../components/TransitionLink';
import { rechartsTooltipStableProps } from '../lib/rechartsTooltip';
import { SafeResponsiveContainer } from '../components/charts/SafeResponsiveContainer';
import type { Bill, Debt } from '../store/useStore';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../components/FullSuiteGate';

type ObligationType = 'recurring' | 'debt' | 'ambush';
type Strategy = 'avalanche' | 'snowball';

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
  const { bills, debts, citations, subscriptions, resolveCitation, openQuickAdd, editBill, editDebt } = useStore(
    useShallow((s) => ({
      bills: s.bills,
      debts: s.debts,
      citations: s.citations,
      subscriptions: s.subscriptions,
      resolveCitation: s.resolveCitation,
      openQuickAdd: s.openQuickAdd,
      editBill: s.editBill,
      editDebt: s.editDebt,
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

  useEffect(() => {
    if (location.hash === '#due-soon') {
      requestAnimationFrame(() => {
        document.getElementById('due-soon')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  /** Stable anchor for synthetic due dates (set once per mount). */
  const [scheduleBaseMs] = useState(() => Date.now());

  const allObligations: Obligation[] = useMemo(() => {
    const recurringObligations: Obligation[] = bills.map(b => ({
      id: b.id,
      name: b.biller,
      type: 'recurring' as ObligationType,
      subType: b.frequency === 'Monthly' ? 'Fixed Bill' : `${b.frequency} Bill`,
      dueDate: b.dueDate,
      dueLabel: b.dueDate,
      amount: b.amount,
      icon: Receipt,
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
          icon: CreditCard,
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
        icon: ShieldAlert,
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

  const today = new Date();
  const urgentCitations = citations.filter(c => c.status === 'open' && c.daysLeft <= 7);
  const urgentTotal = urgentCitations.reduce((sum, c) => sum + c.amount, 0);

  // Debt Detonator calculation
  const payoffResult = useMemo(() => calcPayoff(
    debts.map(d => ({ remaining: d.remaining, apr: d.apr, minPayment: d.minPayment, name: d.name })),
    extraPayment,
    strategy
  ), [debts, extraPayment, strategy]);

  const interestSaved = Math.max(0, payoffResult.minOnlyInterest - payoffResult.totalInterest);

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
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1">Bills & debts</h1>
          <p className="text-sm text-content-tertiary">Everything you owe, in one place.</p>
        </div>
        <button 
          type="button"
          onClick={() => openQuickAdd(activeTab === 'ambush' ? 'citation' : 'obligation')}
          className="px-4 py-2.5 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-all flex items-center gap-2 self-start btn-tactile"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          {activeTab === 'ambush' ? 'Add ticket or fine' : activeTab === 'debt' ? 'Add debt' : 'Add bill'}
        </button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-content-tertiary mb-3">
            <Receipt className="w-3.5 h-3.5" />
            <span className="metric-label normal-case text-[11px]">Monthly payments</span>
          </div>
          <p className="text-2xl font-mono text-red-400 font-bold">${totalMonthlyBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-content-tertiary mb-3">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="metric-label normal-case text-[11px]">Total debt</span>
          </div>
          <p className="text-2xl font-mono text-amber-400 font-bold">${activePrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`bg-surface-elevated border p-5 rounded-sm relative overflow-hidden ${urgentTotal > 0 ? 'border-rose-500/50' : 'border-surface-border'}`}>
          {urgentTotal > 0 && <div className="absolute inset-0 bg-rose-500/3" />}
          <div className="flex items-center gap-2 text-content-tertiary mb-3 relative z-10">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="metric-label normal-case text-[11px]">Urgent tickets</span>
            {urgentCitations.length > 0 && <span className="text-[9px] font-mono font-bold text-rose-400 border border-rose-500/50 px-1 rounded-sm ml-auto">{urgentCitations.length} DUE</span>}
          </div>
          <p className={`text-2xl font-mono font-bold relative z-10 ${urgentTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${urgentTotal.toFixed(2)}
          </p>
        </div>
      </div>

      <CollapsibleModule
        title="Upcoming cash out (30 / 60 / 90 days)"
        icon={CalendarDays}
        defaultOpen={false}
        extraHeader={
          <TransitionLink
            to="/calendar#calendar-view"
            className="text-[10px] font-sans font-medium text-brand-violet hover:text-brand-violet/90 border border-brand-violet/30 rounded-sm px-2 py-0.5"
          >
            Month view →
          </TransitionLink>
        }
      >
        <div className="p-0 space-y-4">
          <p className="text-xs text-content-tertiary leading-relaxed">
            Totals include unpaid bills, active subscriptions, minimum debt payments with a due date, and open fines — same buckets as
            the list below, grouped by days from today. The{' '}
            <TransitionLink to="/calendar#calendar-view" className="text-brand-violet hover:underline">
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
              <div key={key} className="rounded-sm border border-surface-border bg-surface-base p-4">
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

      {/* Debt Detonator Panel */}
      {debts.length > 0 && hasFullSuite && (
        <CollapsibleModule 
          title="Debt Payoff Plan" 
          icon={Flame}
          extraHeader={
            <span className="text-xs font-sans text-content-tertiary bg-surface-base border border-surface-border px-2 py-0.5 rounded-sm">
              Payoff {payoffResult.months > 0 ? monthsToDate(payoffResult.months) : '—'}
            </span>
          }
        >
          <div className="p-0">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex bg-surface-base border border-surface-border rounded-sm p-1">
                {(['avalanche', 'snowball'] as Strategy[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-sm transition-colors uppercase tracking-wider ${
                      strategy === s ? 'bg-indigo-600 text-white' : 'text-content-tertiary hover:text-content-secondary'
                    }`}
                  >
                    {s === 'avalanche' ? '⚡ Highest Interest First' : '❄️ Smallest Debt First'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-surface-base border border-surface-border rounded-sm px-3 py-1.5">
                <Calculator className="w-3.5 h-3.5 text-content-tertiary" />
                <span className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider">Extra per month:</span>
                <button onClick={() => setExtraPayment(e => Math.max(0, e - 100))} className="text-content-tertiary hover:text-white"><Minus className="w-3 h-3" /></button>
                <span className="text-sm font-mono text-content-primary w-16 text-center">${extraPayment}</span>
                <button onClick={() => setExtraPayment(e => e + 100)} className="text-content-tertiary hover:text-white"><Plus className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-elevated border border-surface-border rounded-sm p-4">
                <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider mb-1">Debt-Free Date</p>
                <p className="text-lg font-mono font-bold text-indigo-400">{payoffResult.months > 0 ? monthsToDate(payoffResult.months) : '—'}</p>
                <p className="text-[10px] font-mono text-content-muted">{payoffResult.months} months</p>
              </div>
              <div className="bg-surface-elevated border border-surface-border rounded-sm p-4">
                <p className="text-[10px] font-mono text-content-tertiary uppercase tracking-wider mb-1">Interest Paid</p>
                <p className="text-lg font-mono font-bold text-red-400">${payoffResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated border border-emerald-500/20 rounded-sm p-4">
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
                          <span className="w-5 h-5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-bold flex items-center justify-center rounded-sm">{i + 1}</span>
                          <span className="text-sm text-content-primary">{d.name}</span>
                          <span className="text-[10px] font-mono text-content-muted border border-surface-border px-1.5 py-0.5 rounded-sm">{d.apr}% interest rate</span>
                        </div>
                        <span className="text-xs font-mono text-content-tertiary">${d.remaining.toLocaleString()} left</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-border rounded-none overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-content-muted mt-0.5">
                        <span>{pct}% paid</span>
                        <span>Min: ${d.minPayment}/mo</span>
                      </div>
                      <div className="mt-1">
                        <button
                          onClick={() => setExpandedDebtId(isExpanded ? null : d.id)}
                          className="text-[10px] font-mono text-content-muted hover:text-indigo-400 transition-colors uppercase tracking-widest flex items-center gap-1"
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
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barSize={8}>
                                  <XAxis dataKey="name" tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                  <Tooltip
                                    {...rechartsTooltipStableProps}
                                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '2px', fontFamily: 'monospace', fontSize: '11px' }}
                                    formatter={(value, name) => [`$${Number(value ?? 0).toFixed(2)}`, name === 'principal' ? 'Principal' : 'Interest']}
                                  />
                                  <Bar dataKey="principal" fill="#6366f1" stackId="a" />
                                  <Bar dataKey="interest" fill="#EF4444" stackId="a" />
                                </BarChart>
                              </SafeResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-2">
                              <span className="text-[10px] font-mono text-indigo-400">■ Principal</span>
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

      {/* Tabs */}
      <div className="border-b border-surface-border">
        <div className="flex space-x-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                activeTab === tab.key ? 'text-white' : 'text-content-tertiary hover:text-content-secondary'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                activeTab === tab.key ? 'bg-indigo-600/30 text-indigo-400' : 'bg-surface-elevated text-content-muted'
              }`}>{tab.count}</span>
              {activeTab === tab.key && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
            </button>
          ))}
        </div>
      </div>

      <div id="due-soon" className="scroll-mt-24">
      <CollapsibleModule title="Scheduled Payments" icon={FileText}>
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
                const isPastDue = !isDebtNoDue && new Date(ob.dueDate) < today;
                return (
                  <tr 
                    key={ob.id} 
                    className="hover:bg-surface-highlight transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <BrandLogo name={ob.name} fallbackIcon={<Icon className="w-3.5 h-3.5 text-content-tertiary" />} />
                        <span className="text-sm font-medium text-content-primary">{ob.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-sm border ${
                        ob.type === 'debt' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' :
                        ob.type === 'ambush' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                        'border-surface-border text-content-tertiary bg-surface-elevated'
                      }`}>{ob.subType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-mono ${
                          isPastDue ? 'text-rose-400' : isDebtNoDue ? 'text-content-muted' : 'text-content-secondary'
                        }`}
                      >
                        {ob.dueLabel}
                        {isPastDue && <span className="ml-2 text-[10px] font-bold">OVERDUE</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-mono text-content-primary">
                        ${ob.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {ob.type === 'debt' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const d = debts.find((x) => x.id === ob.id);
                            if (d) setEditDebtRow(d);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 border border-indigo-500/40 hover:bg-indigo-500/10 active:scale-[0.98] text-indigo-300 text-xs font-mono font-semibold rounded-sm transition-colors"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1 border border-surface-border hover:border-content-muted active:scale-[0.98] text-content-secondary text-xs font-mono rounded-sm transition-colors"
                        >
                          <Pencil className="w-3 h-3" aria-hidden />
                          Edit
                        </button>
                      )}
                      {ob.type === 'ambush' && (
                        <button
                          type="button"
                          onClick={async () => {
                            const cit = citations.find(c => c.id === ob.id);
                            if (cit) {
                              const ok = await resolveCitation(cit.id);
                              if (ok) toast.success(`${ob.name} resolved`);
                            } else toast.error('Citation not found');
                          }}
                          className="px-3 py-1 border border-rose-500/50 hover:bg-rose-500/10 active:scale-[0.98] text-rose-400 text-xs font-mono font-bold rounded-sm transition-colors"
                        >PAY</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredObligations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-content-tertiary">
                      <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500/50" />
                      <p className="text-sm font-mono">No obligations in this category.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CollapsibleModule>
      </div>

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
        <Dialog.Panel className="w-full max-w-md rounded-sm border border-surface-border bg-surface-elevated p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-4">Edit bill</Dialog.Title>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Payee</label>
            <input
              value={biller}
              onChange={(e) => setBiller(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-date-dark w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm"
            />
            <label className="block text-xs text-content-tertiary">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Bill['frequency'])}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
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
            <button type="button" onClick={() => void save()} className="rounded-sm bg-brand-cta px-4 py-2 text-sm font-semibold text-white hover:bg-brand-cta-hover">
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
        <Dialog.Panel className="w-full max-w-md rounded-sm border border-surface-border bg-surface-elevated p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-1">Edit debt</Dialog.Title>
          <p className="text-xs text-content-tertiary mb-4">Update balance, APR, minimum payment, or payment due date.</p>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Account / loan name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Type</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Credit Card, Loan, …"
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Balance owed ($)</label>
            <input
              type="number"
              step="0.01"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">APR (%)</label>
            <input
              type="number"
              step="0.01"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
            />
            <label className="block text-xs text-content-tertiary">Minimum payment ($/mo)</label>
            <input
              type="number"
              step="0.01"
              value={minPayment}
              onChange={(e) => setMinPayment(e.target.value)}
              className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
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
                  className="input-date-dark w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm"
                />
              </>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} className="rounded-sm bg-brand-cta px-4 py-2 text-sm font-semibold text-white hover:bg-brand-cta-hover">
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
