import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Download, CreditCard as CreditCardIcon, RefreshCw } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import {
  createStripeCheckoutSession,
  createStripePortalSession,
  syncStripeBilling,
} from '../../lib/stripe';

function isEntitlementActive(row: { status: string; ends_at: string | null } | undefined) {
  if (!row || row.status !== 'active') return false;
  if (row.ends_at) {
    const end = new Date(row.ends_at).getTime();
    if (!Number.isNaN(end) && end < Date.now()) return false;
  }
  return true;
}

function isSubscriptionLive(row: { status: string } | undefined) {
  return row?.status === 'active' || row?.status === 'trialing';
}

function BillingPanelInner() {
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const configuredYearly = Number(import.meta.env.VITE_PRICING_YEARLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;
  const yearlyPrice = Number.isFinite(configuredYearly) && configuredYearly > 0 ? configuredYearly : 99;
  const [searchParams, setSearchParams] = useSearchParams();
  const [tierLabel, setTierLabel] = useState('The Tracker');
  const [statusText, setStatusText] = useState('You are currently on the Free tier.');
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{ id: string; amount_total: number; currency: string; status: string; created_at: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const loadBillingState = useCallback(async (opts?: { stripeSyncFirst?: boolean }): Promise<boolean> => {
    setIsLoading(true);
    if (opts?.stripeSyncFirst) {
      const sync = await syncStripeBilling();
      if ('error' in sync) {
        const benign = sync.error.includes('No Stripe customer on file');
        if (!benign) toast.error(sync.error);
      }
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return false;
    }

    const [{ data: entitlements }, { data: subscriptions }, { data: payments }] = await Promise.all([
      supabase
        .from('entitlements')
        .select('feature_key,status,ends_at')
        .eq('user_id', user.id)
        .eq('feature_key', 'full_suite')
        .order('updated_at', { ascending: false })
        .limit(1),
      supabase
        .from('billing_subscriptions')
        .select('status,current_period_end')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1),
      supabase
        .from('billing_payments')
        .select('id,amount_total,currency,status,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const entitlement = entitlements?.[0];
    const sub = subscriptions?.[0];
    const paid = isEntitlementActive(entitlement) || isSubscriptionLive(sub);
    setHasPaidAccess(paid);

    if (paid) {
      setTierLabel('Full Suite');
      if (sub?.status) {
        const endDate = sub.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString()
          : null;
        setStatusText(
          endDate
            ? `Subscription ${sub.status}. Current period ends ${endDate}.`
            : `Subscription ${sub.status}.`,
        );
      } else {
        setStatusText('Full Suite access is active.');
      }
    } else {
      setTierLabel('The Tracker');
      setStatusText('You are currently on the Free tier.');
    }

    setPaymentHistory(
      (payments ?? []) as Array<{
        id: string;
        amount_total: number;
        currency: string;
        status: string;
        created_at: string;
      }>,
    );
    setIsLoading(false);
    return paid;
  }, []);

  const billingFlag = searchParams.get('billing');

  useEffect(() => {
    const run = async () => {
      if (billingFlag === 'success') {
        const maxAttempts = 4;
        let paidNow = false;
        for (let i = 0; i < maxAttempts; i++) {
          paidNow = await loadBillingState({ stripeSyncFirst: true });
          if (paidNow) break;
          if (i < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
        if (paidNow) {
          toast.success('Your subscription is active.');
        }
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('billing');
            return next;
          },
          { replace: true },
        );
      } else {
        await loadBillingState({ stripeSyncFirst: true });
      }
    };
    void run();
  }, [billingFlag, loadBillingState, setSearchParams]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void loadBillingState();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadBillingState]);

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
    const result = await createStripePortalSession(`${window.location.origin}/settings?tab=billing`);
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6">
          <p className="text-sm text-content-tertiary flex-1 min-w-0">
            {isLoading ? 'Loading billing status...' : statusText}
          </p>
          <button
            type="button"
            onClick={() => void loadBillingState({ stripeSyncFirst: true })}
            disabled={isLoading || isWorking}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-content-secondary hover:text-content-primary bg-surface-raised border border-surface-border rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-app"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
            Refresh status
          </button>
        </div>
        {hasPaidAccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-content-primary font-bold flex items-center gap-2">You&apos;re on The Arsenal</h4>
              <p className="text-sm text-emerald-200/70 mt-1 max-w-md">
                Full Suite is active. Update your plan, payment method, or invoices anytime in the billing portal.
              </p>
            </div>
            <button
              type="button"
              onClick={onManageBilling}
              disabled={isWorking}
              className="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-sm text-sm font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]"
            >
              {isWorking ? 'Working...' : 'Manage billing'}
            </button>
          </div>
        ) : (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-content-primary font-bold flex items-center gap-2">Upgrade to The Arsenal</h4>
              <p className="text-sm text-indigo-200/70 mt-1 max-w-md">
                Unlock the Debt Detonator, Subscription Sniper, and automatic account syncing for
                ${monthlyPrice.toFixed(2)}/month or ${yearlyPrice.toFixed(2)}/year.
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
        )}
      </CollapsibleModule>

      <CollapsibleModule title="Billing History" icon={Download} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">View and download your previous invoices.</p>
        {paymentHistory.length === 0 ? (
          <div className="border border-surface-border border-dashed rounded-sm p-8 flex flex-col items-center justify-center text-center bg-surface-base">
            <Download className="w-7 h-7 text-content-muted mb-3" />
            <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">No billing history</p>
            <p className="text-[10px] font-mono text-content-muted mt-1">
              {hasPaidAccess
                ? 'Invoices from Stripe will appear here after your first charge.'
                : 'You are on the free tier — no charges have been made.'}
            </p>
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
          <p className="text-xs font-mono text-content-tertiary uppercase tracking-widest">
            {hasPaidAccess ? 'Cards on file' : 'No payment method on file'}
          </p>
          <p className="text-[10px] font-mono text-content-muted mt-1">
            {hasPaidAccess
              ? 'Add, remove, or replace cards in the Stripe Customer Portal.'
              : 'Free tier — no billing required'}
          </p>
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
