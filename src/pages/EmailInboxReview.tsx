import React, { useMemo, useState } from 'react';
import { useStore, type EmailScanFinding } from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Mail, Check, X, Pencil, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TransitionLink } from '../components/TransitionLink';
import { AppPageShell } from '../components/AppPageShell';
import { yieldForPaint } from '../lib/interaction';

const DEST_LABEL: Record<EmailScanFinding['suggestedDestination'], string> = {
  bills: 'Bills',
  debts: 'Debts & Loans',
  subscriptions: 'Subscriptions',
  citations: 'Tickets & Fines',
  taxes: 'Taxes (bill)',
};

function fmtMoney(n: number | null) {
  if (n === null || !Number.isFinite(n)) return '—';
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EmailInboxReview() {
  const {
    emailScanFindings,
    confirmEmailScanFinding,
    skipEmailScanFinding,
    skipAllPendingEmailScanFindings,
  } = useStore(
    useShallow((s) => ({
      emailScanFindings: s.emailScanFindings,
      confirmEmailScanFinding: s.confirmEmailScanFinding,
      skipEmailScanFinding: s.skipEmailScanFinding,
      skipAllPendingEmailScanFindings: s.skipAllPendingEmailScanFindings,
    })),
  );

  const pending = useMemo(
    () => emailScanFindings.filter((f) => f.reviewStatus === 'pending'),
    [emailScanFindings],
  );

  const [editing, setEditing] = useState<EmailScanFinding | null>(null);
  const [editBiller, setEditBiller] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDue, setEditDue] = useState('');

  const openEdit = (f: EmailScanFinding) => {
    setEditing(f);
    setEditBiller(f.billerName);
    setEditAmount(f.amountDue != null ? String(f.amountDue) : '');
    setEditDue(f.dueDate ?? '');
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const handleConfirm = async (f: EmailScanFinding, withEdits: boolean) => {
    await yieldForPaint();
    if (withEdits && editing?.id === f.id) {
      const amt = editAmount.trim() ? parseFloat(editAmount) : null;
      const ok = await confirmEmailScanFinding(f.id, {
        billerName: editBiller.trim() || f.billerName,
        amountDue: Number.isFinite(amt as number) ? (amt as number) : f.amountDue,
        dueDate: editDue.trim() || f.dueDate,
      });
      if (ok) closeEdit();
      return;
    }
    await confirmEmailScanFinding(f.id);
  };

  const handleAddAll = async () => {
    await yieldForPaint();
    for (const f of pending) {
      const ok = await confirmEmailScanFinding(f.id);
      if (!ok) {
        toast.message('Stopped at first error — fix or skip that row.');
        break;
      }
    }
  };

  return (
    <AppPageShell>
      <div className="mx-auto max-w-3xl space-y-6 pb-10 w-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <TransitionLink
              to="/settings?tab=integrations"
              className="inline-flex items-center gap-1 text-xs font-medium text-content-tertiary hover:text-content-secondary mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
              Integrations
            </TransitionLink>
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">New from email</h1>
            <p className="mt-2 text-sm text-content-secondary max-w-xl">
              We only store structured fields from financial-looking messages — never full email bodies. Confirm each
              item before it appears in Oweable.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-content-muted">
              {pending.length} pending
            </span>
            {pending.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void handleAddAll()}
                  className="rounded-lg bg-brand-cta px-4 py-2 text-sm font-semibold text-surface-base hover:bg-brand-cta-hover"
                >
                  Add all
                </button>
                <button
                  type="button"
                  onClick={() => void skipAllPendingEmailScanFindings()}
                  className="text-xs text-content-tertiary hover:text-content-secondary"
                >
                  Skip all
                </button>
              </>
            )}
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-border bg-surface-raised p-12 text-center">
            <Mail className="w-10 h-10 mx-auto text-content-muted mb-4" aria-hidden />
            <p className="text-sm text-content-secondary">No pending items. Run a scan from Integrations.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {pending.map((f) => (
              <li
                key={f.id}
                className={`rounded-xl border p-5 ${
                  f.urgency === 'high'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-surface-border bg-surface-raised'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-content-primary">{f.billerName}</p>
                    <p className="text-xs text-content-tertiary line-clamp-2">{f.subjectSnapshot}</p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs text-content-secondary">
                      <span>Amount {fmtMoney(f.amountDue)}</span>
                      <span>Due {f.dueDate ?? '—'}</span>
                      <span className="capitalize">Status: {f.extractedStatus.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-[11px] text-content-muted pt-2">
                      Suggested: <span className="text-content-secondary">{DEST_LABEL[f.suggestedDestination]}</span>
                      {f.accountLast4 ? ` · ···${f.accountLast4}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleConfirm(f, false)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden />
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(f)}
                      className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-elevated"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void skipEmailScanFinding(f.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-content-muted hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                      Skip
                    </button>
                  </div>
                </div>

                {editing?.id === f.id && (
                  <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="block text-xs">
                        <span className="text-content-muted">Biller</span>
                        <input
                          value={editBiller}
                          onChange={(e) => setEditBiller(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-content-muted">Amount</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-sm font-mono"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-content-muted">Due date</span>
                        <input
                          type="date"
                          value={editDue}
                          onChange={(e) => setEditDue(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-surface-border bg-surface-base px-2 py-1.5 text-sm"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleConfirm(f, true)}
                        className="rounded-lg bg-brand-cta px-4 py-2 text-xs font-semibold text-surface-base"
                      >
                        Save & add
                      </button>
                      <button type="button" onClick={closeEdit} className="text-xs text-content-muted">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppPageShell>
  );
}
