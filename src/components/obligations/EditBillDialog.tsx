import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import type { Bill } from '@/store';

export default function EditBillDialog({
  bill,
  onClose,
  editBill,
}: {
  bill: Bill | null;
  onClose: () => void;
  editBill: (id: string, u: Partial<Bill>) => void | Promise<void>;
}) {
  const [biller, setBiller] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<Bill['frequency']>('Monthly');

  useEffect(() => {
    if (!bill) return;
    setBiller(bill.biller);
    setAmount(String(bill.amount));
    setCategory(bill.category);
    setDueDate(bill.dueDate);
    setFrequency(bill.frequency);
  }, [bill]);

  if (!bill) return null;

  const save = async () => {
    const n = parseFloat(amount);
    if (!biller.trim() || isNaN(n) || n <= 0) {
      toast.error('Enter a payee and a valid amount.');
      return;
    }
    await editBill(bill.id, {
      biller: biller.trim(),
      amount: n,
      category: category || bill.category,
      dueDate,
      frequency,
    });
    toast.success('Bill updated');
    onClose();
  };

  return (
    <Dialog open className="relative z-[100]" onClose={onClose}>
      <div className="fixed inset-0 bg-black/70" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-xl border border-surface-border bg-surface-elevated p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-4">Edit bill</Dialog.Title>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Payee</label>
            <input value={biller} onChange={(e) => setBiller(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Amount ($)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-date-dark w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm" />
            <label className="block text-xs text-content-tertiary">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as Bill['frequency'])} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary">
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-content-tertiary hover:text-content-primary rounded-md">Cancel</button>
            <button type="button" onClick={() => void save()} className="rounded-md bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover">Save</button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
