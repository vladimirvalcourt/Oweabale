/** CORS for browser-invoked Edge Functions (Plaid, `admin-actions`, etc.). */

const DEFAULT_ORIGINS = [
  'https://oweable.com',
  'https://www.oweable.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('PLAID_ALLOWED_ORIGINS');
  if (!raw?.trim()) return DEFAULT_ORIGINS;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseVercelProjectAllowlist(): string[] {
  // Explicit project subdomains, e.g. "oweable-foo.vercel.app,oweable-bar.vercel.app".
  const raw = Deno.env.get('VERCEL_PREVIEW_ALLOWLIST');
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function originAllowed(origin: string | null): string {
  if (!origin) return 'https://oweable.com';
  const list = parseAllowedOrigins();
  if (list.includes(origin)) return origin;
  // Whitelist specific preview domains only (no open-ended *.vercel.app).
  try {
    const u = new URL(origin);
    const vercelAllow = parseVercelProjectAllowlist();
    if (
      u.protocol === 'https:' &&
      vercelAllow.length > 0 &&
      vercelAllow.includes(u.hostname)
    ) {
      return origin;
    }
  } catch {
    /* ignore */
  }
  return 'https://oweable.com';
}

export function corsHeaders(origin: string | null) {
  const o = originAllowed(origin);
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
