import { FileScan, Smartphone } from 'lucide-react';
import type { AdminCaptureSession, AdminPendingIngestion } from './types';

type Props = {
  loading: boolean;
  pendingIngestions: AdminPendingIngestion[];
  captureSessions: AdminCaptureSession[];
};

export function AdminIngestionQueuesPanel({ loading, pendingIngestions, captureSessions }: Props) {
  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary mb-4">Ingestion + mobile capture queues</h2>

      <div className="space-y-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5 mb-2">
            <FileScan className="w-3.5 h-3.5" /> Pending ingestions
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {loading && <p className="text-[11px] text-content-muted">Loading queues...</p>}
            {!loading && pendingIngestions.length === 0 && (
              <p className="text-[11px] text-content-muted">No pending ingestions.</p>
            )}
            {pendingIngestions.map((row) => (
              <div key={row.id} className="rounded-lg border border-surface-border bg-surface-base p-2">
                <p className="text-[11px] text-content-primary truncate">
                  {row.type} · {row.status ?? 'unknown'} · {row.source ?? '—'}
                </p>
                <p className="text-[10px] text-content-tertiary truncate">{row.userEmail}</p>
                <p className="text-[10px] text-content-muted">{new Date(row.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5 mb-2">
            <Smartphone className="w-3.5 h-3.5" /> Document capture sessions
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {!loading && captureSessions.length === 0 && (
              <p className="text-[11px] text-content-muted">No recent capture sessions.</p>
            )}
            {captureSessions.map((row) => (
              <div key={row.id} className="rounded-lg border border-surface-border bg-surface-base p-2">
                <p className="text-[11px] text-content-primary truncate">{row.userEmail}</p>
                <p className="text-[10px] text-content-tertiary">
                  {row.status} · {new Date(row.updated_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
