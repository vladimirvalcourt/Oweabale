import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Mail, BellRing, BrainCircuit } from 'lucide-react';
import { CollapsibleModule } from '../../components/CollapsibleModule';
import { toast } from 'sonner';
import { NOTIF_PREFS_STORAGE_KEY, type NotifPrefKey, loadNotifPrefs } from './constants';

function deferToast(fn: () => void) {
  requestAnimationFrame(() => {
    queueMicrotask(fn);
  });
}

function NotificationsPanelInner() {
  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        <p className="text-sm text-content-tertiary mb-6">Manage notifications delivered directly to your device.</p>
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

      <CollapsibleModule title="Smart Alerts (The Arsenal)" icon={BrainCircuit} defaultOpen={false}>
        <p className="text-sm text-content-tertiary mb-6">Advanced notifications powered by our algorithms.</p>
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
      </CollapsibleModule>
    </div>
  );
}

export const NotificationsPanel = memo(NotificationsPanelInner);
