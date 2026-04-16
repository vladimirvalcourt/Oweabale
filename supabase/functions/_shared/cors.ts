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

/**
 * Matches Vercel preview URLs scoped to the oweable project.
 *
 * Vercel generates hostnames in two shapes for preview deployments:
 *   - <project>-<hash>-<team>.vercel.app   (team scope)
 *   - <project>-<hash>.vercel.app          (personal scope)
 *
 * We only allow hostnames that start with "oweable" to prevent
 * any other Vercel project (including attacker-controlled ones)
 * from making credentialed CORS requests to our Edge Functions.
 */
const OWEABLE_VERCEL_RE = /^oweable[a-z0-9-]*\.vercel\.app$/i;

function originAllowed(origin: string | null): string {
  if (!origin) return 'https://oweable.com';
  const list = parseAllowedOrigins();
  if (list.includes(origin)) return origin;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && OWEABLE_VERCEL_RE.test(u.hostname)) return origin;
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
