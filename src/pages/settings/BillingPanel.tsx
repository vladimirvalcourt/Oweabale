import React, { memo, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
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

  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const accessLabel = isLoading
    ? 'Checking access'
    : hasPaidAccess
      ? isProfileTrialOnly
        ? 'Trial active'
        : 'Active'
      : isLockedTrial
        ? 'Trial ended'
        : 'Not upgraded';
  const primaryActionLabel = isWorking
    ? 'Working...'
    : hasPaidAccess && !isProfileTrialOnly
      ? 'Open billing portal'
      : isProfileTrialOnly
        ? 'Add payment details'
        : `Upgrade - $${monthlyPrice.toFixed(2)}/mo`;
  const primaryAction = hasPaidAccess && !isProfileTrialOnly ? onManageBilling : onUpgrade;
  const statusTone = hasPaidAccess
    ? 'border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] text-[var(--color-status-emerald-text)]'
    : isLockedTrial
      ? 'border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]'
      : 'border-surface-border bg-surface-base text-content-secondary';

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1fr_260px]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium', statusTone)}>
                {hasPaidAccess ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <BillingIcon className="h-3.5 w-3.5" aria-hidden />}
                {accessLabel}
              </span>
              <span className="inline-flex items-center rounded-md border border-surface-border-subtle bg-surface-base px-3 py-1.5 text-xs font-medium text-content-secondary">
                {tierLabel}
              </span>
            </div>

            <div className="mt-8 max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Plan & access</p>
              <h2 className="mt-3 text-3xl font-medium tracking-[-0.045em] text-content-primary sm:text-4xl">
                {hasPaidAccess
                  ? isProfileTrialOnly
                    ? 'Your trial is active.'
                    : 'Full Suite is ready.'
                  : isLockedTrial
                    ? 'Pick a plan to continue.'
                    : 'Start Full Suite when you need more room.'}
              </h2>
              <p className="mt-4 text-sm leading-6 tracking-[-0.006em] text-content-tertiary">
                {isLoading ? 'Loading billing status...' : statusText}
              </p>
            </div>

            {isLockedTrial && !hasPaidAccess && (
              <div className="mt-6 flex gap-3 rounded-md border border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-status-amber-text)]" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-content-primary">Your app access is paused.</p>
                  <p className="mt-1 text-sm leading-6 text-content-secondary">
                    Start Full Suite to reopen your Pay List, documents, calendar, and settings.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-surface-border bg-surface-base/50 p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">Current plan</p>
            <div className="mt-4 font-mono text-4xl tracking-[-0.05em] text-content-primary">
              ${monthlyPrice.toFixed(2)}
              <span className="ml-1 text-sm font-sans font-medium tracking-[-0.006em] text-content-muted">/mo</span>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-content-muted">Status</dt>
                <dd className="text-right font-medium text-content-primary">{accessLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-content-muted">{isProfileTrialOnly ? 'Trial ends' : 'Access through'}</dt>
                <dd className="text-right font-medium text-content-primary">{periodEndLabel ?? 'Not scheduled'}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={primaryAction}
                disabled={isWorking || isLoading}
                className="focus-app inline-flex min-h-11 items-center justify-center rounded-md bg-content-primary px-4 py-2 text-sm font-semibold text-surface-base transition-[background-color,transform] hover:bg-content-secondary active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {primaryActionLabel}
              </button>
              <button
                type="button"
                onClick={() => void loadBillingState({ stripeSyncFirst: true })}
                disabled={isLoading || isWorking}
                className="focus-app inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} aria-hidden />
                Refresh status
              </button>
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-surface-border-subtle bg-surface-base">
              <CreditCardIcon className="h-4 w-4 text-content-tertiary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium tracking-[-0.006em] text-content-primary">Payment method</h3>
              <p className="mt-1 text-sm leading-6 text-content-tertiary">
                {isProfileTrialOnly
                  ? 'No card is required during the trial. Add one only when you want paid access queued up.'
                  : hasPaidAccess
                    ? 'Update cards, invoices, and billing details in Stripe.'
                    : 'Add payment details when you start Full Suite.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={isProfileTrialOnly || !hasPaidAccess ? onUpgrade : onManageBilling}
            disabled={isWorking || isLoading}
            className="focus-app mt-5 inline-flex min-h-10 items-center justify-center rounded-md border border-surface-border bg-surface-elevated px-4 py-2 text-sm font-medium text-content-primary transition-colors hover:bg-surface-highlight disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProfileTrialOnly || !hasPaidAccess ? 'Add payment details' : 'Open billing portal'}
          </button>
        </section>

        <section className="rounded-lg border border-surface-border bg-surface-raised p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-surface-border-subtle bg-surface-base">
              <Download className="h-4 w-4 text-content-tertiary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium tracking-[-0.006em] text-content-primary">Invoices</h3>
              <p className="mt-1 text-sm leading-6 text-content-tertiary">
                {paymentHistory.length > 0
                  ? `${paymentHistory.length} recent payment${paymentHistory.length === 1 ? '' : 's'} synced from Stripe.`
                  : hasPaidAccess
                    ? 'Invoices appear here after the first charge posts.'
                    : 'No charges have been made yet.'}
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-md border border-surface-border bg-surface-base">
            {paymentHistory.length === 0 ? (
              <div className="flex items-center gap-3 p-4 text-sm text-content-tertiary">
                <FileText className="h-4 w-4 shrink-0 text-content-muted" aria-hidden />
                No billing history yet.
              </div>
            ) : (
              paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-surface-border px-4 py-3 text-xs last:border-b-0">
                  <span className="text-content-secondary">{new Date(payment.created_at).toLocaleDateString()}</span>
                  <span className="font-mono text-content-primary">
                    ${(payment.amount_total / 100).toFixed(2)} {payment.currency.toUpperCase()}
                  </span>
                  <span className="capitalize text-content-tertiary">{payment.status}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-surface-border bg-surface-raised p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" aria-hidden />
            <p className="text-sm leading-6 text-content-secondary">Cancel from the app without a support ticket.</p>
          </div>
          <div className="flex gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" aria-hidden />
            <p className="text-sm leading-6 text-content-secondary">Trial reminders use your Notifications preference.</p>
          </div>
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" aria-hidden />
            <p className="text-sm leading-6 text-content-secondary">Data export and account deletion live in the Data tab.</p>
          </div>
        </div>
      </section>

      {hasPaidAccess && !isProfileTrialOnly && (
        <section className="rounded-lg border border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-status-rose-text)]">Danger zone</p>
              <h3 className="mt-2 text-base font-medium tracking-[-0.018em] text-content-primary">Change or end paid access</h3>
              <p className="mt-2 text-sm leading-6 text-content-tertiary">
                Cancel at period end to keep access through {periodEndLabel ?? 'your period end date'}, or cancel immediately to end paid access today.
                Your data stays safe for 30 days.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-56">
              <button
                type="button"
                onClick={onCancelAtPeriodEnd}
                disabled={isWorking}
                className="focus-app inline-flex min-h-10 items-center justify-center rounded-md border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel at period end
              </button>
              <button
                type="button"
                onClick={() => setImmediateCancelOpen(true)}
                disabled={isWorking}
                className="focus-app inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--color-status-rose-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--color-status-rose-text)] transition-colors hover:bg-[var(--color-status-rose-bg)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel immediately
              </button>
            </div>
          </div>
        </section>
      )}

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
                className="rounded-md bg-[var(--color-status-rose-text)] px-4 py-2 text-sm font-semibold tracking-[-0.006em] text-surface-base transition-[filter,transform] hover:brightness-95 active:translate-y-px disabled:opacity-60"
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
                className="rounded-md bg-content-primary px-4 py-2 text-sm font-semibold tracking-[-0.006em] text-surface-base transition-[background-color,transform] hover:bg-content-secondary active:translate-y-px"
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

    </div>
  );
}

export const BillingPanel = memo(BillingPanelInner);
