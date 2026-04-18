/**
 * Analytics — Historical Trends
 * Real net worth timeline from DB snapshots + spending trends from transactions.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, PieChart, Minus } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { rechartsTooltipStableProps } from '../lib/rechartsTooltip';
import { SafeResponsiveContainer } from '../components/charts/SafeResponsiveContainer';
import { formatCategoryLabel } from '../lib/categoryDisplay';
import { TransitionLink } from '../components/TransitionLink';

type Period = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface Snapshot {
  date: string;
  net_worth: number;
  assets: number;
  debts: number;
}

const CHART_COLORS = [
  '#d4d4d4', '#34D399', '#F59E0B', '#EF4444',
  '#737373', '#a3a3a3', '#78716c', '#64748b', '#525252',
];

const tooltipStyle = {
  backgroundColor: '#141414',
  border: '1px solid #262626',
  borderRadius: '8px',
  color: '#FAFAFA',
  fontFamily: 'monospace',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  padding: '8px 12px',
};

function fmt(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function periodCutoff(p: Period): Date | null {
  const d = new Date();
  if (p === '1M')  { d.setMonth(d.getMonth() - 1);       return d; }
  if (p === '3M')  { d.setMonth(d.getMonth() - 3);       return d; }
  if (p === '6M')  { d.setMonth(d.getMonth() - 6);       return d; }
  if (p === '1Y')  { d.setFullYear(d.getFullYear() - 1); return d; }
  return null; // ALL
}

export default function Analytics() {
  const { transactions } = useStore();
  const [period, setPeriod] = useState<Period>('6M');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load snapshots from DB ─────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('net_worth_snapshots')
        .select('date, net_worth, assets, debts')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      setSnapshots(
        (data || []).map((r: any) => ({
          date:      r.date as string,
          net_worth: parseFloat(r.net_worth),
          assets:    parseFloat(r.assets),
          debts:     parseFloat(r.debts),
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  // ── Filter snapshots by selected period ───────────────────────
  const filteredSnapshots = useMemo(() => {
    const cutoff = periodCutoff(period);
    if (!cutoff) return snapshots;
    return snapshots.filter(s => new Date(s.date) >= cutoff);
  }, [snapshots, period]);

  const chartSnapshots = useMemo(() =>
    filteredSnapshots.map(s => ({
      ...s,
      label: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })),
  [filteredSnapshots]);

  // ── Net worth delta vs start of period ───────────────────────
  const netWorthDelta = useMemo(() => {
    if (filteredSnapshots.length < 2) return null;
    return filteredSnapshots[filteredSnapshots.length - 1].net_worth
         - filteredSnapshots[0].net_worth;
  }, [filteredSnapshots]);

  const latestSnapshot = filteredSnapshots[filteredSnapshots.length - 1] ?? null;

  // ── Monthly spending by top categories (12 months) ───────────
  const { monthlySpend, topCategories } = useMemo(() => {
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Sum spending per category per month
    const catTotals = new Map<string, number>();
    const monthCatMap = new Map<string, Map<string, number>>();

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const monthKey = t.date.slice(0, 7);
        if (!months.includes(monthKey)) return;
        catTotals.set(t.category, (catTotals.get(t.category) || 0) + t.amount);
        if (!monthCatMap.has(monthKey)) monthCatMap.set(monthKey, new Map());
        const cm = monthCatMap.get(monthKey)!;
        cm.set(t.category, (cm.get(t.category) || 0) + t.amount);
      });

    // Pick top 6 categories by total spend
    const top6 = [...catTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat]) => cat);

    const data = months.map(monthKey => {
      const d = new Date(monthKey + '-01');
      const row: Record<string, any> = {
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      };
      const cm = monthCatMap.get(monthKey);
      top6.forEach(cat => {
        row[cat] = cm ? parseFloat((cm.get(cat) || 0).toFixed(2)) : 0;
      });
      return row;
    });

    return { monthlySpend: data, topCategories: top6 };
  }, [transactions]);

  // ── Monthly income vs expenses + savings rate ────────────────
  const cashFlowData = useMemo(() => {
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.map(monthKey => {
      const d = new Date(monthKey + '-01');
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const monthTx = transactions.filter(t => t.date.slice(0, 7) === monthKey);
      const income   = parseFloat(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(2));
      const expenses = parseFloat(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(2));
      const rate     = income > 0 ? parseFloat(((income - expenses) / income * 100).toFixed(1)) : 0;
      return { label, income, expenses, rate };
    });
  }, [transactions]);

  // ── YTD metrics ──────────────────────────────────────────────
  const ytdMetrics = useMemo(() => {
    const year = new Date().getFullYear().toString();
    const ytdTx = transactions.filter(t => t.date.startsWith(year));
    const income   = ytdTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = ytdTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const saved    = income - expenses;
    const rate     = income > 0 ? (saved / income * 100) : 0;
    return { income, expenses, saved, rate };
  }, [transactions]);

  const isPositiveDelta = netWorthDelta !== null && netWorthDelta >= 0;
  const savingsGoalPct = 20;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Trends</h1>
          <p className="text-sm text-content-tertiary mt-1">Historical performance and spending patterns.</p>
        </div>
        <div className="flex bg-surface-raised border border-surface-border rounded-lg p-1">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-sans font-medium rounded-lg transition-colors ${
                period === p ? 'bg-surface-elevated text-content-primary border border-surface-border' : 'text-content-tertiary hover:text-content-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-elevated border border-surface-border rounded-lg p-5">
          <p className="metric-label normal-case text-content-tertiary mb-2">Current Net Worth</p>
          <p
            className={`text-2xl font-mono font-bold tabular-nums data-numeric ${
              latestSnapshot && latestSnapshot.net_worth >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {latestSnapshot ? fmt(latestSnapshot.net_worth) : '—'}
          </p>
          <p className="text-xs text-content-tertiary mt-1 truncate">
            {latestSnapshot ? `Assets ${fmt(latestSnapshot.assets)} · Debts ${fmt(latestSnapshot.debts)}` : 'No data yet'}
          </p>
        </div>

        <div className="bg-surface-elevated border border-surface-border rounded-lg p-5">
          <p className="metric-label normal-case text-content-tertiary mb-2">Net Worth Δ ({period})</p>
          <p
            className={`text-2xl font-mono font-bold tabular-nums data-numeric ${
              isPositiveDelta ? 'text-emerald-400' : netWorthDelta !== null ? 'text-red-400' : 'text-content-tertiary'
            }`}
          >
            {netWorthDelta !== null ? `${isPositiveDelta ? '+' : ''}${fmt(netWorthDelta)}` : '—'}
          </p>
          <p className="text-xs text-content-tertiary mt-1">
            {netWorthDelta !== null ? (isPositiveDelta ? 'Growing' : 'Declining') : 'Need 2+ data points'}
          </p>
          {netWorthDelta !== null && netWorthDelta < 0 && (
            <p className="mt-2 text-[11px] text-content-secondary leading-relaxed">
              Snapshots lag real-time — tighten spending or add assets to bend the curve.{' '}
              <TransitionLink to="/net-worth" className="text-content-primary underline underline-offset-2">
                Open projection
              </TransitionLink>
            </p>
          )}
        </div>

        <div className="bg-surface-elevated border border-surface-border rounded-lg p-5">
          <p className="metric-label normal-case text-content-tertiary mb-2">YTD Saved</p>
          <p className={`text-2xl font-mono font-bold tabular-nums data-numeric ${ytdMetrics.saved >= 0 ? 'text-content-primary' : 'text-red-400'}`}>
            {fmt(ytdMetrics.saved)}
          </p>
          <p className="text-xs text-content-tertiary mt-1">Income {fmt(ytdMetrics.income)} · Spend {fmt(ytdMetrics.expenses)}</p>
          {ytdMetrics.saved < 0 && (
            <p className="mt-2 text-[11px] text-content-secondary leading-relaxed">
              <TransitionLink to="/budgets" className="text-content-primary underline underline-offset-2">
                Review budgets
              </TransitionLink>{' '}
              to close the gap this year.
            </p>
          )}
        </div>

        <div className="bg-surface-elevated border border-surface-border rounded-lg p-5">
          <p className="metric-label normal-case text-content-tertiary mb-2">Avg Savings Rate</p>
          <p
            className={`text-2xl font-mono font-bold tabular-nums data-numeric ${
              ytdMetrics.rate >= savingsGoalPct ? 'text-emerald-400' : ytdMetrics.rate >= 10 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {ytdMetrics.rate.toFixed(1)}%
          </p>
          <p className="text-xs text-content-tertiary mt-1">
            Goal: {savingsGoalPct}% · You&apos;re at {ytdMetrics.rate.toFixed(1)}%
          </p>
          {ytdMetrics.rate < savingsGoalPct && (
            <p className="mt-2 text-[11px] text-content-secondary leading-relaxed">
              Automate a transfer on payday and trim one recurring bill to move toward {savingsGoalPct}%.{' '}
              <TransitionLink to="/subscriptions" className="text-content-primary underline underline-offset-2">
                Audit subscriptions
              </TransitionLink>
            </p>
          )}
        </div>
      </div>

      {/* Net Worth Timeline */}
      <CollapsibleModule title="Net Worth Timeline" icon={TrendingUp}>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-content-tertiary animate-pulse">Loading history…</p>
          </div>
        ) : chartSnapshots.length < 2 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <Activity className="w-8 h-8 text-content-muted" />
            <p className="text-sm text-content-tertiary text-center max-w-sm">
              History builds automatically each day you log in. Check back tomorrow for your first trend line.
            </p>
          </div>
        ) : (
          <SafeResponsiveContainer width="100%" height={260} minWidth={0} minHeight={120}>
            <AreaChart data={chartSnapshots} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d4d4d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#d4d4d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34D399" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} interval="preserveStartEnd" />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={fmt} width={58} />
              <Tooltip {...rechartsTooltipStableProps} contentStyle={tooltipStyle} formatter={(v: any, name: any) => [fmt(Number(v)), name === 'net_worth' ? 'Net Worth' : name === 'assets' ? 'Assets' : 'Debts']} labelFormatter={(l) => l} />
              <Area type="monotone" dataKey="assets"    stroke="#34D399" strokeWidth={1.5} fill="url(#assetsGrad)" dot={false} />
              <Area type="monotone" dataKey="net_worth" stroke="#d4d4d4" strokeWidth={2}   fill="url(#nwGrad)"     dot={false} />
            </AreaChart>
          </SafeResponsiveContainer>
        )}
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-content-tertiary"><span className="w-2 h-2 bg-brand-cta inline-block shrink-0" aria-hidden /> Net worth</div>
          <div className="flex items-center gap-1.5 text-xs text-content-tertiary"><span className="w-2 h-2 bg-emerald-400 inline-block shrink-0" aria-hidden /> Assets</div>
        </div>
      </CollapsibleModule>

      {/* Monthly Spending by Category */}
      <CollapsibleModule title="Spending by Category" icon={PieChart}>
        {monthlySpend.every(m => topCategories.every(c => m[c] === 0)) ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-content-tertiary">No expense transactions yet.</p>
          </div>
        ) : (
          <>
            <SafeResponsiveContainer width="100%" height={260} minWidth={0} minHeight={120}>
              <BarChart data={monthlySpend} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} interval={1} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={fmt} width={52} />
                <Tooltip {...rechartsTooltipStableProps} contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`$${Number(v).toLocaleString()}`, formatCategoryLabel(String(name))]} />
                {topCategories.map((cat, i) => (
                  <Bar key={cat} dataKey={cat} stackId="stack" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={0} />
                ))}
              </BarChart>
            </SafeResponsiveContainer>
            <div className="flex flex-wrap gap-4 mt-3">
              {topCategories.map((cat, i) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-content-tertiary">
                  <span className="w-2 h-2 inline-block shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
                  {formatCategoryLabel(cat)}
                </div>
              ))}
            </div>
          </>
        )}
      </CollapsibleModule>

      {/* Savings Rate */}
      <CollapsibleModule title="Monthly Savings Rate" icon={Activity}>
        <SafeResponsiveContainer width="100%" height={200} minWidth={0} minHeight={120}>
          <LineChart data={cashFlowData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F1F1F" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} interval={1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => `${v}%`} width={42} />
            <Tooltip {...rechartsTooltipStableProps} contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Savings Rate']} />
            <ReferenceLine y={20} stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="rate" stroke="#d4d4d4" strokeWidth={2} dot={{ r: 3, fill: '#d4d4d4' }} />
          </LineChart>
        </SafeResponsiveContainer>
        <div className="flex gap-5 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-content-tertiary"><span className="w-2 h-2 bg-brand-cta inline-block shrink-0" aria-hidden /> Savings rate</div>
          <div className="flex items-center gap-1.5 text-xs text-content-tertiary"><span className="w-4 h-px bg-content-muted/50 inline-block shrink-0 border-t border-dashed border-content-muted/40" aria-hidden /> 20% target</div>
        </div>
      </CollapsibleModule>
    </div>
  );
}
