import { Shield, Wallet } from 'lucide-react';
import type { AdminInsurancePolicy, AdminInvestmentAccount } from './types';

type Props = {
  loading: boolean;
  investmentAccounts: AdminInvestmentAccount[];
  insurancePolicies: AdminInsurancePolicy[];
};

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

export function AdminUserDataPanel({ loading, investmentAccounts, insurancePolicies }: Props) {
  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary mb-4">Financial profile tables</h2>
      {loading ? <p className="text-xs text-content-muted mb-3">Loading datasets...</p> : null}

      <div className="space-y-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5" /> Investment accounts
          </h3>
          <div className="max-h-44 overflow-y-auto space-y-1.5">
            {!loading && investmentAccounts.length === 0 ? (
              <p className="text-[11px] text-content-muted">No investment accounts yet.</p>
            ) : (
              investmentAccounts.map((row) => (
                <div key={row.id} className="rounded-lg border border-surface-border bg-surface-base p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-content-primary truncate">{row.name}</p>
                    <span className="text-[10px] text-emerald-400">{fmtCurrency(row.balance)}</span>
                  </div>
                  <p className="text-[10px] text-content-tertiary truncate">{row.userEmail}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5" /> Insurance policies
          </h3>
          <div className="max-h-44 overflow-y-auto space-y-1.5">
            {!loading && insurancePolicies.length === 0 ? (
              <p className="text-[11px] text-content-muted">No insurance policies yet.</p>
            ) : (
              insurancePolicies.map((row) => (
                <div key={row.id} className="rounded-lg border border-surface-border bg-surface-base p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-content-primary truncate">
                      {row.type} · {row.provider}
                    </p>
                    <span className="text-[10px] text-content-secondary">{fmtCurrency(row.premium)}</span>
                  </div>
                  <p className="text-[10px] text-content-tertiary truncate">
                    {row.frequency} · {row.status} · {row.userEmail}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
