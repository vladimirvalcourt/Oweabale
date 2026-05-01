/**
 * Sentry must load before the rest of the app (see Sentry React SDK skill).
 * Imported first from `main.tsx`.
 */
import * as React from 'react';
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import { supabaseIntegration } from '@supabase/sentry-js-integration';
import { supabase } from './lib/api/supabase/client';
import { isStaleDynamicImportError } from './lib/utils/dynamicImportErrors';

const dsn = typeof import.meta.env.VITE_SENTRY_DSN === 'string' ? import.meta.env.VITE_SENTRY_DSN.trim() : '';

if (dsn) {
  const releaseResolved =
    typeof import.meta.env.VITE_SENTRY_RELEASE_RESOLVED === 'string'
      ? import.meta.env.VITE_SENTRY_RELEASE_RESOLVED.trim()
      : '';
  const release = releaseResolved || undefined;

  const environment =
    typeof import.meta.env.VITE_SENTRY_ENVIRONMENT_RESOLVED === 'string'
      ? import.meta.env.VITE_SENTRY_ENVIRONMENT_RESOLVED.trim()
      : import.meta.env.MODE;

  const tracePropagationTargets: (string | RegExp)[] = ['localhost'];
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) tracePropagationTargets.push(new URL(supabaseUrl).origin);
  } catch {
    /* ignore invalid URL */
  }
  tracePropagationTargets.push(/^https:\/\/.*\.supabase\.co/);
  tracePropagationTargets.push(/^https:\/\/([^/]+\.)?oweable\.com/);
  tracePropagationTargets.push(/^https:\/\/.*\.vercel\.app/);

  Sentry.init({
    dsn,
    environment,
    release,
    /** Financial app: keep false; use `Sentry.setUser` for explicit id/email only. */
    sendDefaultPii: false,
    integrations: [
      // Supabase integration for error tracking, breadcrumbs, and tracing
      supabaseIntegration(supabase, Sentry, {
        tracing: true,
        breadcrumbs: true,
        errors: true,
      }),
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        // Performance optimization: reduce DOM serialization overhead
        mutationBreadcrumbLimit: 500, // Limit mutation breadcrumbs
        mutationLimit: 1000, // Limit mutations captured
        slowClickTimeout: 3000, // Only capture slow clicks (>3s)
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.15 : 1.0,
    tracePropagationTargets,
    // Session replay sampling - reduced to minimize DOM serialization overhead
    replaysSessionSampleRate: 0.05, // Reduced from 0.1 (5% of sessions)
    replaysOnErrorSampleRate: 1.0, // Keep 100% for error sessions
    enableLogs: true,
    beforeSend(event, hint) {
      if (isStaleDynamicImportError(hint.originalException)) return null;
      return event;
    },
  });
}
