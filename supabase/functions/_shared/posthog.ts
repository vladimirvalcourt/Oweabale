/**
 * Shared PostHog helper for Supabase Edge Functions (Deno).
 *
 * Uses posthog-node via esm.sh. Edge functions are short-lived, so we set
 * flushAt:1 and flushInterval:0 to send events immediately, and always call
 * posthog.shutdown() after capturing to flush before the function exits.
 */
import { PostHog } from 'https://esm.sh/posthog-node@4';

const POSTHOG_KEY = Deno.env.get('POSTHOG_KEY') ?? '';
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') ?? '';

/**
 * Create a short-lived PostHog client suitable for a single edge function
 * invocation. Call `await posthog.shutdown()` before the handler returns.
 */
export function createPostHogClient(): PostHog | null {
  if (!POSTHOG_KEY || !POSTHOG_HOST) return null;
  return new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: false, // server-side only; no DOM
  });
}
