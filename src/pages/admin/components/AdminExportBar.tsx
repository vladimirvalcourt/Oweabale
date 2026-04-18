import { Download } from 'lucide-react';

interface Props {
  profiles: Array<{
    id: string;
    email: string | null;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string | null;
  }>;
  billingStats: {
    recent_payments: Array<{
      id: string;
      user_id: string;
      amount_total: number;
      currency: string;
      status: string;
      product_key: string | null;
      created_at: string;
    }>;
  } | null;
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminExportBar({ profiles, billingStats }: Props) {
  function handleExportUsers() {
    const rows: string[][] = [
      ['id', 'email', 'is_admin', 'is_banned', 'created_at'],
      ...profiles.map((p) => [
        p.id,
        p.email ?? '',
        String(p.is_admin),
        String(p.is_banned),
        p.created_at ?? '',
      ]),
    ];
    downloadCsv('users.csv', rows);
  }

  function handleExportPayments() {
    if (!billingStats) return;
    const rows: string[][] = [
      ['id', 'user_id', 'amount_usd', 'currency', 'status', 'product_key', 'created_at'],
      ...billingStats.recent_payments.map((p) => [
        p.id,
        p.user_id,
        (p.amount_total / 100).toFixed(2),
        p.currency,
        p.status,
        p.product_key ?? '',
        p.created_at,
      ]),
    ];
    downloadCsv('payments.csv', rows);
  }

  const btnClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-surface-border bg-surface-elevated text-content-secondary hover:text-content-primary hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-4">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-3">
        <Download className="w-4 h-4" /> Export Data
      </h2>
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleExportUsers} className={btnClass}>
          <Download className="w-3 h-3" />
          Export Users CSV
        </button>
        <button
          type="button"
          onClick={handleExportPayments}
          disabled={billingStats === null}
          className={btnClass}
        >
          <Download className="w-3 h-3" />
          Export Payments CSV
        </button>
      </div>
    </div>
  );
}
