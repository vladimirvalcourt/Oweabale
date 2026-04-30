import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Receipt, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { invokeAdminAction } from '@/features/admin/shared/adminActionClient';
import { cn } from '@/lib/utils';

type BillingPayload = {
  billing: {
    profile: { id: string; email: string | null; stripe_customer_id?: string | null; plan?: string | null; trial_ends_at?: string | null } | null;
    subscriptions: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
    entitlements: Array<Record<string, unknown>>;
    trial_events: Array<Record<string, unknown>>;
    stripe_customer_url: string | null;
  };
};

const fmtMoney = (cents: unknown, currency: unknown) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency ?? 'usd').toUpperCase() }).format(Number(cents ?? 0) / 100);

export default function AdminBillingPage() {
  const [target, setTarget] = useState('');
  const [activeTarget, setActiveTarget] = useState('');
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');

  const billingQuery = useQuery({
    queryKey: ['admin', 'billing', activeTarget],
    enabled: activeTarget.length > 0,
    queryFn: () => invokeAdminAction<BillingPayload>({ action: 'billing_user_lookup', target: activeTarget }),
  });

  const portalMutation = useMutation({
    mutationFn: () => invokeAdminAction<{ url: string | null }>({ action: 'billing_open_portal_link', target: activeTarget }),
    onSuccess: (data) => {
      if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else toast.error('Portal URL missing.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extendMutation = useMutation({
    mutationFn: () => invokeAdminAction<{ trial_ends_at: string }>({ action: 'billing_extend_trial', target: activeTarget, additionalDays: days, reason }),
    onSuccess: async (data) => {
      toast.success(`Trial extended to ${new Date(data.trial_ends_at).toLocaleDateString()}.`);
      await billingQuery.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refundMutation = useMutation({
    mutationFn: (paymentId: string) => invokeAdminAction({ action: 'billing_refund_payment', paymentId, reason }),
    onSuccess: () => toast.success('Refund review recorded.'),
    onError: (e: Error) => toast.error(e.message),
  });

  const billing = billingQuery.data?.billing;
  const activeSubs = billing?.subscriptions.filter((row) => ['active', 'trialing'].includes(String(row.status))).length ?? 0;
  const totalPaid = billing?.payments.reduce((sum, row) => sum + (String(row.status) === 'paid' ? Number(row.amount_total ?? 0) : 0), 0) ?? 0;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Billing"
        title="Billing controls"
        description="Look up Stripe-backed subscription state, entitlement history, trial extensions, and refund review requests without exposing Stripe secrets."
        metrics={[
          { label: 'Subscriptions', value: billing?.subscriptions.length ?? '—' },
          { label: 'Active', value: activeSubs, tone: activeSubs > 0 ? 'good' : 'default' },
          { label: 'Paid total', value: billing ? fmtMoney(totalPaid, 'usd') : '—' },
          { label: 'Trial events', value: billing?.trial_events.length ?? '—' },
        ]}
      />

      <AdminPanel title="Lookup" description="Enter a user UUID or email. Stripe links are generated from stored billing IDs only.">
        <form
          className="flex flex-col gap-2 p-4 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setActiveTarget(target.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <input value={target} onChange={(event) => setTarget(event.target.value)} className={cn(adminInputClass, 'w-full pl-9')} placeholder="user@example.com or user UUID" />
          </div>
          <button type="submit" className={adminButtonClass}>Lookup</button>
        </form>
      </AdminPanel>

      {!activeTarget ? <AdminEmptyState icon={Receipt} title="No billing record selected" description="Search for a user to inspect subscriptions, payments, entitlements, and trial changes." /> : null}
      {billingQuery.isLoading ? <p className="text-xs text-content-muted">Loading billing...</p> : null}
      {billing ? (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <AdminPanel
            title={billing.profile?.email ?? billing.profile?.id ?? 'Billing profile'}
            description={`Plan ${billing.profile?.plan ?? 'unknown'} · trial ends ${billing.profile?.trial_ends_at ? new Date(billing.profile.trial_ends_at).toLocaleDateString() : 'not set'}`}
            actions={
              <div className="flex flex-wrap gap-2">
                {billing.stripe_customer_url ? <a href={billing.stripe_customer_url} target="_blank" rel="noreferrer" className={adminButtonClass}>Stripe <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                <button type="button" className={adminButtonClass} onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>Portal link</button>
              </div>
            }
          >
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div>
                <p className="ui-label mb-2">Subscriptions</p>
                <div className="space-y-2">
                  {billing.subscriptions.map((row) => (
                    <div key={String(row.id)} className="border border-surface-border bg-surface-base p-3 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-content-primary">{String(row.status)}</span>
                        <AdminStatusBadge tone={String(row.status) === 'active' ? 'good' : 'default'}>{String(row.cancel_at_period_end) === 'true' ? 'canceling' : 'current'}</AdminStatusBadge>
                      </div>
                      <p className="mt-1 text-content-muted">{String(row.stripe_subscription_id ?? 'No Stripe subscription id')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="ui-label mb-2">Entitlements</p>
                <div className="space-y-2">
                  {billing.entitlements.map((row) => (
                    <div key={String(row.id)} className="border border-surface-border bg-surface-base p-3 text-xs">
                      <p className="font-semibold text-content-primary">{String(row.feature_key)} · {String(row.status)}</p>
                      <p className="mt-1 text-content-muted">{String(row.source)} · ends {row.ends_at ? new Date(String(row.ends_at)).toLocaleDateString() : 'never'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-surface-border p-4">
              <p className="ui-label mb-2">Payments</p>
              <div className="space-y-2">
                {billing.payments.map((row) => (
                  <div key={String(row.id)} className="flex flex-col gap-2 border border-surface-border bg-surface-base p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-content-primary">{fmtMoney(row.amount_total, row.currency)} · {String(row.status)}</p>
                      <p className="mt-1 text-content-muted">{String(row.stripe_payment_intent_id ?? row.stripe_checkout_session_id ?? 'No Stripe id')}</p>
                    </div>
                    <button type="button" className={adminDangerButtonClass} disabled={!reason.trim() || refundMutation.isPending} onClick={() => refundMutation.mutate(String(row.id))}>Request refund review</button>
                  </div>
                ))}
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Trial and refund governance" description="Trial extensions and refund review requests require an operator reason.">
            <div className="space-y-4 p-4">
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={cn(adminInputClass, 'min-h-24 w-full')} placeholder="Required reason for trial extension or refund review" />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input type="number" min={1} max={90} value={days} onChange={(event) => setDays(Number(event.target.value))} className={adminInputClass} />
                <button type="button" className={adminButtonClass} disabled={!reason.trim() || extendMutation.isPending} onClick={() => extendMutation.mutate()}>Extend trial</button>
              </div>
              <div className="space-y-2">
                <p className="ui-label">Extension history</p>
                {billing.trial_events.length === 0 ? <p className="text-xs text-content-muted">No trial extensions recorded.</p> : null}
                {billing.trial_events.map((row) => (
                  <div key={String(row.id)} className="border border-surface-border bg-surface-base p-3 text-xs text-content-secondary">
                    +{String(row.additional_days)} days · {new Date(String(row.new_trial_ends_at)).toLocaleDateString()}
                    <p className="mt-1 text-content-muted">{String(row.reason)}</p>
                  </div>
                ))}
              </div>
            </div>
          </AdminPanel>
        </div>
      ) : null}
    </section>
  );
}
