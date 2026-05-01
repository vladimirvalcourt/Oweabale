import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import { VitePWA } from 'vite-plugin-pwa';

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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind injects styles at runtime + Google Fonts
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
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
            sourcemaps: {
              // Only upload Vite application bundles. The root PWA/workbox files are generated
              // service-worker artifacts and can trigger noisy source-map-reference warnings.
              assets: ['./dist/assets/**/*.{js,map}'],
              ignore: ['./dist/sw.js', './dist/sw.js.map', './dist/workbox-*.js', './dist/workbox-*.js.map'],
              filesToDeleteAfterUpload: ['./dist/assets/**/*.map'],
            },
          }),
        ]
        : []),
      // awesome-vite: vite-plugin-checker — TS + ESLint overlay in dev; DISABLED on production build for speed
      // TypeScript type-checking is handled by CI/CD pipeline separately
      ...(isProd
        ? []
        : [
          checker({
            typescript: true,
            eslint: {
              lintCommand: 'eslint "src/**/*.{ts,tsx}"',
              useFlatConfig: true,
            },
            overlay: { initialIsOpen: false, badgeStyle: 'display: none;' },
            enableBuild: false, // Disable during build for faster dev HMR
          }),
        ]),
      // PWA — service worker + manifest plumbing
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        // We ship our own /public/manifest.json
        manifest: false,
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'apple-touch-icon-pwa.png',
          'icons/*.png',
          // push-handler.js handles Web Push events separately from VitePWA's generated sw.js
          // This eliminates the dual SW registration conflict.
          'push-handler.js',
        ],
        workbox: {
          // Optimize precache: only cache critical app shell assets
          // Large chunks (charts, pdfjs, motion) loaded on-demand via runtime caching
          globPatterns: ['index.html', 'manifest.json', 'favicon*.png', 'apple-touch-icon*.png', 'icons/*.png'],
          globIgnores: ['**/node_modules/**', '**/stats.html'],
          // React SPA routing: ALWAYS fallback to index.html for navigation.
          navigateFallback: '/index.html',
          // Don't use offline fallback for admin routes — they have no offline value
          navigateFallbackDenylist: [/^\/admin/],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
          runtimeCaching: [
            {
              // App bundles (JS/CSS) — StaleWhileRevalidate for fast updates
              urlPattern: /\.(?:js|css)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-bundles',
                expiration: { maxEntries: 60, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
              },
            },
            {
              // Supabase REST API — NetworkFirst so UI always tries live data
              urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth|storage)\//i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              // Static images — CacheFirst for 30 days
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-images',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Google Fonts — StaleWhileRevalidate
              urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              // Video assets — CacheFirst with large TTL
              urlPattern: /\.(?:mp4|webm)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'video-assets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        devOptions: {
          // Enable SW in dev so we can test the install prompt during development
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      // We intentionally split PDF/chart/runtime vendors into lazy chunks; the PDF worker alone
      // is >1 MB uncompressed, so the default budget creates Vercel noise without indicating a regression.
      chunkSizeWarningLimit: 1400,
      minify: 'esbuild',
      sourcemap: isProd ? 'hidden' : false,
      // Target modern browsers only — no unnecessary polyfills
      target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
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
            // Route/navigation dependencies
            if (id.includes('react-router') || id.includes('@remix-run/router') || id.includes('history')) return 'router';
            // Observability and errors
            if (id.includes('@sentry')) return 'sentry';
            // PDF stack
            if (id.includes('pdfjs-dist')) return 'pdfjs';
            // Data/query layer
            if (id.includes('@tanstack')) return 'query';
            // Editor/markdown sanitization
            if (id.includes('react-markdown') || id.includes('rehype-sanitize')) return 'markdown';
            // Notifications and utility UI libs
            if (id.includes('sonner') || id.includes('lucide-react') || id.includes('@geist-ui/icons')) return 'ui-kit';
            // OCR / scanning helpers
            if (id.includes('tesseract.js') || id.includes('qrcode') || id.includes('react-easy-crop')) return 'capture';
            // Finance integrations
            if (id.includes('react-plaid-link') || id.includes('@stripe')) return 'payments';
            // Split large vendor libraries into separate chunks
            if (id.includes('date-fns') || id.includes('dayjs')) return 'vendor-date';
            if (id.includes('lodash') || id.includes('ramda')) return 'vendor-utils';
            if (id.includes('zod') || id.includes('yup')) return 'vendor-validation';
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
