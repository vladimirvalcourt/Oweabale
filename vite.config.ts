import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const analyze = process.env.ANALYZE === 'true';

  // Production CSP is strict — no unsafe-inline for scripts
  // Dev CSP is permissive to allow Vite HMR and inline style injection
  const cspDirectives = isProd
    ? [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'", // Tailwind injects styles at runtime
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://huggingface.co https://*.huggingface.co",
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
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* https://huggingface.co https://*.huggingface.co",
        "worker-src 'self' blob:",
        "frame-src https://*.supabase.co",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ];

  return {
    plugins: [
      react(),
      tailwindcss(),
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
      rollupOptions: {
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
