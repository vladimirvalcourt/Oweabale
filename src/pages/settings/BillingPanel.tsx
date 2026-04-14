import React, { memo, useEffect, useState } from 'react';
import { Building2, Download, CreditCard as CreditCardIcon } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { createStripeCheckoutSession, createStripePortalSession } from '../../lib/stripe';

function BillingPanelInner() {
  const [tierLabel, setTierLabel] = useState('The Tracker');
  const [statusText, setStatusText] = useState('You are currently on the Free tier.');
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{ id: string; amount_total: number; currency: string; status: string; created_at: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const loadBillingState = async () => {
      setIsLoading(true);
      const [{ data: entitlements }, { data: subscriptions }, { data: payments }] = await Promise.all([
        supabase
          .from('entitlements')
          .select('feature_key,status,ends_at')
          .eq('feature_key', 'full_suite')
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('billing_subscriptions')
          .select('status,current_period_end')
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase
          .from('billing_payments')
          .select('id,amount_total,currency,status,created_at')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const entitlement = entitlements?.[0];
      const sub = subscriptions?.[0];
      if (entitlement?.status === 'active') {
        setTierLabel('Full Suite');
        if (sub?.status) {
          const endDate = sub.current_period_end
            ? new Date(sub.current_period_end).toLocaleDateString()
            : null;
          setStatusText(
            endDate
              ? `Subscription ${sub.status}. Current period ends ${endDate}.`
              : `Subscription ${sub.status}.`
          );
        } else {
          setStatusText('Full Suite access is active.');
        }
      } else {
        setTierLabel('The Tracker');
        setStatusText('You are currently on the Free tier.');
      }

      setPaymentHistory((payments ?? []) as Array<{ id: string; amount_total: number; currency: string; status: string; created_at: string }>);
      setIsLoading(false);
    };

    void loadBillingState();
  }, []);

  const onUpgrade = async () => {
    if (isWorking) return;
    setIsWorking(true);
    const result = await createStripeCheckoutSession('pro_monthly');
    if ('error' in result) {
      toast.error(result.error);
      setIsWorking(false);
      return;
    }
    window.location.href = result.checkoutUrl;
  };

  const onManageBilling = async () => {
    if (isWorking) return;
    setIsWorking(true);
    const result = await createStripePortalSession(`${window.location.origin}/settings`);
    if ('error' in result) {
      toast.error(result.error);
      setIsWorking(false);
      return;
    }
    window.location.href = result.url;
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule
        title="Subscription Plan"
        icon={Building2}
        defaultOpen
        extraHeader={
          <span className="inline-flex items-center text-[10px] font-mono font-bold text-content-tertiary bg-surface-raised px-2.5 py-1 rounded-sm border border-surface-border uppercase tracking-widest">
            {tierLabel}
          </span>
        }
      >
        <p className="text-sm text-content-tertiary mb-6">{isLoading ? 'Loading billing status...' : statusText}</p>
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-content-primary font-bold flex items-center gap-2">Upgrade to The Arsenal</h4>
            <p className="text-sm text-indigo-200/70 mt-1 max-w-md">
              Unlock the Debt Detonator, Subscription Sniper, and automatic account syncing.
            </p>
          </div>
          <button
            type="button"
            onClick={onUpgrade}
            disabled={isWorking}
            className="shrink-0 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-sm font-bold transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            {isWorking ? 'Working...' : 'Upgrade Now'}
          </button>
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Billing History" icon={Download} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">View and download your previous invoices.</p>
        {paymentHistory.length === 0 ? (
          <div className="border border-surface-border border-dashed rounded-sm p-8 flex flex-col items-center justify-center text-center bg-surface-base">
            <Download className="w-7 h-7 text-content-muted mb-3" />
            <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No billing history</p>
            <p className="text-[10px] font-mono text-content-muted mt-1">You are on the free tier — no charges have been made.</p>
          </div>
        ) : (
          <div className="border border-surface-border rounded-sm bg-surface-base divide-y divide-surface-border">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="px-4 py-3 flex items-center justify-between text-xs font-mono">
                <span className="text-content-secondary">{new Date(payment.created_at).toLocaleDateString()}</span>
                <span className="text-content-primary">
                  ${(payment.amount_total / 100).toFixed(2)} {payment.currency.toUpperCase()}
                </span>
                <span className="uppercase text-content-tertiary">{payment.status}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleModule>

      <CollapsibleModule title="Payment Methods" icon={CreditCardIcon} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Manage payment methods used for your subscriptions.</p>
        <div className="border border-surface-border border-dashed rounded-sm p-6 flex flex-col items-center justify-center text-center mb-4 bg-surface-base">
          <CreditCardIcon className="w-8 h-8 text-content-muted mb-3" />
          <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No payment method on file</p>
          <p className="text-[10px] font-mono text-content-muted mt-1">Free tier — no billing required</p>
        </div>
        <button
          type="button"
          onClick={onManageBilling}
          disabled={isWorking}
          className="text-sm font-medium text-content-primary hover:text-white transition-colors bg-surface-elevated px-4 py-2 border border-surface-border rounded-sm focus-app"
        >
          Manage in Stripe Portal
        </button>
      </CollapsibleModule>
    </div>
  );
}

export const BillingPanel = memo(BillingPanelInner);
