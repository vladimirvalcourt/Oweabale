import './instrument';
import { registerSW } from 'virtual:pwa-register';
import { initWebVitalsReporting } from './lib/utils/webVitalsReporting';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { reactErrorHandler } from '@sentry/react';
import App from './App.tsx';
import 'sonner/dist/styles.css';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import './index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Build DOM nodes manually — no innerHTML so no risk of template-string injection.
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--color-surface-base);font-family:system-ui,sans-serif;color:var(--color-content-primary);text-align:center;padding:2rem;';
  const inner = document.createElement('div');
  inner.style.cssText = 'max-width:24rem;';
  const title = document.createElement('p');
  title.style.cssText = 'font-size:1rem;font-weight:600;';
  title.textContent = "This app can't load right now";
  const body = document.createElement('p');
  body.style.cssText = 'font-size:0.875rem;color:var(--color-content-secondary);margin-top:0.5rem;line-height:1.5;';
  body.textContent = 'Please try again in a moment. If it keeps happening, contact support.';
  inner.appendChild(title);
  inner.appendChild(body);
  if (import.meta.env.DEV) {
    const hint = document.createElement('p');
    hint.style.cssText =
      'font-size:0.75rem;color:var(--color-content-muted);margin-top:0.75rem;max-width:28rem;';
    hint.textContent =
      'Developer: add your Supabase project URL and anon key to the environment used by Vite.';
    inner.appendChild(hint);
  }
  wrap.appendChild(inner);
  document.body.replaceChildren(wrap);
  throw new Error(
    import.meta.env.DEV
      ? 'Missing Supabase credentials. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for local dev.'
      : 'Application configuration error.',
  );
}

initWebVitalsReporting();

// Register the Service Worker for PWA (with immediate update check)
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep responses immediately stale so post-mutation refetches actually run.
      // Cache is preserved (gcTime default 5min) so repeat views avoid round-trips.
      staleTime: 0,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

createRoot(rootEl, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <App />
        <Analytics />
      </QueryClientProvider>
    </MotionConfig>
  </StrictMode>,
);
