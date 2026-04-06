/**
 * Reports & Analytics — Full data visualization dashboard
 * Spending by Category, Income vs Expenses, Net Worth Trend, Debt Progress, CSV Export
 */
import React, { useState, useMemo } from 'react';
import { Download, BarChart3, PieChart, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useStore } from '../store/useStore';
import { CollapsibleModule } from '../components/CollapsibleModule';

type DateRange = '30d' | '90d' | '1y';

const CATEGORY_COLORS = [
  '#6366F1', '#34D399', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#10B981', '#EC4899', '#84CC16',
];

function exportCSV(data: { date: string; name: string; category: string; amount: string; type: string }[], filename: string) {
  const headers = ['Date', 'Name', 'Category', 'Amount', 'Type'];
  const rows = data.map(r => [r.date, r.name, r.category, r.amount, r.type].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}



export default function Reports() {
  const { transactions, debts, assets } = useStore();
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (dateRange === '30d') now.setDate(now.getDate() - 30);
    else if (dateRange === '90d') now.setDate(now.getDate() - 90);
    else now.setFullYear(now.getFullYear() - 1);
    return now;
  }, [dateRange]);

  const filteredTx = useMemo(
    () => transactions.filter(t => new Date(t.date) >= cutoffDate),
    [transactions, cutoffDate]
  );

  // Spending by Category (pie chart)
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTx.filter(t => t.type === 'expense').forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx]);

  // Monthly income vs expenses (bar chart — last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; income: number; expenses: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const monthTx = transactions.filter(t => t.date.startsWith(monthKey));
      months.push({
        month: label,
        income: parseFloat(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2)),
        expenses: parseFloat(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2)),
      });
    }
    return months;
  }, [transactions]);

  // Net worth forward projection (12 months, deterministic)
  const netWorthHistory = useMemo(() => {
    const MONTHS = 12;
    const result: { month: string; netWorth: number }[] = [];

    // Clone mutable state for simulation
    let simAssets = assets.map(a => ({ value: a.value, rate: a.appreciationRate ?? 0 }));
    let simDebts = debts.map(d => ({ remaining: d.remaining, minPayment: d.minPayment, apr: d.apr }));

    for (let i = 0; i < MONTHS; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

      // Apply monthly appreciation to each asset
      simAssets = simAssets.map(a => ({
        ...a,
        value: a.value * (1 + a.rate / 12),
      }));

      // Apply interest then min payments to each debt
      simDebts = simDebts.map(d => {
        const interest = d.remaining * (d.apr / 100 / 12);
        const newRemaining = Math.max(0, d.remaining + interest - d.minPayment);
        return { ...d, remaining: newRemaining };
      });

      const totalA = simAssets.reduce((s, a) => s + a.value, 0);
      const totalD = simDebts.reduce((s, d) => s + d.remaining, 0);
      result.push({ month: label, netWorth: Math.round(totalA - totalD) });
    }
    return result;
  }, [assets, debts]);

  // Debt payoff progress
  const debtProgress = debts.map(d => ({
    name: d.name,
    paid: d.paid,
    remaining: d.remaining,
    total: d.paid + d.remaining,
    pct: Math.round((d.paid / (d.paid + d.remaining)) * 100),
    apr: d.apr,
  }));

  const tooltipStyle = {
    backgroundColor: '#141414',
    border: '1px solid #262626',
    borderRadius: '0px',
    color: '#FAFAFA',
    fontFamily: 'monospace',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    padding: '8px 12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Reports & Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">Full financial picture across time.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-raised border border-surface-border rounded-sm p-1">
            {(['30d', '90d', '1y'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors ${
                  dateRange === r ? 'bg-surface-border text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r === '30d' ? '30D' : r === '90d' ? '90D' : '1Y'}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportCSV(
              filteredTx.map(t => ({ date: t.date, name: t.name, category: t.category, amount: t.amount.toFixed(2), type: t.type })),
              `oweable-report-${dateRange}.csv`
            )}
            className="flex items-center gap-2 bg-transparent border border-surface-border text-zinc-300 px-4 py-2 rounded-sm text-sm font-medium hover:bg-surface-elevated transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <CollapsibleModule title="Performance Metrics" icon={TrendingUp}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mx-6 -my-6 p-6">
          {[
            { label: 'Total Income', value: `$${filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
            { label: 'Total Expenses', value: `$${filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-red-400' },
            { label: 'Net Savings', value: `$${(filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-indigo-400' },
            { label: 'Transactions', value: filteredTx.length.toString(), color: 'text-amber-400' },
          ].map(card => (
            <div key={card.label} className="bg-surface-elevated border border-surface-border rounded-sm p-5">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">{card.label}</p>
              <p className={`text-2xl font-mono font-bold tabular-nums ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses */}
        <CollapsibleModule 
          title="Cash Flow Dynamics" 
          icon={BarChart3}
        >
          <div className="flex flex-col">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => [`$${Number(v ?? 0).toLocaleString()}`, name === 'income' ? 'Income' : 'Expenses']} />
                <Bar dataKey="income" fill="#34D399" radius={0} />
                <Bar dataKey="expenses" fill="#EF4444" radius={0} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500"><span className="w-2 h-2 bg-emerald-400 rounded-none inline-block" /> Income</div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500"><span className="w-2 h-2 bg-red-400 rounded-none inline-block" /> Expenses</div>
            </div>
          </div>
        </CollapsibleModule>

        {/* Spending by Category */}
        <CollapsibleModule 
          title="Spending Taxonomy" 
          icon={PieChart}
        >
          {categoryData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm font-mono">No expense data in range</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <RechartsPie>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, 'Spent']} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 min-w-0">
                {categoryData.slice(0, 6).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 shrink-0 rounded-none" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-[11px] font-mono text-zinc-400 truncate">{cat.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-300 shrink-0">${cat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleModule>
      </div>

      {/* Net Worth Trend */}
      <CollapsibleModule 
        title="Net Worth Evolution" 
        icon={TrendingUp}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={netWorthHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`, 'Net Worth']} />
            <Area type="monotone" dataKey="netWorth" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#nwGradient)" dot={{ fill: '#6366F1', strokeWidth: 0, r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CollapsibleModule>

      {/* Debt Payoff Progress */}
      <CollapsibleModule 
        title="Debt Detonation Tracking" 
        icon={CreditCard}
        extraHeader={<span className="text-xs font-mono text-content-primary font-bold">{debtProgress.length} Accounts</span>}
      >
        <div className="space-y-5">
          {debtProgress.length === 0 ? (
            <p className="text-sm font-mono text-zinc-500 text-center py-4">No debts tracked.</p>
          ) : (
            debtProgress.map(d => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-content-primary">{d.name}</span>
                    <span className="ml-2 text-[10px] font-mono text-zinc-500">{d.apr}% APR</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-zinc-400">${d.remaining.toLocaleString()} left</span>
                    <span className="ml-2 text-xs font-mono text-indigo-400">{d.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-surface-border rounded-none overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-1">
                  <span>Paid: ${d.paid.toLocaleString()}</span>
                  <span>Total: ${d.total.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleModule>
    </div>
  );
}
