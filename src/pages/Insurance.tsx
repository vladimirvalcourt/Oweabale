import React, { useState, useMemo } from 'react';
import { useStore, type InsurancePolicy } from '../store';
import { Shield, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeToMonthly } from '../lib/api/services/finance';
import { CollapsibleModule } from '../components/common';
import { AppPageShell } from '../components/layout';
import { Dialog } from '@headlessui/react';
import { yieldForPaint } from '../lib/utils';
import { getCustomIcon } from '../lib/utils';

const TYPE_LABELS: Record<InsurancePolicy['type'], string> = {
  health: 'Health', life: 'Life', auto: 'Auto', renters: 'Renters',
  homeowners: 'Homeowners', disability: 'Disability', umbrella: 'Umbrella',
  dental: 'Dental', vision: 'Vision', other: 'Other',
};

const CORE_COVERAGE: { key: InsurancePolicy['type'] | 'renters/homeowners'; label: string; desc: string }[] = [
  { key: 'health', label: 'Health', desc: 'Medical expenses & hospitalization' },
  { key: 'life', label: 'Life', desc: 'Income replacement for dependents' },
  { key: 'auto', label: 'Auto', desc: 'Vehicle liability & collision' },
  { key: 'renters/homeowners', label: 'Renters / Homeowners', desc: 'Property & personal belongings' },
  { key: 'disability', label: 'Disability', desc: 'Income protection if you can\'t work' },
  { key: 'umbrella', label: 'Umbrella', desc: 'Extra liability beyond other policies' },
];

const EMPTY_FORM = {
  type: 'health' as InsurancePolicy['type'],
  provider: '',
  premium: '',
  frequency: 'Monthly',
  coverageAmount: '',
  deductible: '',
  expirationDate: '',
  status: 'active' as InsurancePolicy['status'],
  notes: '',
};

const INSURANCE_BANNER_KEY = 'oweable_insurance_banner_dismissed';

