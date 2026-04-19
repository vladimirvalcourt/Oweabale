import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Mail, BellRing, BrainCircuit, Loader2, Zap } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../store/useStore';
import { NOTIF_PREFS_STORAGE_KEY, type NotifPrefKey, loadNotifPrefs } from './constants';
import { useFullSuiteAccess } from '../../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../../components/FullSuiteGate';
import {
  getVapidPublicKey,
  hasActivePushSubscription,
  isWebPushSupported,
  sendTestWebPush,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../../lib/webPush';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function NotificationsPanelInner() {
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { financialAlertPrefs, updateUser } = useStore(
    useShallow((s) => ({
      financialAlertPrefs: s.user.financialAlertPrefs,
      updateUser: s.updateUser,
    })),
  );
  const { hasFullSuite, isAdmin } = useFullSuiteAccess();
  const [webPushReady, setWebPushReady] = useState<boolean | null>(null);
  const [webPushBusy, setWebPushBusy] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const vapid = getVapidPublicKey();
      if (cancelled) return;
      setVapidConfigured(Boolean(vapid));
      const supported = isWebPushSupported() && Boolean(vapid);
      const active = supported ? await hasActivePushSubscription() : false;
      if (!cancelled) setWebPushReady(supported && active);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const schedulePersist = useCallback((next: Record<NotifPrefKey, boolean>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      try {
        localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private mode */
      }
    }, 400);
  }, []);

  const setPref = useCallback(
    (key: NotifPrefKey, value: boolean) => {
      setNotifPrefs((prev) => {
        const next = { ...prev, [key]: value };
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  return (
    <div className="space-y-6">
      <CollapsibleModule title="Email Notifications" icon={Mail} defaultOpen>
        <p className="mb-6 text-sm font-medium text-content-secondary">Choose what updates you want to receive via email.</p>
        <div className="space-y-6">
          {[
            { id: 'bill-reminders' as const, label: 'Bill reminders', desc: 'Get notified 3 days before a bill is due.' },
            { id: 'weekly-summary' as const, label: 'Weekly summary', desc: 'Receive a weekly overview of your spending and upcoming bills.' },
            { id: 'new-login' as const, label: 'New device login', desc: 'Security alerts when your account is accessed from a new device.' },
            {
              id: 'trial-charge-reminder' as const,
              label: 'Trial-to-paid reminder',
              desc: 'Get a reminder before any free trial converts into a paid subscription.',
            },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                <p className="mt-1 text-xs font-medium text-content-tertiary">{item.desc}</p>
              </div>
              <div className="flex items-center h-5 mt-1">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={notifPrefs[item.id]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPref(item.id, checked);
                    deferToast(() => toast.success(`${item.label} ${checked ? 'enabled' : 'disabled'}`));
                  }}
                  className="h-4 w-4 cursor-pointer rounded border-surface-border bg-surface-base text-emerald-500 transition-colors focus-app"
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Push Notifications" icon={BellRing} defaultOpen={false}>
        <p className="mb-6 text-sm font-medium text-content-secondary">
          Browser push for this device. When you enable due-date and payment alerts below, we&apos;ll use this subscription to deliver
          them once server scheduling is wired.
        </p>

        {!isWebPushSupported() && (
          <p className="mb-4 text-xs font-medium text-content-muted">Your browser does not support web push.</p>
        )}
        {isWebPushSupported() && !vapidConfigured && (
          <p className="mb-4 text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-400/90">
            Web push is not configured yet (add{' '}
            <code className="rounded-md border border-surface-border bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-content-primary">
              VITE_VAPID_PUBLIC_KEY
            </code>
            ).
          </p>
        )}

        {isWebPushSupported() && vapidConfigured && (
          <div className="mb-6 rounded-lg border border-surface-border bg-surface-base p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-content-primary">This browser</p>
              <p className="mt-0.5 text-xs font-medium text-content-muted">
                {webPushReady === null ? 'Checking…' : webPushReady ? 'Push enabled for this device.' : 'Push not enabled yet.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!webPushReady && (
                <button
                  type="button"
                  disabled={webPushBusy}
                  onClick={async () => {
                    setWebPushBusy(true);
                    const r = await subscribeWebPush();
                    setWebPushBusy(false);
                    if ('error' in r) {
                      toast.error(r.error);
                      return;
                    }
                    setWebPushReady(true);
                    toast.success('Browser notifications enabled');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2.5 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:opacity-60"
                >
                  {webPushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Enable web push
                </button>
              )}
              {webPushReady && (
                <>
                  <button
                    type="button"
                    disabled={webPushBusy}
                    onClick={async () => {
                      setWebPushBusy(true);
                      const r = await sendTestWebPush();
                      setWebPushBusy(false);
                      if ('error' in r) toast.error(r.error);
                      else toast.success('Test push sent');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-content-secondary transition-colors hover:border-content-muted hover:text-content-primary disabled:opacity-60"
                  >
                    {webPushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Send test
                  </button>
                  <button
                    type="button"
                    disabled={webPushBusy}
                    onClick={async () => {
                      setWebPushBusy(true);
                      const r = await unsubscribeWebPush();
                      setWebPushBusy(false);
                      if ('error' in r) {
                        toast.error(r.error);
                        return;
                      }
                      setWebPushReady(false);
                      toast.success('Browser push disabled on this device');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-500/20 disabled:opacity-60 dark:text-rose-300"
                  >
                    Turn off
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {[
            { id: 'push-reminders' as const, label: 'Due date alerts', desc: 'Immediate alerts on the day a bill is due.' },
            { id: 'push-payments' as const, label: 'Payment confirmations', desc: 'Get notified when a payment is successfully recorded.' },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                <p className="mt-1 text-xs font-medium text-content-tertiary">{item.desc}</p>
              </div>
              <div className="flex items-center h-5 mt-1">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={notifPrefs[item.id]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPref(item.id, checked);
                    deferToast(() => toast.success(`${item.label} ${checked ? 'enabled' : 'disabled'}`));
                  }}
                  className="h-4 w-4 text-content-secondary focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Financial Alerts" icon={Zap} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">
          Push rules stored on your profile for the Oweable alert runner. Requires browser push to be enabled above.
        </p>
        <div className="space-y-6">
          {[
            {
              id: 'alert-bill-due',
              label: 'Bill due soon',
              desc: 'Alert 1–3 days before a bill is due.',
              checked: financialAlertPrefs.billDueDays.length > 0,
              onChange: async (checked: boolean) => {
                const ok = await updateUser({
                  financialAlertPrefs: {
                    ...financialAlertPrefs,
                    billDueDays: checked ? [1, 3] : [],
                  },
                });
                if (ok) deferToast(() => toast.success(`Bill due alerts ${checked ? 'enabled' : 'disabled'}`));
              },
            },
            {
              id: 'alert-over-budget',
              label: 'Over budget',
              desc: 'Alert when a budget category is exceeded this month.',
              checked: financialAlertPrefs.overBudget,
              onChange: async (checked: boolean) => {
                const ok = await updateUser({
                  financialAlertPrefs: { ...financialAlertPrefs, overBudget: checked },
                });
                if (ok) deferToast(() => toast.success(`Over-budget alerts ${checked ? 'enabled' : 'disabled'}`));
              },
            },
            {
              id: 'alert-low-cash',
              label: 'Low cash warning',
              desc: 'Alert when liquid cash drops below one week of safe-to-spend.',
              checked: financialAlertPrefs.lowCash,
              onChange: async (checked: boolean) => {
                const ok = await updateUser({
                  financialAlertPrefs: { ...financialAlertPrefs, lowCash: checked },
                });
                if (ok) deferToast(() => toast.success(`Low cash alerts ${checked ? 'enabled' : 'disabled'}`));
              },
            },
            {
              id: 'alert-debt-due',
              label: 'Debt payment due',
              desc: 'Alert 2 days before a debt minimum payment is due.',
              checked: financialAlertPrefs.debtDue,
              onChange: async (checked: boolean) => {
                const ok = await updateUser({
                  financialAlertPrefs: { ...financialAlertPrefs, debtDue: checked },
                });
                if (ok) deferToast(() => toast.success(`Debt due alerts ${checked ? 'enabled' : 'disabled'}`));
              },
            },
            {
              id: 'alert-invoice-due',
              label: 'Client invoice due',
              desc: 'Alert when a freelance invoice is due (same day windows as bills) or overdue.',
              checked: financialAlertPrefs.invoiceDue,
              onChange: async (checked: boolean) => {
                const ok = await updateUser({
                  financialAlertPrefs: { ...financialAlertPrefs, invoiceDue: checked },
                });
                if (ok) deferToast(() => toast.success(`Invoice alerts ${checked ? 'enabled' : 'disabled'}`));
              },
            },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                <p className="mt-1 text-xs font-medium text-content-tertiary">{item.desc}</p>
              </div>
              <div className="flex items-center h-5 mt-1">
                <input
                  id={item.id}
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => void item.onChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-surface-border bg-surface-base text-emerald-500 transition-colors focus-app"
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Smart Alerts (Full Suite)" icon={BrainCircuit} defaultOpen={false}>
        <p className="mb-6 text-sm font-medium text-content-secondary">Optional premium alerts for subscriptions and debt progress.</p>
        {hasFullSuite || isAdmin ? (
          <div className="space-y-6">
            {[
              { id: 'sniper-increase' as const, label: 'Subscription Sniper: price hikes', desc: 'Alert me instantly if a subscription price increases.' },
              { id: 'sniper-renewal' as const, label: 'Subscription Sniper: auto-renewals', desc: 'Alert me 7 days before an annual subscription renews.' },
              { id: 'detonator-milestone' as const, label: 'Debt Detonator: milestones', desc: 'Celebrate when I pay off 25%, 50%, 75%, and 100% of a debt.' },
              { id: 'detonator-rate' as const, label: 'Debt Detonator: rate changes', desc: 'Alert me if a variable interest rate changes.' },
            ].map((item) => (
              <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
                <div className="pr-4">
                  <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                  <p className="mt-1 text-xs font-medium text-content-tertiary">{item.desc}</p>
                </div>
                <div className="flex items-center h-5 mt-1">
                  <input
                    id={item.id}
                    type="checkbox"
                    checked={notifPrefs[item.id]}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPref(item.id, checked);
                      deferToast(() => toast.success(`${item.label} ${checked ? 'enabled' : 'disabled'}`));
                    }}
                    className="h-4 w-4 cursor-pointer rounded border-surface-border bg-surface-base text-emerald-500 transition-colors focus-app"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FullSuiteGateCard
            compact
            title="Smart Alerts are on Full Suite"
            description="Upgrade to enable Subscription Sniper and Debt Detonator alert automations."
          />
        )}
      </CollapsibleModule>
    </div>
  );
}

export const NotificationsPanel = memo(NotificationsPanelInner);
