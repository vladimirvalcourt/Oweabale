export type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'billing'
  | 'financial'
  | 'privacy'
  | 'integrations'
  | 'rules'
  | 'support'
  | 'feedback';

export const NOTIF_PREFS_STORAGE_KEY = 'oweable_notification_prefs_v1';

export const DEFAULT_NOTIF_PREFS: Record<
  | 'bill-reminders'
  | 'weekly-summary'
  | 'new-login'
  | 'push-reminders'
  | 'push-payments'
  | 'sniper-increase'
  | 'sniper-renewal'
  | 'detonator-milestone'
  | 'detonator-rate',
  boolean
> = {
  'bill-reminders': true,
  'weekly-summary': true,
  'new-login': true,
  'push-reminders': true,
  'push-payments': false,
  'sniper-increase': true,
  'sniper-renewal': true,
  'detonator-milestone': true,
  'detonator-rate': true,
};

export type NotifPrefKey = keyof typeof DEFAULT_NOTIF_PREFS;

export function loadNotifPrefs(): Record<NotifPrefKey, boolean> {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_NOTIF_PREFS };
  }
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIF_PREFS };
    const parsed = JSON.parse(raw) as Partial<Record<NotifPrefKey, boolean>>;
    const next = { ...DEFAULT_NOTIF_PREFS };
    for (const k of Object.keys(DEFAULT_NOTIF_PREFS) as NotifPrefKey[]) {
      if (typeof parsed[k] === 'boolean') next[k] = parsed[k];
    }
    return next;
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export const SETTINGS_TAB_IDS: SettingsTab[] = [
  'profile',
  'notifications',
  'security',
  'billing',
  'financial',
  'privacy',
  'integrations',
  'rules',
  'support',
  'feedback',
];