export default function Insurance() {
  const SecurityIcon = getCustomIcon('security');
  const { insurancePolicies, addInsurancePolicy, editInsurancePolicy, deleteInsurancePolicy } = useStore();
  const [insuranceNowMs] = useState(() => Date.now());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // PAGE-06: first-visit explainer banner
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(INSURANCE_BANNER_KEY) === 'true',
  );
  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem(INSURANCE_BANNER_KEY, 'true'); } catch { /* ignore */ }
  };

  const activePolicies = useMemo(() =>
    insurancePolicies.filter(p => p.status === 'active'),
    [insurancePolicies]
  );

  const coveredTypes = useMemo(() =>
    new Set(activePolicies.map(p => p.type)),
    [activePolicies]
  );

  const hasPropertyCoverage = coveredTypes.has('renters') || coveredTypes.has('homeowners');

  const monthlyPremiumTotal = useMemo(() =>
    activePolicies.reduce((sum, p) => sum + normalizeToMonthly(p.premium, p.frequency), 0),
    [activePolicies]
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (policy: InsurancePolicy) => {
    setEditingId(policy.id);
    setForm({
      type: policy.type,
      provider: policy.provider,
      premium: policy.premium.toString(),
      frequency: policy.frequency,
      coverageAmount: policy.coverageAmount?.toString() ?? '',
      deductible: policy.deductible?.toString() ?? '',
      expirationDate: policy.expirationDate ?? '',
      status: policy.status,
      notes: policy.notes,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provider || !form.premium) {
      toast.error('Provider and premium are required.');
      return;
    }
    const payload = {
      type: form.type,
      provider: form.provider,
      premium: Number(form.premium),
      frequency: form.frequency,
      coverageAmount: form.coverageAmount ? Number(form.coverageAmount) : undefined,
      deductible: form.deductible ? Number(form.deductible) : undefined,
      expirationDate: form.expirationDate || undefined,
      status: form.status,
      notes: form.notes,
    };
    await yieldForPaint();
    const ok = editingId
      ? await editInsurancePolicy(editingId, payload)
      : await addInsurancePolicy(payload);
    if (!ok) return;
    toast.success(editingId ? 'Policy updated' : 'Policy added');
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    await yieldForPaint();
    const ok = await deleteInsurancePolicy(id);
    if (ok) toast.success('Policy removed');
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const ms = new Date(dateStr).getTime();
    return ms > insuranceNowMs && ms - insuranceNowMs < 60 * 86400000;
  };

  return (
    <AppPageShell>
      <div className="space-y-6 w-full max-w-4xl mx-auto pb-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Insurance</h1>
            <p className="mt-1 text-sm font-medium text-content-secondary">Coverage audit, premiums, and renewal dates in one place.</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add Policy
          </button>
        </div>

        {/* PAGE-06: First-visit explainer banner — dismissable */}
        {!bannerDismissed && (
          <div className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-raised p-4">
            <Shield className="h-5 w-5 shrink-0 text-content-secondary mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">Why track insurance here?</p>
              <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                Your premiums are a fixed monthly cost — seeing them alongside bills gives you a complete picture of your true monthly obligations.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              className="shrink-0 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:bg-surface-elevated"
            >
              Got it
            </button>
          </div>
        )}

        {/* Coverage Audit */}
        <CollapsibleModule title="Coverage Audit" icon={SecurityIcon} defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CORE_COVERAGE.map(({ key, label, desc }) => {
              const covered = key === 'renters/homeowners'
                ? hasPropertyCoverage
                : coveredTypes.has(key as InsurancePolicy['type']);
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    covered
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  {covered
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="text-sm font-medium text-content-primary flex items-center gap-2">
                      {label}
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        covered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {covered ? 'Covered' : 'Gap'}
                      </span>
                    </p>
                    <p className="text-xs text-content-tertiary mt-0.5">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleModule>

        {/* Summary */}
        {activePolicies.length > 0 && (
          <div className="flex items-center justify-between rounded-md border border-surface-border bg-surface-elevated px-4 py-3">
            <p className="text-sm text-content-secondary">{activePolicies.length} active {activePolicies.length === 1 ? 'policy' : 'policies'}</p>
            <p className="text-sm font-semibold text-content-primary">
              ${monthlyPremiumTotal.toFixed(2)}<span className="text-xs font-normal text-content-tertiary">/mo total</span>
            </p>
          </div>
        )}

        {/* Policy List */}
        {insurancePolicies.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-surface-elevated p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-surface-border bg-surface-base">
              <Shield className="w-7 h-7 text-content-muted" />
            </div>
            <h3 className="mb-2 text-base font-medium text-content-primary">No policies yet</h3>
            <p className="mx-auto mb-6 max-w-sm text-sm font-medium text-content-secondary">
              Add policies to spot coverage gaps and keep premiums and renewals visible next to the rest of your money.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-4 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Add your first policy
            </button>
          </div>
        ) : (
          <CollapsibleModule title="Your Policies" icon={SecurityIcon} defaultOpen>
            <div className="space-y-3 -mx-6 -my-6 p-6">
              {insurancePolicies.map(policy => (
                <div
                  key={policy.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-surface-border bg-surface-base p-4 transition-colors hover:border-content-primary/15"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-content-primary">{policy.provider}</span>
                      <span className="rounded-full border border-surface-border bg-content-primary/[0.04] px-2 py-0.5 text-xs font-semibold text-content-secondary">
                        {TYPE_LABELS[policy.type]}
                      </span>
                      {policy.status !== 'active' && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          {policy.status}
                        </span>
                      )}
                      {isExpiringSoon(policy.expirationDate) && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Expires soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-content-secondary mt-1">
                      ${policy.premium.toLocaleString()} / {policy.frequency}
                      {policy.coverageAmount && (
                        <span className="text-content-tertiary"> · ${policy.coverageAmount.toLocaleString()} coverage</span>
                      )}
                      {policy.deductible && (
                        <span className="text-content-tertiary"> · ${policy.deductible.toLocaleString()} deductible</span>
                      )}
                    </p>
                    {policy.expirationDate && (
                      <p className="text-xs text-content-tertiary mt-0.5">Expires {policy.expirationDate}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(policy)}
                      className="rounded-md p-1.5 text-content-tertiary transition-colors hover:bg-surface-raised hover:text-content-primary"
                      aria-label="Edit policy"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy.id)}
                      className="rounded-md p-1.5 text-content-tertiary transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label="Delete policy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleModule>
        )}

        {/* Add / Edit Modal */}
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-elevated shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-surface-border">
                <Dialog.Title className="text-base font-semibold text-content-primary">
                  {editingId ? 'Edit Policy' : 'Add Policy'}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md p-1.5 text-content-tertiary transition-colors hover:bg-surface-raised hover:text-content-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as InsurancePolicy['type'] }))}
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    >
                      {(Object.keys(TYPE_LABELS) as InsurancePolicy['type'][]).map(t => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value as InsurancePolicy['status'] }))}
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Provider *</label>
                    <input
                      type="text"
                      required
                      value={form.provider}
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      placeholder="e.g. Blue Cross, Geico, State Farm"
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Premium *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={form.premium}
                      onChange={e => setForm(f => ({ ...f, premium: e.target.value }))}
                      placeholder="0.00"
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    >
                      {['Monthly', 'Yearly', 'Bi-weekly', 'Weekly'].map(fr => (
                        <option key={fr} value={fr}>{fr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Coverage limit ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.coverageAmount}
                      onChange={e => setForm(f => ({ ...f, coverageAmount: e.target.value }))}
                      placeholder="Optional"
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Deductible ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.deductible}
                      onChange={e => setForm(f => ({ ...f, deductible: e.target.value }))}
                      placeholder="Optional"
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Expiration date</label>
                    <input
                      type="date"
                      value={form.expirationDate}
                      onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                      className="focus-app-field w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Policy number, agent contact, etc."
                      className="focus-app-field w-full resize-none rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center gap-2 rounded-md border border-surface-border bg-transparent px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-content-primary/[0.04] hover:text-content-primary focus-app"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-brand-cta px-4 py-2 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover focus-app"
                  >
                    {editingId ? 'Save Changes' : 'Add Policy'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>

      </div>
    </AppPageShell>
  );
}
