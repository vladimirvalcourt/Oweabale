import { DollarSign } from 'lucide-react';
import type { BillingStats } from './types';

type Props = {
  stats: BillingStats | null;
};

const fmtUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  trialing: 'text-sky-400',
  past_due: 'text-amber-400',
  canceled: 'text-content-muted',
  unpaid: 'text-rose-400',
};

export function AdminBillingPanel({ stats }: Props) {
  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5 space-y-4">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
        <DollarSign className="w-4 h-4" /> Billing
      </h2>

      {!stats ? (
        <p className="text-xs text-content-muted">No billing data yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-sm border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Total revenue</p>
              <p className="text-content-primary font-semibold mt-1">{fmtUsd(stats.total_revenue_cents)}</p>
            </div>
            <div className="rounded-sm border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Revenue (30d)</p>
              <p className="text-content-primary font-semibold mt-1">{fmtUsd(stats.revenue_30d_cents)}</p>
            </div>
            <div className="rounded-sm border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Active subs</p>
              <p className="text-content-primary font-semibold mt-1">
                {stats.subscription_counts['active'] ?? 0}
              </p>
            </div>
            <div className="rounded-sm border border-surface-border bg-surface-base p-2">
              <p className="text-content-tertiary">Failed (30d)</p>
              <p className={`font-semibold mt-1 ${stats.failed_payments_30d > 0 ? 'text-rose-400' : 'text-content-primary'}`}>
                {stats.failed_payments_30d}
              </p>
            </div>
          </div>

          {Object.keys(stats.subscription_counts).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.subscription_counts).map(([status, count]) => (
                <span
                  key={status}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-surface-border bg-surface-base"
                >
                  <span className={STATUS_COLORS[status] ?? 'text-content-secondary'}>{status}</span>
                  <span className="text-content-muted ml-1">{count}</span>
                </span>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-content-muted mb-2">Recent payments</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {stats.recent_payments.length === 0 && (
                <p className="text-xs text-content-muted">No payments yet.</p>
              )}
              {stats.recent_payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-[11px] py-1.5 border-b border-surface-border/40 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-content-secondary">{p.product_key ?? '—'}</span>
                    <span className="text-content-muted ml-2">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={p.status === 'paid' ? 'text-emerald-400 shrink-0' : 'text-rose-400 shrink-0'}>
                    {p.status === 'paid' ? fmtUsd(p.amount_total) : p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
