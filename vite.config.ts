import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import removeConsole from 'vite-plugin-remove-console';

/** Same resolution as Sentry bundler `release.name` — keep browser SDK + uploaded artifacts aligned. */
function resolveSentryReleaseName(): string | undefined {
  const explicit =
    process.env.VITE_SENTRY_RELEASE?.trim() || process.env.SENTRY_RELEASE?.trim();
  if (explicit) return explicit;
  const version = process.env.VITE_APP_VERSION?.trim();
  if (version) return version;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (sha) return `oweable@${sha}`;
  return undefined;
}

function resolveSentryEnvironment(mode: string): string {
  const override = process.env.VITE_SENTRY_ENVIRONMENT?.trim();
  if (override) return override;
  const vercel = process.env.VERCEL_ENV?.trim();
  if (vercel) return vercel;
  return mode;
}

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const analyze = process.env.ANALYZE === 'true';
  const sentryUpload =
    isProd &&
    Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
    Boolean(process.env.SENTRY_ORG?.trim()) &&
    Boolean(process.env.SENTRY_PROJECT?.trim());
  const sentryReleaseName = resolveSentryReleaseName();
  const sentryEnvironment = resolveSentryEnvironment(mode);

  // Production CSP is strict — no unsafe-inline for scripts
  // Dev CSP is permissive to allow Vite HMR and inline style injection
  const cspDirectives = isProd
    ? [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'", // Tailwind injects styles at runtime
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://fcm.googleapis.com https://fcmregistrations.googleapis.com https://updates.push.services.mozilla.com https://android.googleapis.com wss://push.services.mozilla.com",
        "worker-src 'self' blob:",
        "frame-src https://*.supabase.co",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ]
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'", // HMR requires unsafe-inline
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://fcm.googleapis.com https://fcmregistrations.googleapis.com https://updates.push.services.mozilla.com https://android.googleapis.com wss://push.services.mozilla.com",
        "worker-src 'self' blob:",
        "frame-src https://*.supabase.co",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ];

  return {
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE_RESOLVED': JSON.stringify(sentryReleaseName ?? ''),
      'import.meta.env.VITE_SENTRY_ENVIRONMENT_RESOLVED': JSON.stringify(sentryEnvironment),
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(sentryUpload
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG ?? '',
              project: process.env.SENTRY_PROJECT ?? '',
              authToken: process.env.SENTRY_AUTH_TOKEN ?? '',
              telemetry: false,
              release: {
                name: sentryReleaseName,
                ...(process.env.VERCEL_ENV?.trim()
                  ? { deploy: { env: process.env.VERCEL_ENV.trim() } }
                  : {}),
              },
            }),
          ]
        : []),
      // awesome-vite: vite-plugin-checker — TS + ESLint overlay in dev; TS-only on production build (faster CI)
      checker({
        typescript: true,
        ...(isProd
          ? {}
          : {
              eslint: {
                lintCommand: 'eslint "src/**/*.{ts,tsx}"',
                useFlatConfig: true,
              },
            }),
        overlay: { initialIsOpen: false },
        enableBuild: true,
      }),
      // awesome-vite: vite-plugin-remove-console — quieter production bundles (keep warn/error)
      ...(isProd ? [removeConsole({ includes: ['log', 'info', 'debug'] })] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      sourcemap: isProd ? 'hidden' : false,
      rollupOptions: {
        output: {
          /**
           * Manual chunk strategy — keeps heavy libs in ONE stable, long-cached chunk
           * instead of Rollup duplicating them across every lazy page that imports them.
           *
           * Chunk budget targets (gzip):
           *   charts  — recharts + d3 deps         ≈ 60 KB  (loaded only on chart pages)
           *   motion  — motion/react (Framer)       ≈ 30 KB  (Dashboard only)
           *   ui      — headlessui                  ≈  8 KB  (Settings, Billing dialogs)
           *   react   — react + react-dom           ≈ 45 KB  (always needed, cache-busts rarely)
           *   vendor  — everything else              varies
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // Charts — recharts ships its own d3 subset; keep all in one chunk
            if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts';
            // Motion — motion/react is large and only needed by Dashboard
            if (id.includes('motion/react') || id.includes('motion/dist') || id.includes('framer-motion')) return 'motion';
            // Headless UI — dialogs, menus, used across settings/billing pages
            if (id.includes('@headlessui')) return 'ui';
            // React core — stable, cache-busts only on React version bumps
            if (id.includes('react-dom') || id.includes('/react/') || id.match(/node_modules\/react$/)) return 'react';
            // Supabase JS client — large auth+realtime bundle
            if (id.includes('@supabase')) return 'supabase';
            // Everything else
            return 'vendor';
          },
        },
        plugins: analyze
          ? [
              visualizer({
                filename: 'stats.html',
                gzipSize: true,
                brotliSize: true,
                open: process.env.CI !== 'true',
              }),
            ]
          : [],
      },
    },

    server: {
      historyApiFallback: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '0',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Content-Security-Policy': cspDirectives.join('; '),
      },
    },
  };
});
