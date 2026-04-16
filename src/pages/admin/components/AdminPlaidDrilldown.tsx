import { AlertTriangle, CheckCircle2, Link2Off } from 'lucide-react';
import type { PlaidItemRow } from './types';

type Props = {
  items: PlaidItemRow[];
};

export function AdminPlaidDrilldown({ items }: Props) {
  const broken = items.filter((i) => i.last_sync_error || i.item_login_required);
  const healthy = items.filter((i) => !i.last_sync_error && !i.item_login_required);

  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-3">
        <Link2Off className="w-4 h-4" /> Plaid Connections
      </h2>

      {items.length === 0 ? (
        <p className="text-xs text-content-muted">No Plaid items found.</p>
      ) : (
        <>
          <div className="flex gap-4 text-xs mb-3">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> {healthy.length} healthy
            </span>
            {broken.length > 0 && (
              <span className="flex items-center gap-1 text-rose-400">
                <AlertTriangle className="w-3 h-3" /> {broken.length} broken
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {items.map((item) => {
              const isBroken = item.item_login_required || !!item.last_sync_error;
              return (
                <div
                  key={item.id}
                  className={`rounded-sm border p-2 text-[11px] ${
                    isBroken
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-surface-border bg-surface-base'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-content-secondary font-medium truncate">{item.userEmail}</p>
                      <p className="text-content-tertiary">{item.institution_name ?? 'Unknown institution'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.item_login_required ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Needs relink
                        </span>
                      ) : item.last_sync_error ? (
                        <span className="text-rose-400">Sync error</span>
                      ) : (
                        <span className="text-emerald-400">OK</span>
                      )}
                    </div>
                  </div>
                  {item.last_sync_error && (
                    <p
                      className="text-rose-300/80 mt-1 truncate"
                      title={item.last_sync_error}
                    >
                      {item.last_sync_error}
                    </p>
                  )}
                  <p className="text-content-muted mt-1">
                    {item.last_sync_at
                      ? `Synced ${new Date(item.last_sync_at).toLocaleDateString()}`
                      : 'Never synced'}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
