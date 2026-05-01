/**
 * Real-user INP (Interaction to Next Paint) with web-vitals attribution.
 * Logs slow interactions to console in development mode.
 * https://web.dev/articles/inp
 */
import { onINP } from 'web-vitals/attribution';
import type { INPMetricWithAttribution } from 'web-vitals';

const reportAll =
  import.meta.env.DEV ||
  import.meta.env.VITE_WEB_VITALS_VERBOSE === 'true' ||
  import.meta.env.VITE_WEB_VITALS_VERBOSE === '1';

function summarizeLoafEntries(entries: INPMetricWithAttribution['attribution']['longAnimationFrameEntries']) {
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

/**
 * Subscribe to INP performance metric.
 * Logs slow interactions to console in development.
 */
export function initWebVitalsReporting(): void {
  if (typeof window === 'undefined') return;

  onINP((metric) => {
    if ((import.meta.env.DEV || reportAll) && metric.rating !== 'good') {
      console.warn('[web-vitals] Slow INP', inpPayload(metric));
    }
  });
}
