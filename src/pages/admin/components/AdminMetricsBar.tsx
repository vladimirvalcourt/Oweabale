type MetricData = {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  openTickets: number;
  plaidItems: number | null;
  plaidErrors: number | null;
};

export function AdminMetricsBar({ metrics }: { metrics: MetricData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Users</p><p className="text-xl text-content-primary font-bold">{metrics.totalUsers}</p></div>
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Active</p><p className="text-xl text-emerald-400 font-bold">{metrics.activeUsers}</p></div>
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Admins</p><p className="text-xl text-indigo-400 font-bold">{metrics.admins}</p></div>
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Open Tickets</p><p className="text-xl text-amber-400 font-bold">{metrics.openTickets}</p></div>
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Plaid Items</p><p className="text-xl text-content-primary font-bold">{metrics.plaidItems ?? '—'}</p></div>
      <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Plaid Errors</p><p className={`text-xl font-bold ${(metrics.plaidErrors ?? 0) > 0 ? 'text-rose-400' : 'text-content-primary'}`}>{metrics.plaidErrors ?? '—'}</p></div>
    </div>
  );
}
