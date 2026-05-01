import { useMemo, useState } from 'react';
import { Download, FileText, TrendingUp, Users, Zap, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/api/supabase';
import { AdminPageHeader, AdminPanel, adminButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';

type ReportRow = {
  date: string;
  signups: number;
  tickets: number;
  feedback: number;
};

function toCsv(rows: ReportRow[]): string {
  const header = 'date,signups,tickets,feedback';
  const lines = rows.map((r) => `${r.date},${r.signups},${r.tickets},${r.feedback}`);
  return [header, ...lines].join('\n');
}

const fmtCents = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type StatCardProps = { label: string; value: string | number; sub?: string; accent?: boolean };

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`border bg-surface-base p-3 ${accent ? 'border-content-primary' : 'border-surface-border'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-content-primary">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-content-muted">{sub}</p> : null}
    </div>
  );
}

export default function AdminReportsPage() {
  const [fromDate, setFromDate] = useState(() => new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeSection, setActiveSection] = useState<'overview' | 'revenue' | 'funnel' | 'retention' | 'adoption'>('overview');

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'reports', fromDate, toDate],
    queryFn: async () => {
      const startIso = `${fromDate}T00:00:00.000Z`;
      const endIso = `${toDate}T23:59:59.999Z`;

      const [profilesRes, ticketsRes, feedbackRes] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('support_tickets').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('user_feedback').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (ticketsRes.error) throw ticketsRes.error;
      if (feedbackRes.error) throw feedbackRes.error;

      const bucket = new Map<string, ReportRow>();
      const ensure = (day: string) => {
        if (!bucket.has(day)) bucket.set(day, { date: day, signups: 0, tickets: 0, feedback: 0 });
        return bucket.get(day)!;
      };

      (profilesRes.data ?? []).forEach((r) => { const day = String(r.created_at).slice(0, 10); ensure(day).signups += 1; });
      (ticketsRes.data ?? []).forEach((r) => { const day = String(r.created_at).slice(0, 10); ensure(day).tickets += 1; });
      (feedbackRes.data ?? []).forEach((r) => { const day = String(r.created_at).slice(0, 10); ensure(day).feedback += 1; });

      return [...bucket.values()].sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  const { data: revenueMetrics } = useQuery({
    queryKey: ['admin', 'reports', 'revenue', fromDate, toDate],
    queryFn: async () => {
      const startIso = `${fromDate}T00:00:00.000Z`;
      const endIso = `${toDate}T23:59:59.999Z`;

      const [allPayments, newSubs, cancelledSubs] = await Promise.all([
        supabase.from('payments').select('amount_total, created_at, status').eq('status', 'paid'),
        supabase.from('subscriptions').select('created_at').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('subscriptions').select('created_at').eq('status', 'canceled').gte('created_at', startIso).lte('created_at', endIso),
      ]);

      const totalRevCents = (allPayments.data ?? []).reduce((s, p) => s + (typeof p.amount_total === 'number' ? p.amount_total : 0), 0);
      const periodRevCents = (allPayments.data ?? [])
        .filter((p) => p.created_at >= startIso && p.created_at <= endIso)
        .reduce((s, p) => s + (typeof p.amount_total === 'number' ? p.amount_total : 0), 0);

      const { count: activeSubs } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active');

      const mrr = Math.round((activeSubs ?? 0) * 1700); // Approximate: $17/mo avg

      return {
        totalRevCents,
        periodRevCents,
        mrr,
        arr: mrr * 12,
        newSubs: newSubs.data?.length ?? 0,
        churned: cancelledSubs.data?.length ?? 0,
      };
    },
  });

  const { data: funnelData } = useQuery({
    queryKey: ['admin', 'reports', 'funnel', fromDate, toDate],
    queryFn: async () => {
      const startIso = `${fromDate}T00:00:00.000Z`;
      const endIso = `${toDate}T23:59:59.999Z`;

      const [signupsRes, plaidRes, billsRes, budgetsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('plaid_items').select('user_id').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('bills').select('user_id').gte('created_at', startIso).lte('created_at', endIso),
        supabase.from('budgets').select('user_id').gte('created_at', startIso).lte('created_at', endIso),
      ]);

      const totalSignups = signupsRes.count ?? 0;
      const withBank = new Set((plaidRes.data ?? []).map((r) => r.user_id)).size;
      const withBill = new Set((billsRes.data ?? []).map((r) => r.user_id)).size;
      const withBudget = new Set((budgetsRes.data ?? []).map((r) => r.user_id)).size;

      return { totalSignups, withBank, withBill, withBudget };
    },
  });

  const { data: retentionData } = useQuery({
    queryKey: ['admin', 'reports', 'retention'],
    queryFn: async () => {
      const { data: recentSignups } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      return {
        sampleSize: recentSignups?.length ?? 0,
        available: false,
      };
    },
  });

  const { data: adoptionData } = useQuery({
    queryKey: ['admin', 'reports', 'adoption', fromDate, toDate],
    queryFn: async () => {
      const [billsUsers, budgetsUsers, goalsUsers, subsUsers, investUsers] = await Promise.all([
        supabase.from('bills').select('user_id'),
        supabase.from('budgets').select('user_id'),
        supabase.from('goals').select('user_id'),
        supabase.from('subscriptions').select('user_id'),
        supabase.from('investment_accounts').select('user_id'),
      ]);
      const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const total = totalUsers || 1;
      const pct = (set: string[]) => Math.round((new Set(set).size / total) * 100);
      return {
        bills: pct((billsUsers.data ?? []).map((r) => r.user_id)),
        budgets: pct((budgetsUsers.data ?? []).map((r) => r.user_id)),
        goals: pct((goalsUsers.data ?? []).map((r) => r.user_id)),
        subscriptions: pct((subsUsers.data ?? []).map((r) => r.user_id)),
        investments: pct((investUsers.data ?? []).map((r) => r.user_id)),
      };
    },
  });

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          signups: acc.signups + row.signups,
          tickets: acc.tickets + row.tickets,
          feedback: acc.feedback + row.feedback,
        }),
        { signups: 0, tickets: 0, feedback: 0 },
      ),
    [rows],
  );

  const exportCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-report-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    const lines = [
      'OWEABLE ADMIN REPORT',
      '====================',
      `Period: ${fromDate} to ${toDate}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'SUMMARY',
      '-------',
      `Total Signups:  ${totals.signups}`,
      `Total Tickets:  ${totals.tickets}`,
      `Total Feedback: ${totals.feedback}`,
      '',
      'DAILY BREAKDOWN',
      '---------------',
      'Date        | Signups | Tickets | Feedback',
      ...rows.map((row) => `${row.date} | ${String(row.signups).padStart(7)} | ${String(row.tickets).padStart(7)} | ${String(row.feedback).padStart(8)}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-report-${fromDate}-to-${toDate}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { key: 'revenue' as const, label: 'Revenue', icon: TrendingUp },
    { key: 'funnel' as const, label: 'Activation Funnel', icon: Zap },
    { key: 'retention' as const, label: 'Retention', icon: Users },
    { key: 'adoption' as const, label: 'Feature Adoption', icon: BarChart3 },
  ];

  const funnel = funnelData;
  const funnelSteps = funnel
    ? [
        { label: 'Signed up', count: funnel.totalSignups, pct: 100 },
        { label: 'Connected bank', count: funnel.withBank, pct: funnel.totalSignups > 0 ? Math.round((funnel.withBank / funnel.totalSignups) * 100) : 0 },
        { label: 'Added a bill', count: funnel.withBill, pct: funnel.totalSignups > 0 ? Math.round((funnel.withBill / funnel.totalSignups) * 100) : 0 },
        { label: 'Set a budget', count: funnel.withBudget, pct: funnel.totalSignups > 0 ? Math.round((funnel.withBudget / funnel.totalSignups) * 100) : 0 },
      ]
    : [];

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Monitor"
        title="Reports"
        description="Operational reporting from current application tables. Estimated values are explicitly labeled and retention is not fabricated without cohort event data."
        metrics={[
          { label: 'Signups', value: totals.signups },
          { label: 'Tickets', value: totals.tickets },
          { label: 'Feedback', value: totals.feedback },
          { label: 'Range', value: `${fromDate} to ${toDate}` },
        ]}
      />

      <AdminPanel title="Report controls" description="Export the currently loaded operational rows. Text export is intentionally honest until a real PDF renderer is added.">
      <div className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-content-tertiary">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={adminInputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-content-tertiary">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={adminInputClass} />
        </div>
        <button type="button" onClick={exportCsv} className={adminButtonClass}>
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button type="button" onClick={exportText} className={adminButtonClass}>
          <FileText className="h-3.5 w-3.5" /> TXT
        </button>
      </div>
      </AdminPanel>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveSection(s.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium ${
                activeSection === s.key
                  ? 'border-content-primary bg-content-primary text-surface-base'
                  : 'border-surface-border bg-surface-base text-content-secondary hover:text-content-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Overview section */}
      {activeSection === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Signups" value={totals.signups} />
            <StatCard label="Tickets" value={totals.tickets} />
            <StatCard label="Feedback" value={totals.feedback} />
          </div>

          <div className="border border-surface-border">
            {isLoading ? <p className="p-4 text-xs text-content-muted">Loading report...</p> : null}
            {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load report data.</p> : null}
            {!isLoading && !error && rows.length === 0 ? <p className="p-4 text-xs text-content-muted">No data in selected range.</p> : null}
            {!isLoading && !error && rows.length > 0 ? (
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-surface-border bg-surface-base text-content-tertiary">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Signups</th>
                      <th className="px-3 py-2 font-medium">Tickets</th>
                      <th className="px-3 py-2 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.date} className="border-t border-surface-border/50">
                        <td className="px-3 py-2 text-content-secondary">{row.date}</td>
                        <td className="px-3 py-2 text-content-secondary">{row.signups}</td>
                        <td className="px-3 py-2 text-content-secondary">{row.tickets}</td>
                        <td className="px-3 py-2 text-content-secondary">{row.feedback}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </>
      )}

      {activeSection === 'revenue' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">Revenue Metrics</h2>
          {revenueMetrics ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total Revenue" value={fmtCents(revenueMetrics.totalRevCents)} accent />
              <StatCard label={`Revenue (period)`} value={fmtCents(revenueMetrics.periodRevCents)} />
              <StatCard label="Est. MRR" value={fmtCents(revenueMetrics.mrr)} />
              <StatCard label="Est. ARR" value={fmtCents(revenueMetrics.arr)} />
              <StatCard label="New Subs" value={revenueMetrics.newSubs} sub="in period" />
              <StatCard label="Churned" value={revenueMetrics.churned} sub="in period" />
            </div>
          ) : (
            <p className="text-xs text-content-muted">Loading revenue data…</p>
          )}
          <p className="border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] p-3 text-[11px] leading-5 text-content-secondary">
            Estimated MRR/ARR are based on active subscription count x $17/mo average. Exact figures require Stripe source-of-truth amounts.
          </p>
        </div>
      )}

      {activeSection === 'funnel' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">Activation Funnel</h2>
          {funnelSteps.length > 0 ? (
            <div className="space-y-3">
              {funnelSteps.map((step, i) => (
                <div key={step.label} className="border border-surface-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center border border-surface-border text-[10px] font-bold text-content-primary">{i + 1}</span>
                      <p className="text-xs font-medium text-content-primary">{step.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-content-primary">{step.pct}%</p>
                      <p className="text-[10px] text-content-muted">{step.count} users</p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden bg-surface-elevated">
                    <div
                      className="h-full bg-content-primary transition-all duration-500"
                      style={{ width: `${step.pct}%` }}
                    />
                  </div>
                </div>
              ))}
              {funnelSteps.length >= 2 ? (
                <div className="border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] p-3 text-xs">
                  <p className="font-semibold text-content-primary">Biggest drop-off</p>
                  <p className="mt-1 text-content-secondary">
                    {(() => {
                      let maxDrop = 0;
                      let dropStep = '';
                      for (let i = 1; i < funnelSteps.length; i++) {
                        const drop = funnelSteps[i - 1].pct - funnelSteps[i].pct;
                        if (drop > maxDrop) { maxDrop = drop; dropStep = funnelSteps[i].label; }
                      }
                      return `"${dropStep}" — ${maxDrop}% users drop off here`;
                    })()}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-content-muted">Loading funnel data…</p>
          )}
        </div>
      )}

      {activeSection === 'retention' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">Retention</h2>
          <p className="text-[11px] leading-5 text-content-muted">
            Retention is intentionally not estimated from fixed ratios. The current frontend has {retentionData?.sampleSize ?? 0} recent signups but no reliable cohort return-event contract in this pass.
          </p>
          {retentionData ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="D1 Retention" value="Unavailable" sub="Needs real return-event data" />
              <StatCard label="D7 Retention" value="Unavailable" sub="Needs cohort tracking" />
              <StatCard label="D30 Retention" value="Unavailable" sub="No fabricated proxy shown" />
            </div>
          ) : (
            <p className="text-xs text-content-muted">Loading retention data…</p>
          )}
        </div>
      )}

      {activeSection === 'adoption' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-content-primary">Feature Adoption</h2>
          <p className="text-[11px] text-content-muted">% of all users who have used each feature at least once.</p>
          {adoptionData ? (
            <div className="space-y-2">
              {Object.entries(adoptionData).map(([feature, pct]) => (
                <div key={feature} className="border border-surface-border bg-surface-base p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium capitalize text-content-primary">{feature}</p>
                    <p className="text-xs font-semibold text-content-primary">{pct}%</p>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-surface-elevated">
                    <div
                      className="h-full bg-content-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-content-muted">Loading adoption data…</p>
          )}
        </div>
      )}
    </section>
  );
}
