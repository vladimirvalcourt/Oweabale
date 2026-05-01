import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/api/supabase';
import { useAdminPermissions } from '@/features/admin/shared';
import { AdminPageHeader, AdminPanel, AdminStatusBadge, adminDangerButtonClass } from '@/features/admin/shared/AdminUI';

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
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Governance"
        title="Compliance command center"
        description="Monitor KYC/AML risk, sanctions indicators, and flagged activity using the existing compliance overview action."
        actions={
          <button
            type="button"
            disabled={!canManage || refreshingPlaid}
            onClick={() => void triggerPlaidRefresh()}
            className={adminDangerButtonClass}
          >
            {refreshingPlaid ? 'Refreshing Plaid...' : 'Force-refresh stale Plaid items'}
          </button>
        }
        metrics={[
          { label: 'KYC manual', value: summary.kycManual, tone: summary.kycManual ? 'warn' : 'default' },
          { label: 'AML flagged', value: summary.amlFlagged, tone: summary.amlFlagged ? 'danger' : 'default' },
          { label: 'Critical flags', value: summary.criticalFlags, tone: summary.criticalFlags ? 'danger' : 'default' },
          { label: 'High risk', value: summary.highRisk, tone: summary.highRisk ? 'warn' : 'default' },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <AdminPanel title="Compliance status matrix" description="Use the case file link before escalating account-level action.">
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading compliance data…</p> : null}
          {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load compliance overview.</p> : null}
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
                    <th className="px-3 py-2">Case</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((row) => (
                    <tr key={row.user_id} className="border-t border-surface-border/50">
                      <td className="px-3 py-2 font-mono text-[11px] text-content-secondary">{row.user_id}</td>
                      <td className="px-3 py-2 text-content-secondary"><AdminStatusBadge tone={row.kyc_status === 'verified' ? 'good' : row.kyc_status === 'rejected' ? 'danger' : 'warn'}>{row.kyc_status}</AdminStatusBadge></td>
                      <td className="px-3 py-2 text-content-secondary"><AdminStatusBadge tone={row.aml_status === 'clear' ? 'good' : row.aml_status === 'flagged' ? 'danger' : 'warn'}>{row.aml_status}</AdminStatusBadge></td>
                      <td className="px-3 py-2 text-content-secondary">{row.pep_sanctions_hit ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.risk_score}</td>
                      <td className="px-3 py-2 text-content-secondary">
                        {row.last_checked_at ? new Date(row.last_checked_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Link to={`/admin/user/${row.user_id}`} className="text-[10px] font-semibold text-brand-cta hover:underline">
                          Case file
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel title="Flagged activity queue" description="Queue presentation only; backend workflow actions stay unchanged.">
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading flagged activity…</p> : null}
          {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Unable to load flagged activity.</p> : null}
          {!isLoading && !error && flagged.length === 0 ? <p className="p-4 text-xs text-content-muted">No flagged items right now.</p> : null}
          {!isLoading && !error && flagged.length > 0 ? (
            <div className="max-h-[60vh] divide-y divide-surface-border overflow-auto">
              {flagged.map((item) => (
                <article key={item.id} className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-content-primary">{item.user_id}</p>
                    <span
                      className={`border px-2 py-0.5 text-[10px] uppercase tracking-wide ${item.severity === 'critical'
                          ? 'border-[var(--color-status-urgent-border)] bg-[var(--color-status-urgent-bg)] text-[var(--color-status-urgent-text-dark)]'
                          : item.severity === 'high'
                            ? 'border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text-dark)]'
                            : 'border-surface-border text-content-tertiary'
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
                  <Link to={`/admin/user/${item.user_id}`} className="inline-flex text-[10px] font-semibold text-brand-cta hover:underline">
                    Open case file
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </AdminPanel>
      </div>
    </section>
  );
}
