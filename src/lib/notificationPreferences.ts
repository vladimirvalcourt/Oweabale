import {
  DEFAULT_NOTIF_PREFS,
  type NotifPrefKey,
} from '../pages/settings/constants';

export type NotificationPrefsRecord = Record<NotifPrefKey, boolean>;

/** Merge defaults with a partial record (e.g. from JSONB). */
export function normalizeNotificationPrefsRecord(raw: unknown): NotificationPrefsRecord {
  const next: NotificationPrefsRecord = { ...DEFAULT_NOTIF_PREFS };
  if (!raw || typeof raw !== 'object') return next;
  const o = raw as Partial<Record<NotifPrefKey, boolean>>;
  for (const k of Object.keys(DEFAULT_NOTIF_PREFS) as NotifPrefKey[]) {
    if (typeof o[k] === 'boolean') next[k] = o[k];
  }
  return next;
}

/** True when the server has no meaningful notification prefs saved. */
export function isNotificationPrefsEmpty(server: unknown): boolean {
  if (server == null) return true;
  if (typeof server !== 'object') return true;
  return Object.keys(server as object).length === 0;
}

/**
 * Prefer server when it has keys; otherwise use local (legacy localStorage) so we can migrate.
 */
export function mergeNotificationPrefsFromSources(
  server: unknown,
  local: NotificationPrefsRecord,
): NotificationPrefsRecord {
  if (!isNotificationPrefsEmpty(server)) {
    return normalizeNotificationPrefsRecord(server);
  }
  return { ...local };
}
