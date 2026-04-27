/**
 * Real-user INP (Interaction to Next Paint) with web-vitals attribution.
 * Sends actionable context to Sentry when interactions are slow — see
 * https://web.dev/articles/inp
 */
import * as Sentry from '@sentry/react';
import { onINP } from 'web-vitals/attribution';
import type { INPAttribution, INPMetricWithAttribution } from 'web-vitals';

const sentryDsn =
  typeof import.meta.env.VITE_SENTRY_DSN === 'string' ? import.meta.env.VITE_SENTRY_DSN.trim() : '';

const reportAll =
  import.meta.env.DEV ||
  import.meta.env.VITE_WEB_VITALS_VERBOSE === 'true' ||
  import.meta.env.VITE_WEB_VITALS_VERBOSE === '1';

function summarizeLoafEntries(entries: INPAttribution['longAnimationFrameEntries']) {
  if (!entries?.length) return { count: 0, samples: [] as { startTime: number; duration: number }[] };
  const samples = entries.slice(0, 3).map((e) => ({
    startTime: e.startTime,
    duration: e.duration,
  }));
  return { count: entries.length, samples };
}

function inpPayload(metric: INPMetricWithAttribution) {
  const a = metric.attribution;
  return {
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    value_ms: Math.round(metric.value),
    rating: metric.rating,
    navigation_type: metric.navigationType,
    id: metric.id,
    interaction_target: a.interactionTarget,
    interaction_type: a.interactionType,
    input_delay_ms: Math.round(a.inputDelay),
    processing_duration_ms: Math.round(a.processingDuration),
    presentation_delay_ms: Math.round(a.presentationDelay),
    load_state: a.loadState,
    long_animation_frames: summarizeLoafEntries(a.longAnimationFrameEntries),
    processed_event_count: a.processedEventEntries?.length ?? 0,
  };
}

function shouldSendToSentry(metric: INPMetricWithAttribution): boolean {
  if (!sentryDsn) return false;
  if (reportAll) return true;
  return metric.rating !== 'good';
}

function reportInpToSentry(metric: INPMetricWithAttribution) {
  const data = inpPayload(metric);
  const level =
    metric.rating === 'poor' ? 'warning' : metric.rating === 'needs-improvement' ? 'info' : 'info';

  Sentry.captureMessage(`INP ${data.value_ms}ms (${metric.rating})`, {
    level,
    tags: {
      web_vital: 'INP',
      inp_rating: metric.rating,
      path: data.path || 'unknown',
    },
    contexts: {
      web_vitals_inp: data as Record<string, unknown>,
    },
    fingerprint: ['web-vitals-inp', data.interaction_target || 'unknown', data.path || ''],
  });
}

/**
 * Subscribe to INP; safe to call once after Sentry `init` (see `instrument.ts`).
 */
export function initWebVitalsReporting(): void {
  if (typeof window === 'undefined') return;

  onINP((metric) => {
    if (import.meta.env.DEV && metric.rating !== 'good') {
      console.warn('[web-vitals] Slow INP', inpPayload(metric));
    }
    if (shouldSendToSentry(metric)) {
      reportInpToSentry(metric);
    }
  });
}
