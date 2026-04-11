/**
 * Bills & Debts — Total Bills & Debt record
 * Avalanche/Snowball payoff algorithm with projected payoff dates and interest savings.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Receipt, CreditCard, AlertTriangle, ShieldAlert,
  FileText, CheckCircle2, Flame,
  Calculator, ChevronDown, ChevronUp, Plus, Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useStore } from '../store/useStore';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { motion } from 'motion/react';
import { generateAmortizationSchedule } from '../lib/finance';

type ObligationType = 'recurring' | 'debt' | 'ambush';
type Strategy = 'avalanche' | 'snowball';

interface Obligation {
  id: string;
  name: string;
  type: ObligationType;
  subType: string;
  dueDate: string;
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
  const { bills, debts, citations, resolveCitation, openQuickAdd } = useStore();
  const [activeTab, setActiveTab] = useState<FilterTab>(() => {
    const param = new URLSearchParams(window.location.search).get('tab');
    return (param === 'ambush' || param === 'recurring' || param === 'debt') ? param : 'all';
  });
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [extraPayment, setExtraPayment] = useState(0);
  const [showDetonator, setShowDetonator] = useState(true);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

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
      amount: b.amount,
      icon: Receipt,
    }));
    return [
      ...recurringObligations,
      ...debts.map(d => ({
        id: d.id,
        name: d.name,
        type: 'debt' as ObligationType,
        subType: d.type,
        dueDate: new Date(scheduleBaseMs + 20 * 86400000).toISOString().split('T')[0],
        amount: d.remaining,
        icon: CreditCard,
      })),
      ...citations.filter(c => c.status === 'open').map(c => ({
        id: c.id,
        name: `${c.type} — ${c.jurisdiction}`,
        type: 'ambush' as ObligationType,
        subType: 'Citation',
        dueDate: new Date(scheduleBaseMs + c.daysLeft * 86400000).toISOString().split('T')[0],
        amount: c.amount,
        icon: ShieldAlert,
      })),
    ];
  }, [bills, debts, citations, scheduleBaseMs]);

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
          <h1 className="text-2xl font-bold tracking-tight text-content-primary mb-1 uppercase">BILLS & DEBTS</h1>
          <p className="text-zinc-400 text-sm">A complete record of everything you owe.</p>
        </div>
        <button 
          onClick={() => openQuickAdd('obligation')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center gap-2 self-start btn-tactile"
        >
          <Plus className="w-4 h-4" />
          ADD BILL
        </button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <Receipt className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Monthly Payments</span>
          </div>
          <p className="text-2xl font-mono text-red-400 font-bold">${totalMonthlyBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-surface-elevated border border-surface-border p-5 rounded-sm">
          <div className="flex items-center gap-2 text-zinc-500 mb-3">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Total Debt</span>
          </div>
          <p className="text-2xl font-mono text-amber-400 font-bold">${activePrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`bg-surface-elevated border p-5 rounded-sm relative overflow-hidden ${urgentTotal > 0 ? 'border-rose-500/50' : 'border-surface-border'}`}>
          {urgentTotal > 0 && <div className="absolute inset-0 bg-rose-500/3" />}
          <div className="flex items-center gap-2 text-zinc-500 mb-3 relative z-10">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider">Urgent Tickets</span>
            {urgentCitations.length > 0 && <span className="text-[9px] font-mono font-bold text-rose-400 border border-rose-500/50 px-1 rounded-sm ml-auto">{urgentCitations.length} DUE</span>}
          </div>
          <p className={`text-2xl font-mono font-bold relative z-10 ${urgentTotal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ${urgentTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Debt Detonator Panel */}
      {debts.length > 0 && (
        <CollapsibleModule 
          title="Debt Payoff Plan" 
          icon={Flame}
          extraHeader={
            <span className="text-[10px] font-mono text-zinc-600 bg-surface-base border border-surface-border px-2 py-0.5 rounded-sm">
              Payoff: {payoffResult.months > 0 ? monthsToDate(payoffResult.months) : 'N/A'}
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
                      strategy === s ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {s === 'avalanche' ? '⚡ Highest Interest First' : '❄️ Smallest Debt First'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-surface-base border border-surface-border rounded-sm px-3 py-1.5">
                <Calculator className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Extra per month:</span>
                <button onClick={() => setExtraPayment(e => Math.max(0, e - 100))} className="text-zinc-500 hover:text-white"><Minus className="w-3 h-3" /></button>
                <span className="text-sm font-mono text-content-primary w-16 text-center">${extraPayment}</span>
                <button onClick={() => setExtraPayment(e => e + 100)} className="text-zinc-500 hover:text-white"><Plus className="w-3 h-3" /></button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-elevated border border-surface-border rounded-sm p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Debt-Free Date</p>
                <p className="text-lg font-mono font-bold text-indigo-400">{payoffResult.months > 0 ? monthsToDate(payoffResult.months) : '—'}</p>
                <p className="text-[10px] font-mono text-zinc-600">{payoffResult.months} months</p>
              </div>
              <div className="bg-surface-elevated border border-surface-border rounded-sm p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Interest Paid</p>
                <p className="text-lg font-mono font-bold text-red-400">${payoffResult.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-surface-elevated border border-emerald-500/20 rounded-sm p-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Interest Saved</p>
                <p className="text-lg font-mono font-bold text-emerald-400">${interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] font-mono text-zinc-600">vs. minimum payments only</p>
              </div>
            </div>

            {/* Per-debt timeline bars */}
            <div className="space-y-4">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Payoff Order — {strategy === 'avalanche' ? 'Highest Interest First' : 'Smallest Balance First'}</p>
              {[...debts]
                .sort((a, b) => strategy === 'avalanche' ? b.apr - a.apr : a.remaining - b.remaining)
                .map((d, i) => {
                  const pct = Math.round((d.paid / (d.paid + d.remaining)) * 100);
                  const isExpanded = expandedDebtId === d.id;
                  return (
                    <div key={d.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-bold flex items-center justify-center rounded-sm">{i + 1}</span>
                          <span className="text-sm text-content-primary">{d.name}</span>
                          <span className="text-[10px] font-mono text-zinc-600 border border-surface-border px-1.5 py-0.5 rounded-sm">{d.apr}% interest rate</span>
                        </div>
                        <span className="text-xs font-mono text-zinc-400">${d.remaining.toLocaleString()} left</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-border rounded-none overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-0.5">
                        <span>{pct}% paid</span>
                        <span>Min: ${d.minPayment}/mo</span>
                      </div>
                      <div className="mt-1">
                        <button
                          onClick={() => setExpandedDebtId(isExpanded ? null : d.id)}
                          className="text-[10px] font-mono text-zinc-600 hover:text-indigo-400 transition-colors uppercase tracking-widest flex items-center gap-1"
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
                            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
                              Principal vs. Interest — First 12 Months
                            </p>
                            <div className="h-[120px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }} barSize={8}>
                                  <XAxis dataKey="name" tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: '#52525B', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '2px', fontFamily: 'monospace', fontSize: '11px' }}
                                    formatter={(value, name) => [`$${Number(value ?? 0).toFixed(2)}`, name === 'principal' ? 'Principal' : 'Interest']}
                                  />
                                  <Bar dataKey="principal" fill="#6366f1" stackId="a" />
                                  <Bar dataKey="interest" fill="#EF4444" stackId="a" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 mt-2">
                              <span className="text-[10px] font-mono text-indigo-400">■ Principal</span>
                              <span className="text-[10px] font-mono text-red-400">■ Interest</span>
                              <span className="text-[10px] font-mono text-zinc-600 ml-auto">
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

      {/* Tabs */}
      <div className="border-b border-surface-border">
        <div className="flex space-x-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                activeTab === tab.key ? 'bg-indigo-600/30 text-indigo-400' : 'bg-surface-elevated text-zinc-600'
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
                <th className="px-6 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <motion.tbody 
              className="divide-y divide-surface-border"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {filteredObligations.map(ob => {
                const Icon = ob.icon;
                const isPastDue = new Date(ob.dueDate) < today;
                return (
                  <motion.tr 
                    key={ob.id} 
                    className="hover:bg-surface-highlight transition-colors"
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <BrandLogo name={ob.name} fallbackIcon={<Icon className="w-3.5 h-3.5 text-zinc-400" />} />
                        <span className="text-sm font-medium text-content-primary">{ob.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-sm border ${
                        ob.type === 'debt' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' :
                        ob.type === 'ambush' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                        'border-surface-border text-zinc-500 bg-surface-elevated'
                      }`}>{ob.subType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-mono ${isPastDue ? 'text-rose-400' : 'text-zinc-300'}`}>
                        {ob.dueDate}
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
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast.success(`Targeting ${ob.name} for payoff`)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold rounded-sm transition-colors">TARGET</motion.button>
                      )}
                      {ob.type === 'recurring' && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => toast.success(`Reviewing ${ob.name}`)} className="px-3 py-1 border border-surface-border hover:border-zinc-500 text-zinc-300 text-xs font-mono rounded-sm transition-colors">REVIEW</motion.button>
                      )}
                      {ob.type === 'ambush' && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={async () => {
                            const cit = citations.find(c => c.id === ob.id);
                            if (cit) {
                              const ok = await resolveCitation(cit.id);
                              if (ok) toast.success(`${ob.name} resolved`);
                            } else toast.error('Citation not found');
                          }}
                          className="px-3 py-1 border border-rose-500/50 hover:bg-rose-500/10 text-rose-400 text-xs font-mono font-bold rounded-sm transition-colors"
                        >PAY</motion.button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {filteredObligations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-500">
                      <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500/50" />
                      <p className="text-sm font-mono">No obligations in this category.</p>
                    </div>
                  </td>
                </tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </CollapsibleModule>
      </div>
    </div>
  );
}
