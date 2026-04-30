import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldAlert, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { invokeAdminAction } from '@/features/admin/shared/adminActionClient';
import { cn } from '@/lib/utils';

const reasonCodes = ['abuse', 'fraud_risk', 'chargeback', 'user_request', 'policy_violation', 'security_incident'];

export default function AdminLifecyclePage() {
  const [target, setTarget] = useState('');
  const [reasonCode, setReasonCode] = useState(reasonCodes[0]);
  const [reason, setReason] = useState('');
  const [noteType, setNoteType] = useState('risk');
  const [reviewId, setReviewId] = useState('');

  const runAction = useMutation({
    mutationFn: (action: string) => invokeAdminAction<{ message: string; review_id?: string }>({ action, target, reasonCode, reason, noteType, note: reason, reviewId }),
    onSuccess: (data) => {
      toast.success(data.message);
      if (data.review_id) setReviewId(data.review_id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ready = target.trim().length > 0 && reason.trim().length >= 8;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Users"
        title="User lifecycle"
        description="Ban, restore, note, and deletion-review workflows now require reason codes and write lifecycle evidence before destructive action."
        metrics={[
          { label: 'Mutation path', value: 'admin-actions' },
          { label: 'Reason code', value: reasonCode },
          { label: 'Deletion mode', value: 'Review queue', tone: 'warn' },
          { label: 'Permanent delete', value: 'Disabled here', tone: 'good' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel title="Target and reason" description="Use a user UUID or email. Reason text is mandatory for every lifecycle mutation.">
          <div className="space-y-4 p-4">
            <input value={target} onChange={(event) => setTarget(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="user@example.com or user UUID" />
            <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className={cn(adminInputClass, 'w-full')}>
              {reasonCodes.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={cn(adminInputClass, 'min-h-32 w-full')} placeholder="Specific reason, evidence, ticket id, or incident context" />
            <select value={noteType} onChange={(event) => setNoteType(event.target.value)} className={cn(adminInputClass, 'w-full')}>
              <option value="risk">Risk note</option>
              <option value="support">Support note</option>
              <option value="billing">Billing note</option>
              <option value="general">General note</option>
            </select>
          </div>
        </AdminPanel>

        <AdminPanel title="Governed actions" description="Deletion creates a review record; it does not delete the account from this screen.">
          {!target ? <AdminEmptyState icon={UserX} title="No target selected" description="Enter a target user and reason before running lifecycle actions." /> : (
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <button type="button" className={adminButtonClass} disabled={!ready || runAction.isPending} onClick={() => runAction.mutate('user_risk_note_add')}>Add risk note</button>
              <button type="button" className={adminDangerButtonClass} disabled={!ready || runAction.isPending} onClick={() => runAction.mutate('user_ban_with_reason')}>Ban with reason</button>
              <button type="button" className={adminButtonClass} disabled={!ready || runAction.isPending} onClick={() => runAction.mutate('user_unban_with_reason')}>Restore access</button>
              <button type="button" className={adminDangerButtonClass} disabled={!ready || runAction.isPending} onClick={() => runAction.mutate('deletion_review_create')}>Queue deletion review</button>
              <div className="sm:col-span-2 border border-surface-border bg-surface-base p-3">
                <label className="mb-1 block text-[11px] font-medium text-content-secondary">Cancel review id</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={reviewId} onChange={(event) => setReviewId(event.target.value)} className={adminInputClass} placeholder="Deletion review UUID" />
                  <button type="button" className={adminButtonClass} disabled={!reviewId || !reason.trim() || runAction.isPending} onClick={() => runAction.mutate('deletion_review_cancel')}>Cancel review</button>
                </div>
              </div>
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Lifecycle policy" description="The normal admin path is reversible: note, ban/unban, and deletion review. Hard delete stays outside this workflow.">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <AdminMetric label="Ban/unban" value="Reasoned" tone="warn" />
          <AdminMetric label="Risk notes" value="Audited" tone="good" />
          <AdminMetric label="Delete" value="Review first" tone="danger" />
        </div>
        <div className="border-t border-surface-border p-4 text-xs leading-5 text-content-secondary">
          <ShieldAlert className="mb-2 h-4 w-4 text-content-tertiary" />
          Operators should include ticket ids, Stripe ids, or incident ids in the reason field so audit review can reconstruct why access changed.
        </div>
      </AdminPanel>
    </section>
  );
}
