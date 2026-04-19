/** CORS for browser-invoked Edge Functions (Plaid, `admin-actions`, etc.). */

const DEFAULT_ORIGINS = [
  'https://oweable.com',
  'https://www.oweable.com',
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
];

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('PLAID_ALLOWED_ORIGINS');
  if (!raw?.trim()) return DEFAULT_ORIGINS;
  return [...DEFAULT_ORIGINS, ...raw.split(',').map((s) => s.trim()).filter(Boolean)];
}

function parseVercelProjectAllowlist(): string[] {
  // Explicit project subdomains, e.g. "oweable-foo.vercel.app,oweable-bar.vercel.app".
  const raw = Deno.env.get('VERCEL_PREVIEW_ALLOWLIST');
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isLocalDevOrigin(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  if (url.protocol !== 'http:') return false;
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
  const list = parseAllowedOrigins()
  if (!origin?.trim()) return list[0] ?? 'https://www.oweable.com'

  const trimmed = origin.trim()
  if (list.includes(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    if (isLocalDevOrigin(url)) return trimmed
    if (url.protocol === 'https:' && isOweableHostedOrigin(url.hostname)) return trimmed
    if (url.protocol === 'https:' && isTrustedVercelPreview(url.hostname)) return trimmed
  } catch {
    /* ignore */
  }

  return list[0] ?? 'https://www.oweable.com'
}

export function corsHeaders(origin: string | null) {
  const allowedOrigin = resolveAllowedOrigin(origin)
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-region, prefer, accept-profile, content-profile',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
