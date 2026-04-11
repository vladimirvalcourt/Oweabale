/** CORS for browser-invoked Plaid Edge Functions. */

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

function originAllowed(origin: string | null): string {
  if (!origin) return 'https://oweable.com';
  const list = parseAllowedOrigins();
  if (list.includes(origin)) return origin;
  try {
    const u = new URL(origin);
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return origin;
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
