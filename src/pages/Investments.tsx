import React, { useState } from 'react';
import { useStore, type InvestmentAccount } from '../store/useStore';
import { TrendingUp, Plus, Edit2, Trash2, Building2, X } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { AppPageShell } from '../components/AppPageShell';
import { Dialog } from '@headlessui/react';

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
  '401k': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  '403b': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  ira: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  roth_ira: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  brokerage: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  hsa: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  other: 'bg-surface-elevated text-content-tertiary border-surface-border',
};

const EMPTY_FORM = {
  name: '',
  type: 'brokerage' as InvestmentAccount['type'],
  institution: '',
  balance: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

export default function Investments() {
  const { investmentAccounts, addInvestmentAccount, editInvestmentAccount, deleteInvestmentAccount } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const totalPortfolio = investmentAccounts.reduce((sum, a) => sum + a.balance, 0);

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
    const ok = await deleteInvestmentAccount(id);
    if (!ok) return;
    toast.success('Account removed');
  };

  // Group balances by type for summary breakdown
  const byType = investmentAccounts.reduce<Partial<Record<InvestmentAccount['type'], number>>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + a.balance;
    return acc;
  }, {});

  return (
    <AppPageShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Investment accounts</h1>
            <p className="mt-1 text-sm font-medium text-content-secondary">Track your portfolio across all accounts.</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-none transition-colors hover:bg-neutral-200 focus-app"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            Add Account
          </button>
        </div>

        {/* Summary bar */}
        {investmentAccounts.length > 0 && (
          <CollapsibleModule
            title="Portfolio overview"
            icon={TrendingUp}
            extraHeader={
              <span className="text-sm font-mono tabular-nums font-semibold text-content-primary">
                ${totalPortfolio.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
            }
          >
            <div className="-mx-6 -my-6 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface-elevated rounded-lg border border-surface-border p-5">
                  <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-2">Total Portfolio Value</p>
                  <p className="text-3xl font-bold font-mono tabular-nums text-content-primary">
                    ${totalPortfolio.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-content-tertiary mt-1">
                    Across {investmentAccounts.length} account{investmentAccounts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-surface-elevated rounded-lg border border-surface-border p-5">
                  <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3">Breakdown by Type</p>
                  <ul className="space-y-1.5">
                    {(Object.entries(byType) as [InvestmentAccount['type'], number][]).map(([type, amount]) => {
                      const pct = totalPortfolio > 0 ? ((amount / totalPortfolio) * 100).toFixed(0) : '0';
                      return (
                        <li key={type} className="flex items-center justify-between text-xs">
                          <span className="text-content-secondary">
                            {TYPE_LABELS[type]}
                          </span>
                          <span className="font-mono tabular-nums text-content-primary">
                            ${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                            <span className="text-content-tertiary ml-1.5">({pct}%)</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* Inline account type summary pills */}
              <div className="flex flex-wrap gap-2">
                {investmentAccounts.map((a) => (
                  <span
                    key={a.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-xs ${TYPE_BADGE[a.type]}`}
                  >
                    {TYPE_LABELS[a.type]}
                    {a.institution ? ` · ${a.institution}` : ''}
                    {' · '}
                    ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                ))}
              </div>
            </div>
          </CollapsibleModule>
        )}

        {/* Empty state */}
        {investmentAccounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-border bg-surface-raised p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-surface-border bg-surface-elevated">
              <TrendingUp className="w-8 h-8 text-content-muted" />
            </div>
            <h3 className="mb-2 text-lg font-medium tracking-tight text-content-primary">No investment accounts yet</h3>
            <p className="mx-auto mb-8 max-w-sm text-sm font-medium text-content-secondary">
              Add your 401(k), IRA, brokerage, and HSA balances so net worth and planning stay accurate.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mx-auto inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-medium text-black shadow-none transition-colors hover:bg-neutral-200 focus-app"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden />
              Add Account
            </button>
          </div>
        ) : (
          /* Account list */
          <CollapsibleModule title="Your accounts" icon={Building2}>
            <ul className="divide-y divide-surface-highlight -mx-6 -my-6">
              {investmentAccounts.map((account) => (
                <li
                  key={account.id}
                  className="p-4 sm:px-6 hover:bg-surface-elevated transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-base">
                      <TrendingUp className="w-4 h-4 text-content-muted" />
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
                          <Building2 className="w-3 h-3 shrink-0" />
                          {account.institution}
                        </p>
                      )}
                      {account.notes && (
                        <p className="text-xs text-content-tertiary mt-0.5 truncate max-w-xs">{account.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto">
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono tabular-nums text-content-primary">
                        ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </p>
                      {account.lastUpdated && (
                        <p className="text-[10px] text-content-tertiary mt-0.5">
                          Updated {new Date(account.lastUpdated).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(account)}
                        className="p-2 text-content-tertiary hover:text-content-secondary rounded-md hover:bg-surface-elevated transition-colors"
                        title="Edit account"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="p-2 text-content-tertiary hover:text-rose-400 rounded-md hover:bg-surface-elevated transition-colors"
                        title="Delete account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleModule>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-lg rounded-lg border border-surface-border bg-surface-raised shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <Dialog.Title className="text-base font-semibold text-content-primary">
                {editingId ? 'Edit Account' : 'Add Investment Account'}
              </Dialog.Title>
              <button
                onClick={closeModal}
                className="rounded-md p-1 text-content-tertiary transition-colors hover:text-content-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Account Name */}
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

                {/* Account Type */}
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

                {/* Institution */}
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

                {/* Balance */}
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

                {/* Notes */}
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
                  className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-transparent px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-white/[0.04] hover:text-content-primary focus-app"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-none transition-colors hover:bg-neutral-200 focus-app"
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
