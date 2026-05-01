import React, { useMemo, useState } from 'react';
import { useStore } from '@/store';
import { useShallow } from 'zustand/react/shallow';
import { PiggyBank, RefreshCw, ArrowDownRight, ArrowUpRight, Landmark } from 'lucide-react';
import { CollapsibleModule } from '@/components/common';
import { TransitionLink } from '@/components/common';
import { formatCategoryLabel } from '@/lib/api/services/categoryDisplay';
import { toast } from 'sonner';
import { getCustomIcon } from '@/lib/utils';

const DAYS_WINDOW = 90;

export default function Savings() {
  const BillingIcon = getCustomIcon('planning');
  const ChartIcon = getCustomIcon('payments');
  const {
    transactions,
    plaidAccounts,
    bankConnected,
    syncPlaidTransactions,
    updatePlaidAccountIncludeInSavings,
    plaidLastSyncAt,
  } = useStore(
    useShallow((s) => ({
      transactions: s.transactions,
      plaidAccounts: s.plaidAccounts,
      bankConnected: s.bankConnected,
      syncPlaidTransactions: s.syncPlaidTransactions,
      updatePlaidAccountIncludeInSavings: s.updatePlaidAccountIncludeInSavings,
      plaidLastSyncAt: s.plaidLastSyncAt,
    })),
  );
  const [syncing, setSyncing] = useState(false);
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);

  const trackedPlaidIds = useMemo(
    () => {
      const safeAccounts = Array.isArray(plaidAccounts) ? plaidAccounts : [];
      return new Set(safeAccounts.filter((a) => a.includeInSavings).map((a) => a.plaidAccountId || ''));
    },
    [plaidAccounts],
  );

  const savingsTransactions = useMemo(() => {
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    return safeTransactions.filter((t) => t.plaidAccountId && trackedPlaidIds.has(t.plaidAccountId));
  }, [transactions, trackedPlaidIds]);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - DAYS_WINDOW);
    return d.toISOString().slice(0, 10);
  }, []);

  const recentSavingsTx = useMemo(() => {
    return savingsTransactions.filter((t) => t.date >= windowStart).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [savingsTransactions, windowStart]);

  const totals90 = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of recentSavingsTx) {
      if (t.type === 'income') inflow += t.amount;
      else outflow += t.amount;
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [recentSavingsTx]);

  const accountLabel = (plaidAccountId: string | undefined) => {
    if (!plaidAccountId) return '';
    const a = plaidAccounts.find((x) => x.plaidAccountId === plaidAccountId);
    if (!a) return '';
    return a.mask ? `${a.name} · ${a.mask}` : a.name;
  };

  const onSync = async () => {
    setSyncing(true);
    try {
      await syncPlaidTransactions();
    } finally {
      setSyncing(false);
    }
  };

  const onToggleSavingsAccount = async (accountRowId: string, include: boolean) => {
    setSavingAccountId(accountRowId);
    try {
      const ok = await updatePlaidAccountIncludeInSavings(accountRowId, include);
      if (ok) toast.success(include ? 'Account added to Savings tracking' : 'Account removed from Savings tracking');
    } finally {
      setSavingAccountId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Savings</h1>
          <p className="text-sm text-content-tertiary mt-1 max-w-xl">
            Choose which linked accounts count as savings, then see money moving in and out after each bank sync.
            Oweable does not hold your cash — this reflects what your bank reports via Plaid.
          </p>
        </div>
        {bankConnected && (
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md border border-surface-border px-4 py-2.5 text-sm font-medium text-content-secondary hover:bg-surface-elevated disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden />
            Sync now
          </button>
        )}
      </div>

      {!bankConnected && (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised p-8 text-center">
          <Landmark className="w-10 h-10 mx-auto text-content-muted mb-3" aria-hidden />
          <p className="text-content-primary font-medium">Connect a bank to see savings activity</p>
          <p className="text-sm text-content-tertiary mt-2 max-w-md mx-auto">
            Link your accounts in Settings → Integrations. After sync, pick which accounts to treat as savings below.
          </p>
          <TransitionLink
            to="/pro/settings?tab=integrations"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-brand-cta px-5 py-2.5 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover"
          >
            Go to Integrations
          </TransitionLink>
        </div>
      )}

      {bankConnected && plaidAccounts.length === 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
          <p className="text-content-primary text-sm">
            Accounts from your bank will show here after the next successful sync
            {plaidLastSyncAt ? ` (last sync ${new Date(plaidLastSyncAt).toLocaleString()}).` : '.'}
          </p>
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={syncing}
            className="mt-3 text-sm font-medium text-brand-cta hover:underline"
          >
            Run sync now
          </button>
        </div>
      )}

      {bankConnected && plaidAccounts.length > 0 && (
        <CollapsibleModule title="Linked accounts" icon={BillingIcon} defaultOpen>
          <ul className="divide-y divide-surface-border">
            {plaidAccounts.map((acc) => (
              <li key={acc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-content-primary">{acc.name}</p>
                  <p className="text-xs text-content-tertiary mt-0.5">
                    {[acc.accountSubtype, acc.mask ? `···${acc.mask}` : null].filter(Boolean).join(' · ') || acc.accountType}
                    {acc.subtypeSuggestedSavings && (
                      <span className="ml-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400">
                        Suggested
                      </span>
                    )}
                  </p>
                </div>
                <label className={`inline-flex items-center gap-2 shrink-0 ${savingAccountId === acc.id ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <span className="text-xs text-content-secondary">{savingAccountId === acc.id ? 'Saving...' : 'Track on Savings page'}</span>
                  <input
                    type="checkbox"
                    className="rounded border-surface-border text-brand-cta focus:ring-brand-cta disabled:opacity-60"
                    checked={acc.includeInSavings}
                    disabled={savingAccountId === acc.id}
                    onChange={(e) => void onToggleSavingsAccount(acc.id, e.target.checked)}
                  />
                </label>
              </li>
            ))}
          </ul>
        </CollapsibleModule>
      )}

      {bankConnected && trackedPlaidIds.size > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
              <p className="text-xs text-content-tertiary uppercase tracking-wide">In (90 days)</p>
              <p className="mt-2 text-2xl font-mono tabular-nums text-emerald-400 data-numeric">
                ${totals90.inflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
              <p className="text-xs text-content-tertiary uppercase tracking-wide">Out (90 days)</p>
              <p className="mt-2 text-2xl font-mono tabular-nums text-rose-400 data-numeric">
                ${totals90.outflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
              <p className="text-xs text-content-tertiary uppercase tracking-wide">Net</p>
              <p className="mt-2 text-2xl font-mono tabular-nums text-content-primary data-numeric">
                ${totals90.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <CollapsibleModule title="Recent activity (tracked accounts)" icon={ChartIcon} defaultOpen>
            {recentSavingsTx.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-content-tertiary">
                No Plaid transactions on these accounts in the last {DAYS_WINDOW} days. Try syncing or see all activity in{' '}
                <TransitionLink to="/pro/transactions" className="underline underline-offset-2">
                  Transactions
                </TransitionLink>
                .
              </p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {recentSavingsTx.slice(0, 50).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {t.type === 'income' ? (
                        <ArrowDownRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-content-primary truncate">{t.name}</p>
                        <p className="text-xs text-content-tertiary">
                          {t.date} · {formatCategoryLabel(t.category)}
                          {accountLabel(t.plaidAccountId) ? ` · ${accountLabel(t.plaidAccountId)}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono tabular-nums text-sm data-numeric">
                      {t.type === 'income' ? '+' : '−'}${t.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleModule>
        </>
      )}

      {bankConnected && plaidAccounts.length > 0 && trackedPlaidIds.size === 0 && (
        <p className="text-sm text-content-tertiary text-center py-8 rounded-md border border-dashed border-surface-border">
          Turn on &quot;Track on Savings page&quot; for at least one account to see totals and activity.
        </p>
      )}

      <p className="text-xs text-content-tertiary">
        Named savings goals live on{' '}
        <TransitionLink to="/goals" className="underline underline-offset-2 text-content-secondary">
          Goals
        </TransitionLink>
        .
      </p>
    </div>
  );
}
