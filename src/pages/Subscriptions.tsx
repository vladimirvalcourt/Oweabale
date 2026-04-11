import React, { useState } from 'react';
import { useStore, type Subscription } from '../store/useStore';
import { normalizeToMonthly } from '../lib/finance';
import { Repeat, Plus, Edit2, Trash2, Calendar, Hash, TrendingUp, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { BrandLogo } from '../components/BrandLogo';
import { motion } from 'motion/react';

type SubFrequency = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly';

export default function Subscriptions() {
  const { subscriptions, addSubscription, editSubscription, deleteSubscription } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    frequency: 'Monthly' as SubFrequency,
    nextBillingDate: '',
    status: 'active' as 'active' | 'paused' | 'cancelled',
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.nextBillingDate) {
      toast.error('Please fill in all required fields');
      return;
    }

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
      frequency: sub.frequency,
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
    const ok = await deleteSubscription(id);
    if (!ok) return;
    toast.success('Subscription deleted');
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const monthlyCost = activeSubscriptions.reduce(
    (acc, sub) => acc + normalizeToMonthly(sub.amount, sub.frequency),
    0
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Subscriptions</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mt-1">Recurring liabilities management</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: '', amount: '', frequency: 'Monthly', nextBillingDate: '', status: 'active' });
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-base focus:ring-indigo-600"
        >
          <Plus className="w-4 h-4" />
          Add Subscription
        </button>
      </div>

      {/* Overview Stats */}
      <CollapsibleModule 
        title="Subscription Health" 
        icon={TrendingUp}
        extraHeader={<span className="text-xs font-mono text-content-primary font-bold">${monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo</span>}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 -mx-6 -my-6 p-6">
          <div className="bg-surface-elevated overflow-hidden rounded-sm border border-surface-border p-5">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Monthly Cost</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-content-primary">
              ${monthlyCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs font-mono text-zinc-500">Across {activeSubscriptions.length} active subscriptions</p>
          </div>
          <div className="bg-surface-elevated rounded-sm border border-surface-border p-5">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" /> Price Hikes
            </p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${hikedSubs.length > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
              {hikedSubs.length}
            </p>
            <p className="mt-1 text-xs font-mono text-zinc-500 truncate">
              {hikedSubs.length > 0 ? hikedSubs.map(s => s.name).join(', ') : 'No price increases found'}
            </p>
          </div>
          <div className="bg-surface-elevated overflow-hidden rounded-sm border border-surface-border p-5">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Annual Cost</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-content-primary">${(monthlyCost * 12).toLocaleString('en-US', { minimumFractionDigits: 0 })}</p>
            <p className="mt-1 text-xs font-mono text-zinc-500">Projected yearly spend</p>
          </div>
        </div>
      </CollapsibleModule>

      {(isAdding || editingId) && (
        <div className="bg-surface-raised rounded-sm border border-surface-border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-content-primary">
              {editingId ? 'Edit Entry' : 'Manual Entry'}
            </h3>
            <button onClick={() => { setIsAdding(false); cancelEdit(); }} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Netflix"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-zinc-600">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-surface-base border border-surface-border rounded-sm pl-7 pr-3 py-2 text-sm font-mono text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as SubFrequency })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Next Billing</label>
                <input
                  type="date"
                  required
                  value={formData.nextBillingDate}
                  onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
                  className="w-full bg-surface-base border border-surface-border rounded-sm px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setIsAdding(false); cancelEdit(); }}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-indigo-500/10"
              >
                {editingId ? 'Commit Changes' : 'Add to Ledger'}
              </button>
            </div>
          </form>
        </div>
      )}

      {subscriptions.length === 0 && !isAdding ? (
        <div className="bg-surface-raised rounded-sm border border-surface-border border-dashed p-12 text-center">
          <div className="w-16 h-16 border border-surface-border rounded-sm flex items-center justify-center mx-auto mb-4">
            <Repeat className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-content-primary mb-2">No active subscriptions</h3>
          <p className="text-xs font-mono text-zinc-500 max-w-sm mx-auto mb-8 uppercase tracking-widest">
            Ready to track Netflix, Spotify, and more.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Begin Tracking
          </button>
        </div>
      ) : (
        <CollapsibleModule title="Recurring Liabilities" icon={Repeat}>
          <motion.ul 
            className="divide-y divide-surface-highlight -mx-6 -my-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {subscriptions.map((sub) => (
              <motion.li 
                key={sub.id} 
                className="p-4 sm:px-6 hover:bg-surface-elevated transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
                }}
              >
                <div className="flex items-center gap-4">
                  <BrandLogo size="lg" name={sub.name} fallbackIcon={<Repeat className="w-5 h-5 text-zinc-600" />} />
                  <div>
                    <h4 className="text-sm font-bold text-content-primary flex items-center gap-2">
                      {sub.name}
                      {(() => {
                        const hike = getPriceHike(sub);
                        if (!hike) return null;
                        return (
                          <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 border border-amber-500/30 bg-amber-500/5 px-1.5 py-0.5 rounded-sm">
                            <TrendingUp className="w-2.5 h-2.5" />
                            +{hike.pct}%
                          </span>
                        );
                      })()}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center text-xs font-mono font-medium ${
                        sub.status === 'active' ? 'text-emerald-400' :
                        sub.status === 'paused' ? 'text-amber-400' :
                        'text-zinc-400'
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      <span className="text-xs font-mono text-zinc-500">Renews {sub.nextBillingDate}</span>
                      {(() => {
                        const hike = getPriceHike(sub);
                        if (!hike) return null;
                        return <span className="text-[10px] font-mono text-zinc-600">(was ${hike.prev.toFixed(2)})</span>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-12 w-full sm:w-auto">
                  <div className="text-right">
                    <p className="text-base font-bold font-mono tabular-nums text-content-primary">${sub.amount.toFixed(2)}</p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{sub.frequency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(sub)}
                      className="p-2 text-zinc-500 hover:text-zinc-300 rounded-md hover:bg-surface-elevated transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="p-2 text-zinc-500 hover:text-[#EF4444] rounded-md hover:bg-surface-elevated transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </CollapsibleModule>
      )}
    </div>
  );
}
