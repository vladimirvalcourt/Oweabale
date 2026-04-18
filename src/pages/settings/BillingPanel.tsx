import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { Building2, Download, CreditCard as CreditCardIcon, RefreshCw } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { loadNotifPrefs } from './constants';
import { sendWebPushMessage } from '../../lib/webPush';
import {
  cancelStripeSubscription,
  createStripeCheckoutSession,
  createStripePortalSession,
  syncStripeBilling,
} from '../../lib/stripe';
import { yieldForPaint } from '../../lib/interaction';

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
  const TRIAL_REMINDER_SENT_KEY = 'oweable_trial_charge_reminder_last_sent_v1';
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;
  const [searchParams, setSearchParams] = useSearchParams();
  const [tierLabel, setTierLabel] = useState('Tracker (Free)');
  const [statusText, setStatusText] = useState('You are on the free Tracker tier with core account and bill tracking.');
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{ id: string; amount_total: number; currency: string; status: string; created_at: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'trialing' | 'canceled' | 'incomplete' | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [immediateCancelOpen, setImmediateCancelOpen] = useState(false);

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
    setSubscriptionStatus((sub?.status as typeof subscriptionStatus) ?? null);
    setCurrentPeriodEnd(sub?.current_period_end ?? null);
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
      setTierLabel('Tracker (Free)');
      setStatusText('You are on the free Tracker tier with core account and bill tracking.');
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

  useEffect(() => {
    if (subscriptionStatus !== 'trialing' || !currentPeriodEnd) return;
    const prefs = loadNotifPrefs();
    if (!prefs['trial-charge-reminder']) return;

    const now = Date.now();
    const endMs = new Date(currentPeriodEnd).getTime();
    if (!Number.isFinite(endMs)) return;
    const daysLeft = Math.ceil((endMs - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0 || daysLeft > 7) return;

    const reminderMarker = `${currentPeriodEnd.slice(0, 10)}:${daysLeft}`;
    const lastSent = localStorage.getItem(TRIAL_REMINDER_SENT_KEY);
    if (lastSent === reminderMarker) return;
    localStorage.setItem(TRIAL_REMINDER_SENT_KEY, reminderMarker);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Trial ending soon', {
        body: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Review billing settings before your first charge.`,
      });
    }
    void sendWebPushMessage(
      'Trial ending soon',
      `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Review billing settings before your first charge.`,
    );
  }, [currentPeriodEnd, subscriptionStatus]);

  const onUpgrade = async () => {
    if (isWorking) return;
    setIsWorking(true);
    await yieldForPaint();
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
    await yieldForPaint();
    const result = await createStripePortalSession(`${window.location.origin}/settings?tab=billing`);
    if ('error' in result) {
      toast.error(result.error);
      setIsWorking(false);
      return;
    }
    window.location.href = result.url;
  };

  const onCancelAtPeriodEnd = async () => {
    if (isWorking) return;
    const confirmed = window.confirm(
      'Cancel at the end of your current billing period? You keep Full Suite access until then.',
    );
    if (!confirmed) return;
    setIsWorking(true);
    await yieldForPaint();
    const result = await cancelStripeSubscription({ immediate: false });
    if ('error' in result) {
      toast.error(result.error);
      setIsWorking(false);
      return;
    }
    if (!result.cancelled) {
      toast.info(result.message ?? 'No active subscription found.');
      setIsWorking(false);
      return;
    }
    await loadBillingState({ stripeSyncFirst: true });
    toast.success('Cancellation scheduled for period end.');
    setIsWorking(false);
  };

  const onCancelImmediatelyConfirmed = async () => {
    if (isWorking) return;
    setIsWorking(true);
    setImmediateCancelOpen(false);
    await yieldForPaint();
    const result = await cancelStripeSubscription({ immediate: true });
    if ('error' in result) {
      toast.error(result.error);
      setIsWorking(false);
      return;
    }
    if (!result.cancelled) {
      toast.info(result.message ?? 'No active subscription found.');
      setIsWorking(false);
      return;
    }
    await loadBillingState({ stripeSyncFirst: true });
    toast.success('Subscription canceled immediately.');
    setIsWorking(false);
  };

  return (
    <div className="space-y-6">
      <CollapsibleModule
        title="Subscription Plan"
        icon={Building2}
        defaultOpen
        extraHeader={
          <span className="inline-flex items-center rounded-lg border border-surface-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-content-secondary">
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
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:text-content-primary focus-app disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
            Refresh status
          </button>
        </div>
        {hasPaidAccess ? (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="flex items-center gap-2 font-medium text-content-primary">You&apos;re on Full Suite</h4>
              <p className="text-sm text-emerald-200/70 mt-1 max-w-md">
                Full Suite is active. Update your plan, payment method, or invoices anytime in the billing portal.
              </p>
              {subscriptionStatus === 'trialing' && currentPeriodEnd && (
                <p className="mt-2 text-xs text-emerald-100/80">
                  Trial active until {new Date(currentPeriodEnd).toLocaleDateString()}. Enable pre-charge reminders in Notifications.
                </p>
              )}
            </div>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
              <button
                type="button"
                onClick={onManageBilling}
                disabled={isWorking}
                className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-none transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? 'Working...' : 'Manage billing'}
              </button>
              <p className="max-w-sm text-left text-[11px] text-content-tertiary sm:text-right">
                Manage billing opens Stripe&apos;s customer portal to update payment methods and invoices.
              </p>
              <button
                type="button"
                onClick={() => void onCancelAtPeriodEnd()}
                disabled={isWorking}
                className="shrink-0 rounded-lg border border-surface-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel at period end
              </button>
              {currentPeriodEnd && (
                <p className="max-w-sm text-left text-[11px] text-content-tertiary sm:text-right">
                  Access continues until{' '}
                  {new Date(currentPeriodEnd).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  .
                </p>
              )}
              <button
                type="button"
                onClick={() => setImmediateCancelOpen(true)}
                disabled={isWorking}
                className="shrink-0 rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel immediately
              </button>
              <p className="max-w-sm text-left text-[11px] text-content-tertiary sm:text-right">
                Immediate cancel ends paid access today. Your data is retained for 30 days per policy.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-content-primary/[0.05] border border-surface-border rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="flex items-center gap-2 font-medium text-content-primary">Upgrade to Full Suite</h4>
              <p className="text-sm text-content-secondary/70 mt-1 max-w-md">
                Unlock Full Suite: unlimited account sync, debt payoff planner, subscription alerts,
                and freelancer tax tools for ${monthlyPrice.toFixed(2)}/month.
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              disabled={isWorking}
              className="shrink-0 rounded-lg bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isWorking ? 'Working...' : `Upgrade — $${monthlyPrice.toFixed(2)}/mo`}
            </button>
          </div>
        )}
      </CollapsibleModule>

      <CollapsibleModule title="Billing History" icon={Download} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">View and download your previous invoices.</p>
        {paymentHistory.length === 0 ? (
          <div className="border border-surface-border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center bg-surface-base">
            <Download className="w-7 h-7 text-content-muted mb-3" />
            <p className="text-sm font-medium text-content-secondary">No billing history</p>
            <p className="mt-1 text-xs font-medium text-content-tertiary">
              {hasPaidAccess
                ? 'Invoices from Stripe will appear here after your first charge.'
                : 'You are on the free tier — no charges have been made.'}
            </p>
          </div>
        ) : (
          <div className="border border-surface-border rounded-lg bg-surface-base divide-y divide-surface-border">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between px-4 py-3 text-xs font-medium">
                <span className="text-content-secondary">{new Date(payment.created_at).toLocaleDateString()}</span>
                <span className="tabular-nums text-content-primary">
                  ${(payment.amount_total / 100).toFixed(2)} {payment.currency.toUpperCase()}
                </span>
                <span className="capitalize text-content-tertiary">{payment.status}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleModule>

      <CollapsibleModule title="Payment Methods" icon={CreditCardIcon} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Manage payment methods used for your subscriptions.</p>
        <div className="border border-surface-border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center mb-4 bg-surface-base">
          <CreditCardIcon className="w-8 h-8 text-content-muted mb-3" />
          <p className="text-sm font-medium text-content-secondary">
            {hasPaidAccess ? 'Cards on file' : 'No payment method on file'}
          </p>
          <p className="mt-1 text-xs font-medium text-content-tertiary">
            {hasPaidAccess
              ? 'Add, remove, or replace cards in the Stripe Customer Portal.'
              : 'Free tier — no billing required'}
          </p>
        </div>
        <button
          type="button"
          onClick={onManageBilling}
          disabled={isWorking}
          className="text-sm font-medium text-content-primary hover:text-content-secondary transition-colors bg-surface-elevated px-4 py-2 border border-surface-border rounded-lg focus-app"
        >
          Manage in Stripe Portal
        </button>
      </CollapsibleModule>

      <Dialog open={immediateCancelOpen} onClose={() => setImmediateCancelOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-lg border border-surface-border bg-surface-raised p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold text-content-primary">Cancel immediately?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-content-tertiary">
              Your Full Suite access ends today. Your data will be retained for 30 days. This is separate from canceling at
              period end.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setImmediateCancelOpen(false)}
                className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-elevated"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={() => void onCancelImmediatelyConfirmed()}
                disabled={isWorking}
                className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white hover:bg-[#DC2626] disabled:opacity-60"
              >
                {isWorking ? 'Working…' : 'End access today'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <CollapsibleModule title="Billing Transparency Center" icon={Building2} defaultOpen={false}>
        <div className="space-y-3 text-sm text-content-secondary">
          <p>
            Cancel from this app: use <strong className="font-medium text-content-primary">Cancel at period end</strong> to keep
            access until the date shown, or <strong className="font-medium text-content-primary">Cancel immediately</strong> to end
            paid access today.
          </p>
          <p>
            Trial reminders are sent before first charge when enabled in Notifications (`Trial-to-paid reminder`).
          </p>
          <p>
            You can export data anytime and delete your account immediately from `Data & Privacy`, with a downloadable deletion receipt.
          </p>
          <p className="text-xs text-content-tertiary">
            No phone calls or support tickets are required for basic billing cancellation and account deletion flows.
          </p>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const BillingPanel = memo(BillingPanelInner);
