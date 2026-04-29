import React, { useState, useMemo } from 'react';
import { useStore, type Subscription } from '../store';
import { normalizeToMonthly, detectUnusedSubscriptions } from '../lib/api/services/finance';
import { detectSubscriptionCandidates, type SubscriptionCandidate } from '../lib/api/services/subscriptionCandidates';
import { Repeat, Plus, Edit2, Trash2, TrendingUp, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/common';
import { BrandLogo } from '../components/common';
import { yieldForPaint } from '../lib/utils';
import { getCustomIcon } from '../lib/utils';
type SubFrequency = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly';

const SUB_FREQUENCIES: SubFrequency[] = ['Weekly', 'Bi-weekly', 'Monthly', 'Yearly'];
const CANCELLATION_REVIEW_STORAGE_KEY = 'oweable_subscription_cancellation_review_v1';
const SubscriptionsIcon = getCustomIcon('subscriptions');
const PlanningIcon = getCustomIcon('planning');

function toSubFrequency(value: string): SubFrequency {
  return SUB_FREQUENCIES.includes(value as SubFrequency) ? (value as SubFrequency) : 'Monthly';
}

function candidateToSubFrequency(label: string): SubFrequency {
  if (label === 'Weekly') return 'Weekly';
  if (label === 'Bi-weekly') return 'Bi-weekly';
  if (label === 'Yearly') return 'Yearly';
  return 'Monthly';
}

function nextBillingFromCandidate(c: SubscriptionCandidate): string {
  const last = c.sampleDates[c.sampleDates.length - 1] ?? new Date().toISOString().split('T')[0];
  const d = new Date(last.includes('T') ? last : `${last}T12:00:00`);
  if (c.frequencyLabel === 'Weekly') d.setDate(d.getDate() + 7);
  else if (c.frequencyLabel === 'Bi-weekly') d.setDate(d.getDate() + 14);
  else if (c.frequencyLabel === 'Yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

export default function Subscriptions() {
  const { subscriptions, transactions, addSubscription, editSubscription, deleteSubscription } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly' as SubFrequency,
    nextBillingDate: '',
    status: 'active' as 'active' | 'paused' | 'cancelled',
  });
  const [cancellationReviewIds, setCancellationReviewIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CANCELLATION_REVIEW_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const persistCancellationReviewIds = (ids: string[]) => {
    setCancellationReviewIds(ids);
    try {
      localStorage.setItem(CANCELLATION_REVIEW_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore storage failures
    }
  };

  const flagForCancellationReview = (id: string) => {
    if (cancellationReviewIds.includes(id)) return;
    persistCancellationReviewIds([id, ...cancellationReviewIds]);
    toast.success('Added to cancellation review queue');
  };

  const removeFromCancellationReview = (id: string) => {
    persistCancellationReviewIds(cancellationReviewIds.filter((subId) => subId !== id));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.nextBillingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    await yieldForPaint();
    const ok = await addSubscription({
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      nextBillingDate: formData.nextBillingDate,
      status: formData.status,
    });
    if (!ok) return;

    toast.success('Subscription added successfully');
    setIsAdding(false);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.name || !formData.amount || !formData.nextBillingDate) return;

    await yieldForPaint();
    const ok = await editSubscription(editingId, {
      name: formData.name,
      amount: Number(formData.amount),
      frequency: formData.frequency,
      nextBillingDate: formData.nextBillingDate,
      status: formData.status,
    });
    if (!ok) return;

    toast.success('Subscription updated');
    setEditingId(null);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const startEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      frequency: toSubFrequency(sub.frequency),
      nextBillingDate: sub.nextBillingDate,
      status: sub.status,
    });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
  };

  const handleDelete = async (id: string) => {
    await yieldForPaint();
    const ok = await deleteSubscription(id);
    if (!ok) return;
    toast.success('Subscription deleted');
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlyCost = activeSubscriptions.reduce(
    (acc, sub) => acc + normalizeToMonthly(sub.amount, sub.frequency),
    0
  );

  const subscriptionCandidates = useMemo(() => {
    const existing = new Set(subscriptions.map((s) => s.name.trim().toLowerCase()));
    return detectSubscriptionCandidates(transactions, existing);
  }, [transactions, subscriptions]);

  const unusedSubs = useMemo(() =>
    detectUnusedSubscriptions(subscriptions, transactions),
    [subscriptions, transactions]
  );

  // Price hike detector
  const hikedSubs = subscriptions.filter(sub => {
    const hist = sub.priceHistory;
    if (!hist || hist.length < 2) return false;
    const sorted = [...hist].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted[sorted.length - 1].amount > sorted[sorted.length - 2].amount;
  });

  const getPriceHike = (sub: typeof subscriptions[0]) => {
    const hist = sub.priceHistory;
    if (!hist || hist.length < 2) return null;
    const sorted = [...hist].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const prev = sorted[sorted.length - 2].amount;
    const curr = sorted[sorted.length - 1].amount;
    if (curr <= prev) return null;
    return { prev, curr, pct: (((curr - prev) / prev) * 100).toFixed(0) };
  };
  const cancellationQueue = subscriptions.filter((sub) => cancellationReviewIds.includes(sub.id));

  const detectedAmountChanges = useMemo(() => {
    const changes = new Map<string, { previous: number; detected: number; pct: number; txDate: string }>();
    for (const sub of subscriptions) {
      const matches = transactions
        .filter((tx) => tx.type === 'expense')
        .filter((tx) => tx.name.toLowerCase().includes(sub.name.toLowerCase()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (matches.length < 2) continue;
      const latest = matches[matches.length - 1];
      const previous = matches[matches.length - 2];
      if (!latest || !previous) continue;
      const delta = latest.amount - previous.amount;
      if (Math.abs(delta) < 0.5) continue;
      const pct = previous.amount > 0 ? (delta / previous.amount) * 100 : 0;
      changes.set(sub.id, {
        previous: previous.amount,
        detected: latest.amount,
        pct,
        txDate: latest.date,
      });
    }
    return changes;
  }, [subscriptions, transactions]);

  const applyDetectedPriceChange = async (sub: Subscription) => {
    const detected = detectedAmountChanges.get(sub.id);
    if (!detected) return;
    const nextHistory = [
      ...(sub.priceHistory ?? []),
      { date: detected.txDate, amount: detected.detected },
    ];
    await yieldForPaint();
    const ok = await editSubscription(sub.id, {
      amount: detected.detected,
      priceHistory: nextHistory,
    });
    if (!ok) return;
    toast.success(`Updated ${sub.name} to $${detected.detected.toFixed(2)} and saved price history.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Subscriptions</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">Recurring charges and renewal dates in one place.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
          }}
          className="px-4 py-2 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2 focus-app"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Add subscription
        </button>
      </div>

      {/* PAGE-03: Monthly total summary — shown when there are active subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-4 py-3 text-sm text-content-secondary">
          <span className="font-medium text-content-primary">
            Total monthly cost: ${monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-content-muted">·</span>
          <span>{activeSubscriptions.length} active subscription{activeSubscriptions.length !== 1 ? 's' : ''}</span>
          <span className="text-content-muted">·</span>
          <span>Annual equivalent: ${(monthlyCost * 12).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</span>
        </div>
      )}

      {activeSubscriptions.length === 0 && subscriptionCandidates.length > 0 && (
        <div className="rounded-xl border border-brand-cta/25 bg-brand-cta/10 p-4">
          <p className="text-sm font-medium text-content-primary">
            We detected {subscriptionCandidates.length} possible subscription{subscriptionCandidates.length === 1 ? '' : 's'} from
            your transactions —{' '}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('suggested-subscriptions');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-content-primary underline underline-offset-2 font-semibold"
            >
              Review suggestions
            </button>
          </p>
        </div>
      )}

      {subscriptionCandidates.length > 0 && (
        <div id="suggested-subscriptions" className="scroll-mt-24 rounded-xl border border-surface-border bg-surface-raised p-5">
          <h2 className="text-sm font-semibold text-content-primary mb-3">Suggested subscriptions</h2>
          <p className="text-xs text-content-tertiary mb-4">
            Based on repeating charges in your transactions. Confirm amount and next date after adding.
          </p>
          <ul className="space-y-3">
            {subscriptionCandidates.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-surface-base px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-content-primary">{c.name}</p>
                  <p className="text-xs text-content-tertiary mt-0.5">
                    ~${c.typicalAmount.toFixed(2)} · {c.frequencyLabel}
                    {c.confidence === 'high' ? ' · High confidence' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await yieldForPaint();
                    const ok = await addSubscription({
                      name: c.name,
                      amount: c.typicalAmount,
                      frequency: candidateToSubFrequency(c.frequencyLabel),
                      nextBillingDate: nextBillingFromCandidate(c),
                      status: 'active',
                    });
                    if (!ok) return;
                    toast.success(`${c.name} added`);
                  }}
                  className="shrink-0 rounded-md bg-brand-cta px-4 py-2 text-xs font-semibold text-surface-base hover:bg-brand-cta-hover"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Subscription Optimizer */}
      {unusedSubs.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-semibold text-amber-300">Subscription Optimizer</h3>
            <span className="ml-auto text-xs text-content-tertiary">{unusedSubs.length} possibly unused</span>
          </div>
          <div className="space-y-2">
            {unusedSubs.map(sub => (
              <div key={sub.id} className="flex items-center justify-between py-2 border-b border-amber-500/10 last:border-0">
                <div>
                  <p className="text-sm font-medium text-content-primary">{sub.name}</p>
                  <p className="text-xs text-content-tertiary mt-0.5">
                    ${sub.monthlyEquivalent.toFixed(2)}/mo
                    {sub.hasPriceHike && sub.previousAmount != null && (
                      <span className="ml-2 text-amber-400"> · Price went up from ${sub.previousAmount}</span>
                    )}
                    {' · '}No charge in 35 days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = subscriptions.find((s) => s.id === sub.id);
                    if (target) startEdit(target);
                  }}
                  className="rounded-md px-2 py-1 text-xs text-content-tertiary transition-colors hover:bg-surface-raised hover:text-content-primary"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-content-muted mt-3">
            These subscriptions have no matching charge in the last 35 days. Verify they&apos;re still being used.
          </p>
        </div>
      )}

      {cancellationQueue.length > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0" />
            <h3 className="text-sm font-semibold text-rose-200">Cancellation review queue</h3>
            <span className="ml-auto text-xs text-content-secondary">{cancellationQueue.length} flagged</span>
          </div>
          <div className="space-y-2">
            {cancellationQueue.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2 border-b border-rose-500/20 last:border-0">
                <div>
                  <p className="text-sm font-medium text-content-primary">{sub.name}</p>
                  <p className="text-xs text-content-tertiary">
                    ${normalizeToMonthly(sub.amount, sub.frequency).toFixed(2)}/mo equivalent
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(sub)}
                    className="rounded-md px-2 py-1 text-xs text-content-tertiary transition-colors hover:bg-surface-raised hover:text-content-primary"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCancellationReview(sub.id)}
                    className="rounded-md px-2 py-1 text-xs text-rose-200 transition-colors hover:bg-rose-500/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <CollapsibleModule
        title="Subscription overview"
        icon={PlanningIcon}
        extraHeader={
          <span className="text-sm font-mono tabular-nums font-semibold text-content-primary data-numeric">
            ${monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 -mx-6 -my-6 p-6">
          <div className="bg-surface-elevated overflow-hidden rounded-xl border border-surface-border p-5">
            <p className="metric-label normal-case mb-2">Monthly cost</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-content-primary data-numeric">
              ${monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-content-tertiary">Across {activeSubscriptions.length} active</p>
          </div>
          <div className="bg-surface-elevated rounded-xl border border-surface-border p-5">
            <p className="metric-label normal-case mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 shrink-0" aria-hidden /> Price hikes
            </p>
            <p className={`text-2xl font-bold font-mono tabular-nums data-numeric ${hikedSubs.length > 0 ? 'text-amber-400' : 'text-content-muted'}`}>
              {hikedSubs.length}
            </p>
            <p className="mt-1 text-xs text-content-tertiary truncate">
              {hikedSubs.length > 0 ? hikedSubs.map(s => s.name).join(', ') : 'No recent price increases'}
            </p>
          </div>
          <div className="bg-surface-elevated overflow-hidden rounded-xl border border-surface-border p-5">
            <p className="metric-label normal-case mb-2">Annual cost</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-content-primary data-numeric">
              ${(monthlyCost * 12).toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-xs text-content-tertiary">Projected yearly spend</p>
          </div>
        </div>
      </CollapsibleModule>

      {(isAdding || editingId) && (
        <div className="bg-surface-raised rounded-xl border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-sans font-semibold text-content-primary">
              {editingId ? 'Edit subscription' : 'Add subscription'}
            </h3>
            <button type="button" onClick={() => { setIsAdding(false); cancelEdit(); }} className="focus-app rounded text-content-tertiary hover:text-content-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-sans font-medium text-content-secondary mb-1.5">Service name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                  placeholder="e.g., Netflix"
                />
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-content-secondary mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-content-muted">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-md pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus-app-field transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-content-secondary mb-1.5">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as SubFrequency })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-content-secondary mb-1.5">Next billing</label>
                <input
                  type="date"
                  required
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 text-sm text-content-primary focus-app-field transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsAdding(false); cancelEdit(); }}
                className="px-4 py-2 text-sm font-sans font-medium text-content-tertiary hover:text-content-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold shadow-sm transition-colors"
              >
                {editingId ? 'Save changes' : 'Add subscription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {subscriptions.length === 0 && !isAdding ? (
        <div className="bg-surface-raised rounded-xl border border-surface-border border-dashed p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-md flex items-center justify-center mx-auto mb-4">
            <SubscriptionsIcon className="w-8 h-8 text-content-tertiary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-content-primary mb-2">No subscriptions yet</h3>
          <p className="text-sm text-content-tertiary max-w-sm mx-auto mb-8">
            Add recurring charges so renewal dates and monthly cost stay visible.
          </p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-8 py-3 rounded-md bg-brand-cta hover:bg-brand-cta-hover text-surface-base text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            Add subscription
          </button>
        </div>
      ) : (
        <CollapsibleModule title="Your subscriptions" icon={SubscriptionsIcon}>
          <ul className="divide-y divide-surface-highlight -mx-6 -my-6">
            {subscriptions.map((sub) => (
              <li
                key={sub.id}
                className="p-4 sm:px-6 hover:bg-surface-elevated transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {(() => {
                  const detectedChange = detectedAmountChanges.get(sub.id);
                  return (
                    <>
                <div className="flex items-center gap-4">
                  <BrandLogo size="lg" name={sub.name} fallbackIcon={<SubscriptionsIcon className="w-5 h-5 text-content-muted" />} />
                  <div>
                    <h4 className="text-sm font-sans font-semibold text-content-primary flex items-center gap-2">
                      {sub.name}
                      {(() => {
                        const hike = getPriceHike(sub);
                        if (!hike) return null;
                        return (
                          <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 border border-amber-500/30 bg-amber-500/5 px-1.5 py-0.5 rounded-full">
                            <TrendingUp className="w-2.5 h-2.5" />
                            +{hike.pct}%
                          </span>
                        );
                      })()}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center text-xs font-sans font-medium ${
                        sub.status === 'active' ? 'text-emerald-400' :
                        sub.status === 'paused' ? 'text-amber-400' :
                        'text-content-tertiary'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      <span className="text-xs font-sans text-content-tertiary">Renews {sub.nextBillingDate}</span>
                      {(() => {
                        const hike = getPriceHike(sub);
                        if (!hike) return null;
                        return <span className="text-xs font-mono text-content-muted">(was ${hike.prev.toFixed(2)})</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-12 w-full sm:w-auto">
                  <div className="text-right">
                    <p className="text-base font-bold font-mono tabular-nums text-content-primary data-numeric">${sub.amount.toFixed(2)}</p>
                    <p className="text-xs text-content-tertiary normal-case">{sub.frequency}</p>
                        {detectedChange && (
                          <p className="text-xs text-amber-300 mt-1">
                            Detected from transactions: ${detectedChange.detected.toFixed(2)}
                          </p>
                        )}
                  </div>
                  <div className="flex items-center gap-2">
                        {detectedChange && (
                          <button
                            onClick={() => void applyDetectedPriceChange(sub)}
                            className="rounded-md px-2 py-1 text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                            title="Apply detected amount change"
                          >
                            Apply change
                          </button>
                        )}
                      <button
                        onClick={() => flagForCancellationReview(sub.id)}
                        className="rounded-md px-2 py-1 text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                        title="Flag for cancellation review"
                      >
                        Flag
                      </button>
                    <button
                      onClick={() => startEdit(sub)}
                      className="p-2 text-content-tertiary hover:text-content-secondary rounded-md hover:bg-surface-elevated transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-content-tertiary hover:text-brand-expense rounded-md hover:bg-surface-elevated transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                    </>
                  );
                })()}
              </li>
            ))}
          </ul>
        </CollapsibleModule>
      )}
    </div>
  );
}
