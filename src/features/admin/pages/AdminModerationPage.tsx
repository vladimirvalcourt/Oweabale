import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/api/supabase';

type ModerationRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  report_reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderator_note: string | null;
  created_at: string;
};

export default function AdminModerationPage() {
  const [savingId, setSavingId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'moderation-queue'],
    queryFn: async () => {
      const { data: rows, error: queryError } = await supabase
        .from('moderation_queue')
        .select('id, entity_type, entity_id, report_reason, status, moderator_note, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      return (rows ?? []) as ModerationRow[];
    },
    refetchInterval: 20_000,
  });

  async function setStatus(id: string, status: ModerationRow['status']) {
    setSavingId(id);
    const { error: updateError } = await supabase
      .from('moderation_queue')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setSavingId(null);
    if (!updateError) await qc.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-lg font-semibold text-content-primary">Content Moderation</h1>
      <div className="border border-surface-border">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading moderation queue...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load moderation queue.</p> : null}
        {!isLoading && !error && (data?.length ?? 0) === 0 ? (
          <p className="p-4 text-xs text-content-muted">No pending content reports.</p>
        ) : null}
        {(data?.length ?? 0) > 0 ? (
          <div className="space-y-2 p-3">
            {data?.map((row) => (
              <div key={row.id} className="border border-surface-border p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-content-tertiary">{row.entity_type}</span>
                  <span className="border border-surface-border px-1.5 py-0.5 text-[10px] text-content-secondary">
                    {row.status}
                  </span>
                  <span className="ml-auto text-[10px] text-content-muted">{new Date(row.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-content-secondary">Entity: {row.entity_id}</p>
                {row.report_reason ? <p className="mt-1 text-xs text-content-tertiary">{row.report_reason}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => void setStatus(row.id, 'approved')}
                    className="border border-emerald-500/40 px-2.5 py-1.5 text-[11px] text-emerald-300 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => void setStatus(row.id, 'rejected')}
                    className="border border-rose-500/40 px-2.5 py-1.5 text-[11px] text-rose-300 disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => void setStatus(row.id, 'flagged')}
                    className="border border-amber-500/40 px-2.5 py-1.5 text-[11px] text-amber-300 disabled:opacity-40"
                  >
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
