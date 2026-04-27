import React, { useState } from 'react';
import { useStore, type InvestmentAccount } from '../store';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Building2,
  X,
  Landmark,
  PiggyBank,
  LineChart,
  HeartPulse,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppPageShell } from '../components/layout';
import { Dialog } from '@headlessui/react';
import { yieldForPaint } from '../lib/utils';
import { cn } from '../lib/utils';
import { TransitionLink } from '../components/common';

const TYPE_LABELS: Record<InvestmentAccount['type'], string> = {
  brokerage: 'Brokerage',
  ira: 'Traditional IRA',
  roth_ira: 'Roth IRA',
  '401k': '401(k)',
  '403b': '403(b)',
  hsa: 'HSA',
  other: 'Other',
};

const TYPE_BADGE: Record<InvestmentAccount['type'], string> = {
  '401k': 'border-surface-border bg-surface-base text-content-secondary',
  '403b': 'border-surface-border bg-surface-base text-content-secondary',
  ira: 'border-surface-border bg-surface-base text-content-secondary',
  roth_ira: 'border-surface-border bg-surface-base text-content-secondary',
  brokerage: 'border-content-primary/15 bg-content-primary/[0.06] text-content-primary',
  hsa: 'border-surface-border bg-surface-base text-content-secondary',
  other: 'border-surface-border bg-surface-elevated text-content-tertiary',
};

const EMPTY_FORM = {
  name: '',
  type: 'brokerage' as InvestmentAccount['type'],
  institution: '',
  balance: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

function formatMoney(n: number, opts?: { maximumFractionDigits?: number }) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  });
}

function formatSignedMoney(n: number) {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const abs = Math.abs(n);
  return `${sign}$${formatMoney(abs)}`;
}

function formatRelativeTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function InvestmentsPageSkeleton() {
  const bar = (className?: string) => (
    <div className={cn('rounded-md skeleton-shimmer h-4', className)} />
  );
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading investments">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {bar('h-20 sm:h-24 w-full')}
        {bar('h-20 sm:h-24 w-full')}
        {bar('h-20 sm:h-24 w-full')}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="skeleton-shimmer h-3 w-32 rounded-md" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5 flex gap-4"
            >
              <div className="skeleton-shimmer rounded-lg w-10 h-10 shrink-0" />
              <div className="flex-1 space-y-2">
                {bar('h-3 w-48')}
                {bar('h-3 w-20')}
                <div className="flex gap-2 pt-1">
                  {bar('h-5 w-16')}
                  {bar('h-4 w-24')}
                </div>
              </div>
              <div className="hidden sm:block space-y-2 text-right shrink-0 w-24">
                {bar('h-5 w-full')}
                {bar('h-3 w-full')}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-raised p-5 space-y-4">
          {bar('h-3 w-40')}
          <div className="skeleton-shimmer mx-auto h-36 w-36 rounded-full" />
          {bar('h-3 w-full')}
          {bar('h-3 max-w-[85%]')}
        </div>
      </div>
    </div>
  );
}

