import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, Flag, Gavel, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass } from '../shared/AdminUI';
import { cn } from '../../../lib/utils';

type ModerationRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id?: string | null;
  report_reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderator_note: string | null;
  created_at: string;
};

const statusTone = (status: ModerationRow['status']) =>
  status === 'approved' ? 'good' : status === 'rejected' ? 'danger' : status === 'flagged' ? 'warn' : 'default';

export default function AdminModerationPage() {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ModerationRow['status']>('pending');
  const [selected, setSelected] = useState<ModerationRow | null>(null);
  const qc = useQueryClient();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'moderation-queue'],
    queryFn: async () => {
      const { data: rows, error: queryError } = await supabase
        .from('moderation_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      return (rows ?? []) as ModerationRow[];
    },
    refetchInterval: 20_000,
  });

  const filtered = useMemo(
    () => data.filter((row) => statusFilter === 'all' || row.status === statusFilter),
    [data, statusFilter],
  );
  const counts = useMemo(() => ({
    pending: data.filter((row) => row.status === 'pending').length,
    flagged: data.filter((row) => row.status === 'flagged').length,
    resolved: data.filter((row) => row.status === 'approved' || row.status === 'rejected').length,
  }), [data]);

  async function setStatus(id: string, status: ModerationRow['status']) {
    setSavingId(id);
    const { error: updateError } = await supabase
      .from('moderation_queue')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setSavingId(null);
    if (!updateError) {
      setSelected((current) => (current?.id === id ? { ...current, status } : current));
      await qc.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
    }
  }

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Governance"
        title="Moderation queue"
        description="Review reported content with context, state, and a clear separation between review and enforcement actions."
        metrics={[
          { label: 'Pending', value: counts.pending, tone: counts.pending ? 'warn' : 'default' },
          { label: 'Flagged', value: counts.flagged, tone: counts.flagged ? 'danger' : 'default' },
          { label: 'Resolved', value: counts.resolved, tone: 'good' },
          { label: 'Refresh', value: '20s' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <AdminPanel
          title="Reports"
          description="Select a report before changing status. Empty content means the backend has not supplied a preview payload."
          actions={
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="focus-app-field border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
            >
              <option value="pending">Pending</option>
              <option value="flagged">Flagged</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All statuses</option>
            </select>
          }
        >
          {isLoading ? <p className="p-4 text-xs text-content-muted">Loading moderation queue...</p> : null}
          {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load moderation queue.</p> : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <AdminEmptyState icon={Gavel} title="Queue is clear" description="No moderation items match this status filter." />
          ) : null}
          {!isLoading && !error && filtered.length > 0 ? (
            <div className="divide-y divide-surface-border">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row)}
                  className={cn(
                    'block w-full p-4 text-left transition-colors hover:bg-surface-elevated/60',
                    selected?.id === row.id && 'bg-surface-elevated/80',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge tone={statusTone(row.status)}>{row.status}</AdminStatusBadge>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">{row.entity_type}</span>
                      </div>
                      <p className="mt-2 break-all text-xs font-medium text-content-primary">{row.entity_id}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-content-tertiary">{row.report_reason ?? 'No report reason supplied.'}</p>
                    </div>
                    <span className="text-[11px] text-content-muted">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel title="Review drawer" description="A lightweight case view for the selected report.">
          {selected ? (
            <div className="space-y-4 p-4 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AdminStatusBadge tone={statusTone(selected.status)}>{selected.status}</AdminStatusBadge>
                  <p className="mt-3 break-all font-mono text-content-secondary">{selected.entity_id}</p>
                </div>
                {selected.user_id ? (
                  <Link to={`/admin/user/${selected.user_id}`} className={cn(adminButtonClass, 'py-1.5')}>
                    <Eye className="h-3.5 w-3.5" /> Case file
                  </Link>
                ) : null}
              </div>

              <div className="border border-surface-border bg-surface-base p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Report reason</p>
                <p className="mt-2 leading-5 text-content-secondary">{selected.report_reason ?? 'No report reason supplied by reporter.'}</p>
              </div>

              <div className="border border-surface-border bg-surface-base p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-tertiary">Moderator note</p>
                <p className="mt-2 leading-5 text-content-secondary">{selected.moderator_note ?? 'No note recorded.'}</p>
              </div>

              <div className="border border-amber-500/35 bg-amber-500/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">Controlled review actions</p>
                <p className="mt-1 leading-5 text-content-secondary">These actions only update moderation status. Use the case file for account-level enforcement.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button type="button" disabled={savingId === selected.id} onClick={() => void setStatus(selected.id, 'approved')} className="border border-emerald-500/40 px-2.5 py-2 text-[11px] font-semibold text-emerald-700 disabled:opacity-40 dark:text-emerald-200">
                    <Check className="mr-1 inline h-3 w-3" /> Approve
                  </button>
                  <button type="button" disabled={savingId === selected.id} onClick={() => void setStatus(selected.id, 'flagged')} className="border border-amber-500/40 px-2.5 py-2 text-[11px] font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-200">
                    <Flag className="mr-1 inline h-3 w-3" /> Flag
                  </button>
                  <button type="button" disabled={savingId === selected.id} onClick={() => void setStatus(selected.id, 'rejected')} className="border border-rose-500/40 px-2.5 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-40 dark:text-rose-200">
                    <X className="mr-1 inline h-3 w-3" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState icon={Gavel} title="Select a report" description="Choose an item from the queue to inspect context and update review status." />
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
