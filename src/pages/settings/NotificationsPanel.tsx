import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Mail, BellRing, BrainCircuit, Loader2 } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
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
        <p className="text-sm text-content-tertiary mb-6">Choose what updates you want to receive via email.</p>
        <div className="space-y-6">
          {[
            { id: 'bill-reminders' as const, label: 'Bill Reminders', desc: 'Get notified 3 days before a bill is due.' },
            { id: 'weekly-summary' as const, label: 'Weekly Summary', desc: 'Receive a weekly overview of your spending and upcoming bills.' },
            { id: 'new-login' as const, label: 'New Device Login', desc: 'Security alerts when your account is accessed from a new device.' },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                <p className="text-xs text-content-tertiary mt-1">{item.desc}</p>
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
                  className="h-4 w-4 text-indigo-500 focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Push Notifications" icon={BellRing} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">
          Browser push for this device. When you enable due-date and payment alerts below, we&apos;ll use this subscription to deliver
          them once server scheduling is wired.
        </p>

        {!isWebPushSupported() && (
          <p className="text-xs text-content-muted mb-4">Your browser does not support web push.</p>
        )}
        {isWebPushSupported() && !vapidConfigured && (
          <p className="text-xs text-amber-500/90 mb-4">
            Web push is not configured yet (add <span className="font-mono">VITE_VAPID_PUBLIC_KEY</span>).
          </p>
        )}

        {isWebPushSupported() && vapidConfigured && (
          <div className="mb-6 rounded-sm border border-surface-border bg-surface-base p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-content-primary">This browser</p>
              <p className="text-xs text-content-muted mt-0.5">
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
                  className="inline-flex items-center gap-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
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
                    className="inline-flex items-center gap-2 rounded-sm border border-surface-border bg-surface-elevated px-4 py-2 text-xs font-medium text-content-secondary hover:text-content-primary disabled:opacity-60"
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
                    className="inline-flex items-center gap-2 rounded-sm border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-60"
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
            { id: 'push-reminders' as const, label: 'Due Date Alerts', desc: 'Immediate alerts on the day a bill is due.' },
            { id: 'push-payments' as const, label: 'Payment Confirmations', desc: 'Get notified when a payment is successfully recorded.' },
          ].map((item) => (
            <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                <p className="text-xs text-content-tertiary mt-1">{item.desc}</p>
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
                  className="h-4 w-4 text-indigo-500 focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
                />
              </div>
            </div>
          ))}
        </div>
      </CollapsibleModule>

      <CollapsibleModule title="Smart Alerts (Full Suite)" icon={BrainCircuit} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Optional premium alerts for subscriptions and debt progress.</p>
        {hasFullSuite || isAdmin ? (
          <div className="space-y-6">
            {[
              { id: 'sniper-increase' as const, label: 'Subscription Sniper: Price Hikes', desc: 'Alert me instantly if a subscription price increases.' },
              { id: 'sniper-renewal' as const, label: 'Subscription Sniper: Auto-Renewals', desc: 'Alert me 7 days before an annual subscription renews.' },
              { id: 'detonator-milestone' as const, label: 'Debt Detonator: Milestones', desc: 'Celebrate when I pay off 25%, 50%, 75%, and 100% of a debt.' },
              { id: 'detonator-rate' as const, label: 'Debt Detonator: Rate Changes', desc: 'Alert me if a variable interest rate changes.' },
            ].map((item) => (
              <div key={item.id} className="flex items-start justify-between border-b border-surface-border pb-4 last:border-0 last:pb-0">
                <div className="pr-4">
                  <label htmlFor={item.id} className="text-sm font-medium text-content-primary cursor-pointer">{item.label}</label>
                  <p className="text-xs text-content-tertiary mt-1">{item.desc}</p>
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
                    className="h-4 w-4 text-indigo-500 focus-app bg-surface-base border-surface-border rounded transition-colors cursor-pointer"
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