function PortfolioVsDebtWidget({
  portfolio,
  debt,
}: {
  portfolio: number;
  debt: number;
}) {
  const total = portfolio + debt;
  const invPct = total > 0 ? (portfolio / total) * 100 : 50;
  const debtPct = total > 0 ? (debt / total) * 100 : 50;
  const invDeg = total > 0 ? (portfolio / total) * 360 : 180;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-5 sm:p-6">
      <h3 className="metric-label mb-1 normal-case">Portfolio vs. debt</h3>
      <p className="text-sm text-content-secondary mb-5 leading-relaxed">
        Invested assets vs. liabilities — the same lens as net worth, without leaving Oweable.
      </p>

      <div className="flex flex-col items-center gap-5">
        <div className="relative h-36 w-36 shrink-0" aria-hidden>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                total <= 0
                  ? 'conic-gradient(var(--color-surface-elevated) 0deg 360deg)'
                  : `conic-gradient(var(--color-brand-profit) 0deg ${invDeg}deg, var(--color-brand-expense) ${invDeg}deg 360deg)`,
            }}
          />
          <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full border border-surface-border bg-surface-base text-center px-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-content-tertiary">Mix</span>
            <span className="text-sm font-mono font-semibold tabular-nums text-content-primary">
              {total > 0 ? `${Math.round(invPct)}%` : '—'}
            </span>
            <span className="text-[10px] text-content-tertiary">invested</span>
          </div>
        </div>

        <div className="h-2 w-full max-w-xs rounded-full overflow-hidden flex bg-surface-elevated border border-surface-border">
          {portfolio > 0 && (
            <div
              className="h-full bg-brand-profit min-w-[4px] transition-all"
              style={{ width: `${invPct}%` }}
              title={`Investments $${formatMoney(portfolio)}`}
            />
          )}
          {debt > 0 && (
            <div
              className="h-full bg-brand-expense min-w-[4px] transition-all"
              style={{ width: `${debtPct}%` }}
              title={`Debt $${formatMoney(debt)}`}
            />
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 text-xs">
        <span className="inline-flex items-center justify-between gap-2 text-content-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-profit" aria-hidden />
            Investments
          </span>
          <span className="font-mono tabular-nums text-content-primary">${formatMoney(portfolio)}</span>
        </span>
        <span className="inline-flex items-center justify-between gap-2 text-content-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-expense" aria-hidden />
            Debt
          </span>
          <span className="font-mono tabular-nums text-content-primary">${formatMoney(debt)}</span>
        </span>
      </div>
      {total === 0 && (
        <p className="text-xs text-content-tertiary mt-4">Add investment accounts and debts to see this comparison.</p>
      )}
    </div>
  );
}

function AccountTypeIconCluster() {
  const tile = (Icon: typeof Landmark, label: string) => (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-surface-base px-3 py-3 min-w-[4.75rem]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
      )}
    >
      <Icon className="w-5 h-5 text-content-secondary" aria-hidden />
      <span className="text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-content-tertiary">{label}</span>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-hidden>
      {tile(Landmark, '401(k)')}
      {tile(PiggyBank, 'IRA')}
      {tile(LineChart, 'Brokerage')}
      {tile(HeartPulse, 'HSA')}
    </div>
  );
}

