type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

/**
 * Lightweight product analytics hook. Extend via window or Edge later without * scattering ad-hoc logging across the app.
 */
export function track(event: string, props?: AnalyticsPayload): void {
  if (import.meta.env.DEV) {
    console.debug(`[oweable] ${event}`, props ?? {});
  }
  const w = typeof window !== 'undefined' ? (window as Window & { __oweableTrack?: (e: string, p?: AnalyticsPayload) => void }) : null;
  w?.__oweableTrack?.(event, props);
}
