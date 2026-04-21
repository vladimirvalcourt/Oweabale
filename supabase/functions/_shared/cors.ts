/** CORS for browser-invoked Edge Functions (Plaid, `admin-actions`, etc.). */

// Production origins only - development origins added dynamically based on environment
const PRODUCTION_ORIGINS = [
  'https://oweable.com',
  'https://www.oweable.com',
];

// Development origins - only included in non-production environments
const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4174',
  'http://127.0.0.1:4174',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:8888',
  'http://127.0.0.1:8888',
  // mkcert / dev HTTPS
  'https://localhost:3000',
  'https://127.0.0.1:3000',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
  'https://localhost:5174',
  'https://127.0.0.1:5174',
  'https://localhost:4173',
  'https://127.0.0.1:4173',
  'https://localhost:4174',
  'https://127.0.0.1:4174',
];

function isProductionEnvironment(): boolean {
  const env = Deno.env.get('DENO_ENV')?.toLowerCase();
  const supabaseEnv = Deno.env.get('SUPABASE_ENV')?.toLowerCase();
  return env === 'production' || supabaseEnv === 'production';
}

function getDefaultOrigins(): string[] {
  if (isProductionEnvironment()) {
    return PRODUCTION_ORIGINS;
  }
  return [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];
}

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('PLAID_ALLOWED_ORIGINS');
  const baseOrigins = getDefaultOrigins();
  if (!raw?.trim()) return baseOrigins;
  return [...baseOrigins, ...raw.split(',').map((s: string) => s.trim()).filter(Boolean)];
}

/** Extra exact origins (e.g. preview URLs) — comma-separated, merged with PLAID_ALLOWED_ORIGINS. */
function parseEdgeCorsExtraOrigins(): string[] {
  const raw = Deno.env.get('EDGE_CORS_EXTRA_ORIGINS')?.trim();
  if (!raw) return [];
  return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
}

function parseVercelProjectAllowlist(): string[] {
  const raw = Deno.env.get('VERCEL_PREVIEW_ALLOWLIST');
  if (!raw?.trim()) return [];
  return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
}

function isLocalDevOrigin(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const port = url.port;
  const allowedPorts = new Set([
    '',
    '3000',
    '5173',
    '5174',
    '4173',
    '4174',
    '8080',
    '8888',
  ]);
  return allowedPorts.has(port);
}

function isOweableHostedOrigin(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'oweable.com' || h.endsWith('.oweable.com');
}

function isTrustedVercelPreview(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (!h.endsWith('.vercel.app')) return false;
  if (/oweable|owebale/i.test(h)) return true;
  const allow = parseVercelProjectAllowlist();
  return allow.includes(h);
}

/**
 * Returns the exact `Access-Control-Allow-Origin` value to send (must match the request
 * Origin when credentials-like headers are used, or the browser will reject the fetch).
 */
function resolveAllowedOrigin(origin: string | null): string {
  const list = parseAllowedOrigins();
  const extras = parseEdgeCorsExtraOrigins();
  if (!origin?.trim()) return list[0] ?? 'https://www.oweable.com';

  const trimmed = origin.trim();
  if (trimmed === 'null') return 'null';
  if (list.includes(trimmed) || extras.includes(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    // Only allow localhost in non-production environments
    if (!isProductionEnvironment() && isLocalDevOrigin(url)) return trimmed;
    if (url.protocol === 'https:' && isOweableHostedOrigin(url.hostname)) return trimmed;
    if (url.protocol === 'https:' && isTrustedVercelPreview(url.hostname)) return trimmed;
  } catch {
    /* ignore */
  }

  // In production, reject any origin not explicitly allowed
  return list[0] ?? 'https://www.oweable.com';
}

/** Base allow-list; preflight may request more — merged below. */
const STATIC_ALLOW_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-region',
  'prefer',
  'accept-profile',
  'content-profile',
  'sentry-trace',
  'baggage',
  'traceparent',
  'tracestate',
  'b3',
  'priority',
  'x-datadog-origin',
  'x-datadog-parent-id',
  'x-datadog-trace-id',
  'x-datadog-sampling-priority',
  'x-vercel-id',
  'x-vercel-ip-country',
];

function buildAllowHeaders(requestHeaders: Headers | null | undefined): string {
  const set = new Set(STATIC_ALLOW_HEADERS.map((h) => h.toLowerCase()));
  const requested = requestHeaders?.get('access-control-request-headers');
  if (requested?.trim()) {
    for (const part of requested.split(',')) {
      const h = part.trim().toLowerCase();
      if (!h || h.length > 64) continue;
      if (!/^[a-z0-9_-]+$/.test(h)) continue;
      set.add(h);
      if (set.size >= 56) break;
    }
  }
  return [...set].join(', ');
}

/**
 * @param requestHeaders Pass `req.headers` so OPTIONS preflight can merge `Access-Control-Request-Headers`
 *        (APM / future SDK headers) without editing this file for every new header name.
 */
export function corsHeaders(origin: string | null, requestHeaders?: Headers | null) {
  const allowedOrigin = resolveAllowedOrigin(origin);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': buildAllowHeaders(requestHeaders ?? null),
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
