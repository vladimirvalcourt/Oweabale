import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { Building2, Download, CreditCard as CreditCardIcon, RefreshCw } from 'lucide-react';
import { CollapsibleModule } from '../../components/common';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import {
  hasFullSuiteAccess,
  isEntitlementActive,
  isProfileTrialActive,
  isSubscriptionLive,
} from "../../app/constants/fullSuiteAccess";
import { supabase } from '../../lib/api/supabase';
import { loadNotifPrefs } from './constants';
import { sendWebPushMessage } from '../../lib/api/services/webPush';
import { getCustomIcon } from '../../lib/utils/customIcons';
import {
  cancelStripeSubscription,
  createStripeCheckoutSession,
  createStripePortalSession,
  syncStripeBilling,
} from '../../lib/api/stripe';
import { yieldForPaint } from "../../lib/api/services";

function BillingPanelInner() {
  const BillingIcon = getCustomIcon('billing');
  const TRIAL_REMINDER_SENT_KEY = 'oweable_trial_charge_reminder_last_sent_v1';
  const configuredMonthly = Number(import.meta.env.VITE_PRICING_MONTHLY_DISPLAY);
  const monthlyPrice = Number.isFinite(configuredMonthly) && configuredMonthly > 0 ? configuredMonthly : 10.99;
  const [searchParams, setSearchParams] = useSearchParams();
  const isLockedTrial = searchParams.get('locked') === 'trial';
  const [tierLabel, setTierLabel] = useState('Trial ended');
  const [statusText, setStatusText] = useState('Add a plan to keep using Oweable.');
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{ id: string; amount_total: number; currency: string; status: string; created_at: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'trialing' | 'canceled' | 'incomplete' | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [isProfileTrialOnly, setIsProfileTrialOnly] = useState(false);
  const [immediateCancelOpen, setImmediateCancelOpen] = useState(false);
  // E-05: replaces window.confirm() for "cancel at period end" flow
  const [periodCancelOpen, setPeriodCancelOpen] = useState(false);

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

    const [{ data: entitlements }, { data: subscriptions }, { data: payments }, { data: profile }] = await Promise.all([
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
      supabase
        .from('profiles')
        .select('plan, trial_ends_at, trial_expired')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    const entitlement = entitlements?.[0];
    const sub = subscriptions?.[0];
    const paid = isEntitlementActive(entitlement) || isSubscriptionLive(sub);
    const activeProfileTrial = isProfileTrialActive(profile);
    const profileTrialOnly = activeProfileTrial && !paid;
    setIsProfileTrialOnly(profileTrialOnly);
    setSubscriptionStatus(
      profileTrialOnly ? 'trialing' : ((sub?.status as typeof subscriptionStatus) ?? null),
    );
    setCurrentPeriodEnd(profileTrialOnly ? profile?.trial_ends_at ?? null : sub?.current_period_end ?? null);
    setHasPaidAccess(
      hasFullSuiteAccess({
        entitlement,
        subscription: sub,
        profile,
      }),
    );

    if (profileTrialOnly) {
      setTierLabel('Full Suite Trial');
      setStatusText(
        profile?.trial_ends_at
          ? `You're all set until ${new Date(profile.trial_ends_at).toLocaleDateString()}. Want to keep things running smoothly? Add your payment details before then.`
          : 'Your 14-day Full Suite trial is active.',
      );
    } else if (paid) {
      setTierLabel('Full Suite');
      if (sub?.status) {
        const endDate = sub.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString()
          : null;
        setStatusText(
          endDate
            ? `All good — you're set through ${endDate}.`
            : `You're all set with Full Suite.`,
        );
      } else {
        setStatusText('Full Suite access is active.');
      }
    } else {
      setTierLabel('Paused');
      setStatusText('Your trial wrapped up. Pick a plan to jump back in.');
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

  // E-05: Opens the period-cancel confirmation dialog instead of window.confirm.
  const onCancelAtPeriodEnd = () => {
    if (isWorking) return;
    setPeriodCancelOpen(true);
  };

  const onCancelAtPeriodEndConfirmed = async () => {
    setPeriodCancelOpen(false);
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
        icon={BillingIcon}
        defaultOpen
        extraHeader={
          <span className="inline-flex items-center rounded-md border border-surface-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-medium tracking-[-0.006em] text-content-secondary">
            {tierLabel}
          </span>
        }
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="min-w-0 flex-1 text-sm leading-6 tracking-[-0.006em] text-content-tertiary">
            {isLoading ? 'Loading billing status...' : statusText}
          </p>
          <button
            type="button"
            onClick={() => void loadBillingState({ stripeSyncFirst: true })}
            disabled={isLoading || isWorking}
            className="shrink-0 self-start inline-flex items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm font-medium tracking-[-0.006em] text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary focus-app disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
            Refresh status
          </button>
        </div>
        {isLockedTrial && !hasPaidAccess && (
          <div className="mb-5 rounded-md border border-amber-500/30 bg-amber-500/10 p-5">
            <h4 className="text-sm font-medium tracking-[-0.006em] text-content-primary">Your 14-day trial ended</h4>
            <p className="mt-1 max-w-2xl text-sm leading-6 tracking-[-0.006em] text-content-secondary">
              Your account is paused until you pick a plan. Start a subscription to get back to your Pay List,
              documents, calendar, and settings.
            </p>
          </div>
        )}
        {hasPaidAccess ? (
          <div className="flex flex-col items-center justify-between gap-4 rounded-md border border-emerald-500/25 bg-emerald-500/10 p-5 sm:flex-row">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium tracking-[-0.006em] text-content-primary">
                {isProfileTrialOnly ? 'Your Full Suite trial is active' : "You're on Full Suite"}
              </h4>
              <p className="mt-1 max-w-md text-sm tracking-[-0.006em] text-emerald-200/70">
                {isProfileTrialOnly
                  ? 'You already have Full Suite access during the trial. Start paid billing whenever you are ready so everything keeps working after the trial ends.'
                  : 'Full Suite is active. Update your plan, payment method, or invoices anytime in the billing portal.'}
              </p>
              {subscriptionStatus === 'trialing' && currentPeriodEnd && (
                <p className="mt-2 text-xs tracking-[-0.006em] text-emerald-100/80">
                  Trial active until {new Date(currentPeriodEnd).toLocaleDateString()}. Enable pre-charge reminders in Notifications.
                </p>
              )}
            </div>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:items-end">
              <button
                type="button"
                onClick={isProfileTrialOnly ? onUpgrade : onManageBilling}
                disabled={isWorking}
                className="shrink-0 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium tracking-[-0.006em] text-white shadow-none transition-[background-color,transform] hover:bg-emerald-500 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? 'Working...' : isProfileTrialOnly ? 'Add payment details' : 'Open billing portal'}
              </button>
              <p className="max-w-sm text-left text-[11px] tracking-[-0.006em] text-content-tertiary sm:text-right">
                {isProfileTrialOnly
                  ? 'Adding payment details starts checkout so your subscription is ready before trial access ends.'
                  : "Open billing portal to update payment methods and view invoices."}
              </p>
              {!isProfileTrialOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => onCancelAtPeriodEnd()}
                    disabled={isWorking}
                    className="shrink-0 rounded-md border border-surface-border bg-surface-raised px-4 py-2.5 text-sm font-medium tracking-[-0.006em] text-content-secondary transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel at period end
                  </button>
                  {currentPeriodEnd && (
                    <p className="max-w-sm text-left text-[11px] tracking-[-0.006em] text-content-tertiary sm:text-right">
                      Access continues until{' '}
                      {new Date(currentPeriodEnd).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      .
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setImmediateCancelOpen(true)}
                    disabled={isWorking}
                    className="shrink-0 rounded-md border border-rose-500/40 bg-transparent px-4 py-2.5 text-sm font-medium tracking-[-0.006em] text-rose-400 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel immediately
                  </button>
                  <p className="max-w-sm text-left text-[11px] tracking-[-0.006em] text-content-tertiary sm:text-right">
                    Immediate cancel ends paid access today. We'll keep your data safe for 30 days so you can come back if needed.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-4 rounded-md border border-surface-border bg-surface-raised p-5 sm:flex-row">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-medium tracking-[-0.006em] text-content-primary">
                {isLockedTrial ? 'Pick a plan to continue' : 'Upgrade to Full Suite'}
              </h4>
              <p className="mt-1 max-w-md text-sm tracking-[-0.006em] text-content-secondary/70">
                {isLockedTrial
                  ? `Start Full Suite for $${monthlyPrice.toFixed(2)}/month to get back into your account.`
                  : `Unlock Full Suite: unlimited account sync, debt payoff planner, subscription alerts, and freelancer tax tools for $${monthlyPrice.toFixed(2)}/month.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              disabled={isWorking}
              className="shrink-0 rounded-md bg-brand-indigo px-5 py-2.5 text-sm font-medium tracking-[-0.006em] text-white shadow-none transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isWorking ? 'Working...' : `Upgrade — $${monthlyPrice.toFixed(2)}/mo`}
            </button>
          </div>
        )}
      </CollapsibleModule>

      <CollapsibleModule title="Billing History" icon={BillingIcon} defaultOpen={false}>
        <p className="mb-6 text-sm tracking-[-0.006em] text-content-tertiary">View and download your previous invoices.</p>
        {paymentHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-base p-8 text-center">
            <Download className="mb-3 h-7 w-7 text-content-muted" />
            <p className="text-sm font-medium tracking-[-0.006em] text-content-secondary">No billing history</p>
            <p className="mt-1 text-xs font-medium tracking-[-0.006em] text-content-tertiary">
              {hasPaidAccess
                ? 'Invoices from Stripe will appear here after your first charge.'
                : 'No charges have been made yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border rounded-md border border-surface-border bg-surface-base">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between px-4 py-3 text-xs font-medium tracking-[-0.006em]">
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

      <CollapsibleModule title="Payment Methods" icon={BillingIcon} defaultOpen={false}>
        <p className="mb-6 text-sm tracking-[-0.006em] text-content-tertiary">Manage payment methods used for your subscriptions.</p>
        <div className="mb-4 flex flex-col items-center justify-center rounded-md border border-dashed border-surface-border bg-surface-base p-6 text-center">
          <CreditCardIcon className="mb-3 h-8 w-8 text-content-muted" />
          <p className="text-sm font-medium tracking-[-0.006em] text-content-secondary">
            {hasPaidAccess ? 'Payment methods' : 'No payment method yet'}
          </p>
          <p className="mt-1 text-xs font-medium tracking-[-0.006em] text-content-tertiary">
            {isProfileTrialOnly
              ? 'You are in the trial period and do not need to add payment details yet.'
              : hasPaidAccess
                ? 'Update or change your card anytime in the billing portal.'
                : 'Add your payment details when you start Full Suite.'}
          </p>
        </div>
        <button
          type="button"
          onClick={isProfileTrialOnly ? onUpgrade : onManageBilling}
          disabled={isWorking}
          className="focus-app rounded-md border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium tracking-[-0.006em] text-content-primary transition-colors hover:text-content-secondary"
        >
          {isProfileTrialOnly ? 'Add payment details' : 'Open billing portal'}
        </button>
      </CollapsibleModule>

      <Dialog open={immediateCancelOpen} onClose={() => setImmediateCancelOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-md border border-surface-border bg-surface-raised p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold tracking-[-0.024em] text-content-primary">Cancel immediately?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm tracking-[-0.006em] text-content-tertiary">
              Your Full Suite access ends today. Your data will be retained for 30 days. This is separate from canceling at
              period end.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setImmediateCancelOpen(false)}
                className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium tracking-[-0.006em] text-content-secondary transition-colors hover:bg-surface-elevated"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={() => void onCancelImmediatelyConfirmed()}
                disabled={isWorking}
                className="rounded-md bg-brand-expense px-4 py-2 text-sm font-medium tracking-[-0.006em] text-white transition-[background-color,transform] hover:bg-red-700 active:translate-y-px disabled:opacity-60"
              >
                {isWorking ? 'Working…' : 'End access today'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* E-05: Period-end cancel confirmation dialog */}
      <Dialog open={periodCancelOpen} onClose={() => setPeriodCancelOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-md rounded-md border border-surface-border bg-surface-raised p-6 shadow-xl">
            <Dialog.Title className="text-lg font-semibold tracking-[-0.024em] text-content-primary">Cancel at end of billing period?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm tracking-[-0.006em] text-content-tertiary">
              You keep Full Suite access until{' '}
              {currentPeriodEnd
                ? new Date(currentPeriodEnd).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                : 'your period end date'}. After that, app access pauses until you pick a plan again. Your data stays safe.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPeriodCancelOpen(false)}
                className="rounded-md bg-brand-indigo px-4 py-2 text-sm font-medium tracking-[-0.006em] text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px"
              >
                Keep my plan
              </button>
              <button
                type="button"
                onClick={() => void onCancelAtPeriodEndConfirmed()}
                disabled={isWorking}
                className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium tracking-[-0.006em] text-content-secondary transition-colors hover:bg-surface-elevated disabled:opacity-60"
              >
                {isWorking ? 'Working…' : 'Yes, cancel at period end'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <CollapsibleModule title="Billing Transparency Center" icon={BillingIcon} defaultOpen={false}>
        <div className="space-y-3 text-sm tracking-[-0.006em] text-content-secondary">
          <p>
            Cancel from this app: use <strong className="font-medium tracking-[-0.006em] text-content-primary">Cancel at period end</strong> to keep
            access until the date shown, or <strong className="font-medium tracking-[-0.006em] text-content-primary">Cancel immediately</strong> to end
            paid access today.
          </p>
          <p>
            Trial reminders are sent before first charge when enabled in Notifications (`Trial-to-paid reminder`).
          </p>
          <p>
            You can export data anytime and delete your account immediately from `Data & Privacy`, with a downloadable deletion receipt.
          </p>
          <p className="text-xs tracking-[-0.006em] text-content-tertiary">
            No phone calls or support tickets are required for basic billing cancellation and account deletion flows.
          </p>
        </div>
      </CollapsibleModule>
    </div>
  );
}

export const BillingPanel = memo(BillingPanelInner);
