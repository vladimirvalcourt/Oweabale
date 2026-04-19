import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAdminPermissions } from '../shared/useAdminPermissions';

type ComplianceStatusRow = {
  user_id: string;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'manual_review';
  aml_status: 'pending' | 'clear' | 'flagged' | 'manual_review';
  pep_sanctions_hit: boolean;
  risk_score: number;
  last_checked_at: string | null;
};

type FlaggedRow = {
  id: string;
  user_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  created_at: string;
};

export default function AdminCompliancePage() {
  const qc = useQueryClient();
  const { hasPermission } = useAdminPermissions();
  const canManage = hasPermission('compliance.manage');
  const [refreshingPlaid, setRefreshingPlaid] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'compliance', 'overview'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return { statuses: [], flagged: [] };
      const { data: payload, error: invokeErr } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'compliance_overview' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invokeErr) throw invokeErr;
      return payload?.compliance ?? { statuses: [], flagged: [] };
    },
    staleTime: 30_000,
  });

  const statuses = useMemo(() => (data?.statuses ?? []) as ComplianceStatusRow[], [data?.statuses]);
  const flagged = useMemo(() => (data?.flagged ?? []) as FlaggedRow[], [data?.flagged]);

  const summary = useMemo(() => {
    const kycManual = statuses.filter((s) => s.kyc_status === 'manual_review').length;
    const amlFlagged = statuses.filter((s) => s.aml_status === 'flagged').length;
    const criticalFlags = flagged.filter((f) => f.severity === 'critical' && f.status !== 'resolved').length;
    const highRisk = statuses.filter((s) => s.risk_score >= 75).length;
    return { kycManual, amlFlagged, criticalFlags, highRisk };
  }, [statuses, flagged]);

  const triggerPlaidRefresh = async () => {
    if (!canManage) return;
    if (!window.confirm('Force-refresh stale Plaid compliance checks now? This may trigger additional webhook traffic.')) return;
    setRefreshingPlaid(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'compliance_force_refresh_plaid' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    setRefreshingPlaid(false);
    await qc.invalidateQueries({ queryKey: ['admin', 'compliance', 'overview'] });
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-content-primary">Compliance Command Center</h1>
            <p className="mt-1 text-xs text-content-tertiary">
              Monitor KYC/AML risk and investigate flagged activity from one workflow.
            </p>
          </div>
          <button
            type="button"
            disabled={!canManage || refreshingPlaid}
            onClick={() => void triggerPlaidRefresh()}
            className="danger-button rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200 disabled:opacity-40"
          >
            {refreshingPlaid ? 'Refreshing Plaid…' : 'Force-refresh stale Plaid items'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-[11px] uppercase tracking-wide text-content-tertiary">KYC manual review</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.kycManual}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-[11px] uppercase tracking-wide text-content-tertiary">AML flagged users</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.amlFlagged}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-[11px] uppercase tracking-wide text-rose-200">Critical flags open</p>
          <p className="mt-1 text-2xl font-semibold text-rose-100">{summary.criticalFlags}</p>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
          <p className="text-[11px] uppercase tracking-wide text-content-tertiary">High risk users (75+)</p>
          <p className="mt-1 text-2xl font-semibold text-content-primary">{summary.highRisk}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-card rounded-2xl">
          <div className="border-b border-surface-border px-3 py-2">
            <h2 className="text-sm font-semibold text-content-primary">Compliance Status Matrix</h2>
          </div>
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading compliance data…</p> : null}
          {error ? <p className="p-4 text-xs text-rose-300">Failed to load compliance overview.</p> : null}
          {!isLoading && !error && statuses.length === 0 ? <p className="p-4 text-xs text-content-muted">No compliance statuses returned.</p> : null}
          {!isLoading && !error && statuses.length > 0 ? (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                  <tr>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">KYC</th>
                    <th className="px-3 py-2">AML</th>
                    <th className="px-3 py-2">PEP/Sanctions</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((row) => (
                    <tr key={row.user_id} className="border-t border-surface-border/50">
                      <td className="px-3 py-2 text-content-secondary">{row.user_id}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.kyc_status}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.aml_status}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.pep_sanctions_hit ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.risk_score}</td>
                      <td className="px-3 py-2 text-content-secondary">
                        {row.last_checked_at ? new Date(row.last_checked_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="glass-card rounded-2xl">
          <div className="border-b border-surface-border px-3 py-2">
            <h2 className="text-sm font-semibold text-content-primary">Flagged Activity Queue</h2>
          </div>
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading flagged activity…</p> : null}
          {error ? <p className="p-4 text-xs text-rose-300">Unable to load flagged activity.</p> : null}
          {!isLoading && !error && flagged.length === 0 ? <p className="p-4 text-xs text-content-muted">No flagged items right now.</p> : null}
          {!isLoading && !error && flagged.length > 0 ? (
            <div className="max-h-[60vh] divide-y divide-surface-border overflow-auto">
              {flagged.map((item) => (
                <article key={item.id} className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-content-primary">{item.user_id}</p>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                        item.severity === 'critical'
                          ? 'border-rose-500/40 bg-rose-500/20 text-rose-200'
                          : item.severity === 'high'
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                            : 'border-surface-border bg-surface-base text-content-tertiary'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary">{item.reason}</p>
                  <div className="flex items-center justify-between text-[11px] text-content-tertiary">
                    <span>Status: {item.status}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