export default function Investments() {
  const {
    investmentAccounts,
    debts,
    user,
    phase2Hydrated,
    addInvestmentAccount,
    editInvestmentAccount,
    deleteInvestmentAccount,
  } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const userId = user?.id ?? '';
  const today = new Date().toISOString().split('T')[0];

  const totalPortfolio = investmentAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalDebt = debts.reduce((sum, d) => sum + (d.remaining || 0), 0);

  /** Session baselines (read/write sessionStorage during render — intentional for lightweight client metrics). */
  const dayStartPortfolio = (() => {
    if (!phase2Hydrated || !userId) return null;
    const dayKey = `oweable:inv-port-day-total:${userId}:${today}`;
    let raw = sessionStorage.getItem(dayKey);
    if (raw === null) {
      raw = String(totalPortfolio);
      sessionStorage.setItem(dayKey, raw);
    }
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : totalPortfolio;
  })();

  const accountDeltas: Record<string, number | null> = (() => {
    if (!phase2Hydrated || !userId) return {};
    const next: Record<string, number | null> = {};
    for (const a of investmentAccounts) {
      const key = `oweable:inv-prev-bal:${userId}:${a.id}`;
      const raw = sessionStorage.getItem(key);
      const prev = raw === null ? null : parseFloat(raw);
      next[a.id] =
        prev === null || !Number.isFinite(prev) ? null : a.balance - prev;
      sessionStorage.setItem(key, String(a.balance));
    }
    return next;
  })();

  const todayPortfolioDelta = dayStartPortfolio !== null ? totalPortfolio - dayStartPortfolio : 0;

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (account: InvestmentAccount) => {
    setEditingId(account.id);
    setForm({
      name: account.name,
      type: account.type,
      institution: account.institution,
      balance: account.balance.toString(),
      notes: account.notes,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Account name is required');
      return;
    }
    if (!form.balance || isNaN(Number(form.balance))) {
      toast.error('A valid balance is required');
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim(),
      balance: Number(form.balance),
      notes: form.notes.trim(),
    };

    await yieldForPaint();
    if (editingId) {
      const ok = await editInvestmentAccount(editingId, payload);
      if (!ok) return;
      toast.success('Account updated');
    } else {
      const ok = await addInvestmentAccount(payload);
      if (!ok) return;
      toast.success('Account added');
    }

    closeModal();
  };

  const handleDelete = async (id: string) => {
    await yieldForPaint();
    const ok = await deleteInvestmentAccount(id);
    if (!ok) return;
    toast.success('Account removed');
  };

  const showSkeleton = !phase2Hydrated;
  const isEmpty = phase2Hydrated && investmentAccounts.length === 0;
  const hasAccounts = phase2Hydrated && investmentAccounts.length > 0;

  return (
    <AppPageShell>
      <div className="space-y-6 w-full pb-4">
        {/* Stable header — avoids layout jump; CTA only when user has accounts (single empty-state CTA otherwise). */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="section-label mb-2">Investments</p>
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">Investment accounts</h1>
            <p className="mt-2 text-sm text-content-secondary max-w-xl leading-relaxed">
              See how your investments stack up against your debt and net worth — all in one place.
            </p>
          </div>
          {hasAccounts && !showSkeleton && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-lg bg-content-primary px-4 py-2 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app shrink-0 self-end sm:self-start btn-tactile"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              + Add Account
            </button>
          )}
        </div>

        {showSkeleton ? (
          <InvestmentsPageSkeleton />
        ) : (
          <>
            {isEmpty && (
              <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised p-8 sm:p-12 text-center shadow-none">
                <AccountTypeIconCluster />
                <h2 className="mt-8 text-xl font-semibold tracking-tight text-content-primary sm:text-2xl">
                  See your full financial picture
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-content-secondary leading-relaxed">
                  Connect your 401(k), IRA, brokerage, or HSA to track your total net worth in real time — including how
                  your investments are moving against your debt payoff progress.
                </p>
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-8 inline-flex items-center gap-2 rounded-lg bg-content-primary px-8 py-3 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app btn-tactile"
                >
                  <Plus className="w-4 h-4 shrink-0" aria-hidden />
                  Add Investment Account
                </button>
                <p className="mt-5 text-xs text-content-tertiary max-w-md mx-auto leading-relaxed">
                  Enter balances manually — we&apos;ll track changes over time and show them next to debt in{' '}
                  <span className="text-content-secondary">Portfolio vs. debt</span>. Not synced via Plaid; Settings
                  linking is for bank cash flow, not holdings.{' '}
                  <TransitionLink to="/net-worth" className="text-content-secondary underline underline-offset-2">
                    Open net worth
                  </TransitionLink>{' '}
                  to see the full picture once you add accounts.
                </p>
              </div>
            )}

            {hasAccounts && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5">
                    <p className="metric-label normal-case">Total portfolio value</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-content-primary">
                      ${formatMoney(totalPortfolio)}
                    </p>
                    <p className="text-xs text-content-tertiary mt-1">
                      {investmentAccounts.length} account{investmentAccounts.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5">
                    <p className="metric-label normal-case">Today&apos;s change ($)</p>
                    <p
                      className={cn(
                        'mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums',
                        todayPortfolioDelta > 0
                          ? 'text-brand-profit'
                          : todayPortfolioDelta < 0
                            ? 'text-brand-expense'
                            : 'text-content-primary'
                      )}
                    >
                      {formatSignedMoney(todayPortfolioDelta)}
                    </p>
                    <p className="text-xs text-content-tertiary mt-1">Since first load today · manual balances</p>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5">
                    <p className="metric-label normal-case">Total return (%)</p>
                    <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-content-tertiary">
                      —
                    </p>
                    <p className="text-xs text-content-tertiary mt-1">Needs cost basis — coming later</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-3">
                    <h2 className="section-label">Your accounts</h2>
                    <ul className="space-y-3">
                      {investmentAccounts.map((account) => {
                        const delta = accountDeltas[account.id];
                        const deltaUnknown = delta === null || delta === undefined;
                        return (
                          <li
                            key={account.id}
                            className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-4 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-base">
                                <TrendingUp className="w-4 h-4 text-content-muted" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-semibold text-content-primary">{account.name}</h4>
                                  <span
                                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${TYPE_BADGE[account.type]}`}
                                  >
                                    {TYPE_LABELS[account.type]}
                                  </span>
                                </div>
                                {account.institution && (
                                  <p className="text-xs text-content-tertiary mt-1 flex items-center gap-1">
                                    <Building2 className="w-3 h-3 shrink-0" aria-hidden />
                                    {account.institution}
                                  </p>
                                )}
                                {account.notes && (
                                  <p className="text-xs text-content-tertiary mt-0.5 truncate max-w-md">{account.notes}</p>
                                )}
                                <p className="text-[11px] text-content-tertiary mt-2">
                                  Last updated {formatRelativeTime(account.lastUpdated)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                              <div className="text-right space-y-0.5">
                                <p className="text-xl font-bold font-mono tabular-nums text-content-primary">
                                  ${formatMoney(account.balance)}
                                </p>
                                <p
                                  className={cn(
                                    'text-xs font-mono tabular-nums',
                                    deltaUnknown
                                      ? 'text-content-tertiary'
                                      : delta > 0
                                        ? 'text-brand-profit'
                                        : delta < 0
                                          ? 'text-brand-expense'
                                          : 'text-content-tertiary'
                                  )}
                                >
                                  {deltaUnknown
                                    ? 'Change —'
                                    : `${formatSignedMoney(delta)} since last visit`}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEdit(account)}
                                  className="p-2 text-content-tertiary hover:text-content-secondary rounded-md hover:bg-surface-elevated transition-colors"
                                  title="Edit account"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(account.id)}
                                  className="p-2 text-content-tertiary hover:text-rose-400 rounded-md hover:bg-surface-elevated transition-colors"
                                  title="Delete account"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <PortfolioVsDebtWidget portfolio={totalPortfolio} debt={totalDebt} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <Dialog.Title className="text-base font-semibold text-content-primary">
                {editingId ? 'Edit account' : 'Add investment account'}
              </Dialog.Title>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-content-tertiary transition-colors hover:text-content-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <p className="text-xs text-content-tertiary leading-relaxed -mt-1">
                Enter your current balance and update it anytime. Values stay in Oweable only — not pulled from your
                broker or Plaid.
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    Account name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary transition-colors"
                    placeholder="e.g., Fidelity 401(k)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">Account type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as InvestmentAccount['type'] })}
                    className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary transition-colors"
                  >
                    <option value="brokerage">Brokerage</option>
                    <option value="ira">Traditional IRA</option>
                    <option value="roth_ira">Roth IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="403b">403(b)</option>
                    <option value="hsa">HSA</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">Institution</label>
                  <input
                    type="text"
                    value={form.institution}
                    onChange={(e) => setForm({ ...form, institution: e.target.value })}
                    className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary transition-colors"
                    placeholder="e.g., Fidelity"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    Current balance <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.balance}
                      onChange={(e) => setForm({ ...form, balance: e.target.value })}
                      className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base py-2 pl-7 pr-3 font-mono text-sm text-content-primary transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="focus-app-field w-full resize-none rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary transition-colors"
                    placeholder="Optional notes…"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-content-primary/[0.04] hover:text-content-primary focus-app"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
                >
                  {editingId ? 'Save changes' : 'Add account'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </AppPageShell>
  );
}
