type MetricData = {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  openTickets: number;
  plaidItems: number | null;
  plaidErrors: number | null;
};

const metricValueClass =
  'min-h-[1.75rem] tabular-nums text-xl font-bold leading-none tracking-tight';

export function AdminMetricsBar({ metrics }: { metrics: MetricData }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Users</p>
        <p className={`${metricValueClass} text-content-primary`}>{metrics.totalUsers}</p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Active</p>
        <p className={`${metricValueClass} text-emerald-400`}>{metrics.activeUsers}</p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Admins</p>
        <p className={`${metricValueClass} text-content-primary`}>{metrics.admins}</p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Open Tickets</p>
        <p className={`${metricValueClass} text-amber-400`}>{metrics.openTickets}</p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Plaid Items</p>
        <p className={`${metricValueClass} text-content-primary`}>{metrics.plaidItems ?? '—'}</p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <p className="text-[10px] uppercase text-content-tertiary">Plaid Errors</p>
        <p
          className={`${metricValueClass} ${(metrics.plaidErrors ?? 0) > 0 ? 'text-rose-400' : 'text-content-primary'}`}
        >
          {metrics.plaidErrors ?? '—'}
        </p>
      </div>
    </div>
  );
}
