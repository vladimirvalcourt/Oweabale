/**
 * storageKeys.ts — centralized registry of all localStorage/sessionStorage keys.
 *
 * Rules:
 *  1. Define every key here. Never use raw string literals in components.
 *  2. All keys must be namespaced with 'oweable_' to avoid collisions.
 *  3. When adding a key, document what it stores and when it's cleared.
 *  4. Keys that must be cleared on sign-out are marked with @clearOnSignOut.
 */

export const STORAGE_KEYS = {
  // ── PWA ────────────────────────────────────────────────────────────────────
  /** Whether the user dismissed the PWA install banner. Persists across sessions. */
  PWA_INSTALL_DISMISSED: 'pwa_install_dismissed',

  // ── Dashboard ──────────────────────────────────────────────────────────────
  /** Calm mode toggle state (1 = enabled). @clearOnSignOut */
  DASHBOARD_CALM_MODE: 'oweable_dashboard_calm_mode',
  /** Unix timestamp (ms): snooze low-tax-reserve alert until this time. @clearOnSignOut */
  LOW_TAX_RESERVE_SNOOZE_UNTIL: 'oweable_low_tax_reserve_snooze_until',

  // ── Goals ──────────────────────────────────────────────────────────────────
  /** JSON array of accountability check-in timestamps. @clearOnSignOut */
  ACCOUNTABILITY_CHECKINS: 'oweable_accountability_checkins',

  // ── Subscriptions ──────────────────────────────────────────────────────────
  /** JSON array of subscription IDs the user has reviewed for cancellation. @clearOnSignOut */
  CANCELLATION_REVIEWED: 'oweable_cancellation_reviewed',

  // ── Notifications ──────────────────────────────────────────────────────────
  /** JSON object of notification preference overrides (pre-server migration). @clearOnSignOut */
  NOTIFICATION_PREFS: 'oweable_notification_prefs',
  /** Marker key for trial reminder (value = ISO date string). @clearOnSignOut */
  TRIAL_REMINDER_SENT: 'oweable_trial_reminder_sent',

  // ── Insurance ──────────────────────────────────────────────────────────────
  /** Whether the insurance onboarding banner was dismissed. @clearOnSignOut */
  INSURANCE_BANNER_DISMISSED: 'oweable_insurance_banner_dismissed',

  // ── Settings ───────────────────────────────────────────────────────────────
  /** JSON receipt object from last account deletion. Cleared 24h after use. */
  LAST_DELETION_RECEIPT: 'oweable_last_deletion_receipt',

  // ── Bank Connection ────────────────────────────────────────────────────────
  /** JSON array (max 20) of bank connection timeline events. @clearOnSignOut */
  CONNECTION_TIMELINE: 'oweable_connection_timeline',

  // ── Admin ──────────────────────────────────────────────────────────────────
  /** JSON object for active admin impersonation state. Cleared on stop-impersonating. */
  ADMIN_IMPERSONATION: 'oweable_admin_impersonation',

  // ── Notification Prefs (Settings > Notifications) ──────────────────────────
  /** Key used in settings constants for notification preferences. Kept as-is for backwards compat. */
  NOTIF_PREFS_SETTINGS: 'oweable_notification_preferences',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Keys that should be wiped when the user signs out.
 * Call `clearUserStorageKeys()` from the store's `signOut` action.
 */
export const SIGN_OUT_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.DASHBOARD_CALM_MODE,
  STORAGE_KEYS.LOW_TAX_RESERVE_SNOOZE_UNTIL,
  STORAGE_KEYS.ACCOUNTABILITY_CHECKINS,
  STORAGE_KEYS.CANCELLATION_REVIEWED,
  STORAGE_KEYS.NOTIFICATION_PREFS,
  STORAGE_KEYS.TRIAL_REMINDER_SENT,
  STORAGE_KEYS.INSURANCE_BANNER_DISMISSED,
  STORAGE_KEYS.CONNECTION_TIMELINE,
  STORAGE_KEYS.NOTIF_PREFS_SETTINGS,
] as const;

/** Call this from the Zustand `signOut` action to wipe all user-scoped storage. */
export function clearUserStorageKeys(): void {
  for (const key of SIGN_OUT_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently skip — private browsing or storage quota exceeded
    }
  }
}
