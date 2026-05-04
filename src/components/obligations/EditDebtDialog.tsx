import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'sonner';
import type { Debt } from '@/store';

export default function EditDebtDialog({
  debt,
  onClose,
  editDebt,
}: {
  debt: Debt | null;
  onClose: () => void;
  editDebt: (id: string, u: Partial<Debt>) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [remaining, setRemaining] = useState('');
  const [apr, setApr] = useState('');
  const [minPayment, setMinPayment] = useState('');
  const [paymentDue, setPaymentDue] = useState('');
  const [noPaymentDue, setNoPaymentDue] = useState(false);

  useEffect(() => {
    if (!debt) return;
    setName(debt.name);
    setType(debt.type);
    setRemaining(String(debt.remaining));
    setApr(String(debt.apr));
    setMinPayment(String(debt.minPayment));
    const pdd = debt.paymentDueDate?.trim();
    setNoPaymentDue(!pdd);
    setPaymentDue(pdd || '');
  }, [debt]);

  if (!debt) return null;

  const save = async () => {
    const rem = parseFloat(remaining);
    const ap = parseFloat(apr);
    const min = parseFloat(minPayment);
    if (!name.trim() || isNaN(rem) || rem < 0) {
      toast.error('Enter account name and a valid balance.');
      return;
    }
    await editDebt(debt.id, {
      name: name.trim(),
      type: type.trim() || debt.type,
      remaining: rem,
      apr: isNaN(ap) ? 0 : ap,
      minPayment: isNaN(min) ? 0 : Math.max(0, min),
      paymentDueDate: noPaymentDue ? null : paymentDue || null,
    });
    toast.success('Debt updated');
    onClose();
  };

  return (
    <Dialog open className="relative z-100" onClose={onClose}>
      <div className="fixed inset-0 bg-black/70" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-xl border border-surface-border bg-surface-elevated p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg font-semibold text-content-primary mb-1">Edit debt</Dialog.Title>
          <p className="text-xs text-content-tertiary mb-4">Update balance, APR, minimum payment, or payment due date.</p>
          <div className="space-y-3">
            <label className="block text-xs text-content-tertiary">Account / loan name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Type</label>
            <input value={type} onChange={(e) => setType(e.target.value)} placeholder="Credit Card, Loan, …" className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Balance owed ($)</label>
            <input type="number" step="0.01" value={remaining} onChange={(e) => setRemaining(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">APR (%)</label>
            <input type="number" step="0.01" value={apr} onChange={(e) => setApr(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="block text-xs text-content-tertiary">Minimum payment ($/mo)</label>
            <input type="number" step="0.01" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} className="w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field" />
            <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
              <input type="checkbox" checked={noPaymentDue} onChange={(e) => setNoPaymentDue(e.target.checked)} className="rounded border-surface-border focus-app" />
              No payment due date (e.g. closed card with balance)
            </label>
            {!noPaymentDue && (
              <>
                <label className="block text-xs text-content-tertiary">Next payment due</label>
                <input type="date" value={paymentDue} onChange={(e) => setPaymentDue(e.target.value)} className="input-date-dark w-full rounded-md border border-surface-border bg-surface-base px-3 py-2 text-sm" />
              </>
            )}
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
