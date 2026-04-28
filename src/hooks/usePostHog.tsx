import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useAuth } from './useAuth';

// PostHog API key from environment
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

/**
 * PostHog Analytics Provider
 * Wraps the app and initializes PostHog tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only', // Don't create profiles for anonymous users
      capture_pageview: true, // Capture pageviews automatically
      capture_pageleave: true, // Capture page leave events
      disable_session_recording: true, // Disable session recording for privacy
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

/**
 * Track user identity when they sign in
 */
export function usePostHogIdentity() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && POSTHOG_KEY) {
      posthog.identify(user.id, {
        email: user.email,
        created_at: user.created_at,
      });
    } else if (!user?.id) {
      posthog.reset();
    }
  }, [user]);
}

/**
 * Helper function to track custom events
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (POSTHOG_KEY) {
    posthog.capture(eventName, properties);
  }
}
