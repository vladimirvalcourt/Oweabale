import React, { useState, useMemo } from 'react';
import { useStore, type InsurancePolicy } from '../store/useStore';
import { Shield, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeToMonthly } from '../lib/finance';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { AppPageShell } from '../components/AppPageShell';
import { Dialog } from '@headlessui/react';

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

export default function Insurance() {
  const { insurancePolicies, addInsurancePolicy, editInsurancePolicy, deleteInsurancePolicy } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

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
    const ok = editingId
      ? await editInsurancePolicy(editingId, payload)
      : await addInsurancePolicy(payload);
    if (!ok) return;
    toast.success(editingId ? 'Policy updated' : 'Policy added');
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteInsurancePolicy(id);
    if (ok) toast.success('Policy removed');
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const ms = new Date(dateStr).getTime();
    return ms > Date.now() && ms - Date.now() < 60 * 86400000;
  };

  return (
    <AppPageShell>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">Insurance</h1>
            <p className="text-sm text-content-tertiary mt-1">Make sure you&apos;re covered where it counts.</p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add Policy
          </button>
        </div>

        {/* Coverage Audit */}
        <CollapsibleModule title="Coverage Audit" icon={Shield} defaultOpen>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CORE_COVERAGE.map(({ key, label, desc }) => {
              const covered = key === 'renters/homeowners'
                ? hasPropertyCoverage
                : coveredTypes.has(key as InsurancePolicy['type']);
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-sm border p-3 ${
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
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
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
          <div className="rounded-sm border border-surface-border bg-surface-elevated px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-content-secondary">{activePolicies.length} active {activePolicies.length === 1 ? 'policy' : 'policies'}</p>
            <p className="text-sm font-semibold text-content-primary">
              ${monthlyPremiumTotal.toFixed(2)}<span className="text-xs font-normal text-content-tertiary">/mo total</span>
            </p>
          </div>
        )}

        {/* Policy List */}
        {insurancePolicies.length === 0 ? (
          <div className="rounded-sm border border-surface-border bg-surface-elevated p-12 text-center">
            <div className="w-14 h-14 bg-surface-base rounded-sm flex items-center justify-center mx-auto mb-4 border border-surface-border">
              <Shield className="w-7 h-7 text-content-muted" />
            </div>
            <h3 className="text-base font-semibold text-content-primary mb-2">No policies tracked yet</h3>
            <p className="text-sm text-content-tertiary mb-6 max-w-sm mx-auto">
              Add your insurance policies to audit your coverage gaps and track monthly premiums.
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              Add your first policy
            </button>
          </div>
        ) : (
          <CollapsibleModule title="Your Policies" icon={Shield} defaultOpen>
            <div className="space-y-3 -mx-6 -my-6 p-6">
              {insurancePolicies.map(policy => (
                <div
                  key={policy.id}
                  className="flex items-start justify-between gap-4 rounded-sm border border-surface-border bg-surface-base p-4 hover:border-white/15 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-content-primary">{policy.provider}</span>
                      <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                        {TYPE_LABELS[policy.type]}
                      </span>
                      {policy.status !== 'active' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          {policy.status}
                        </span>
                      )}
                      {isExpiringSoon(policy.expirationDate) && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
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
                      className="p-1.5 rounded-sm text-content-tertiary hover:text-content-primary hover:bg-surface-highlight transition-colors"
                      aria-label="Edit policy"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy.id)}
                      className="p-1.5 rounded-sm text-content-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-lg rounded-sm border border-surface-border bg-surface-elevated shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-surface-border">
                <Dialog.Title className="text-base font-semibold text-content-primary">
                  {editingId ? 'Edit Policy' : 'Add Policy'}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-sm text-content-tertiary hover:text-content-primary hover:bg-surface-highlight transition-colors"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Expiration date</label>
                    <input
                      type="date"
                      value={form.expirationDate}
                      onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-content-secondary mb-1.5">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Policy number, agent contact, etc."
                      className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="inline-flex items-center gap-2 rounded-sm border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-content-secondary hover:text-content-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white"
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
