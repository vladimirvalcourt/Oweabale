/**
 * Restrict success/cancel/portal return URLs to same-origin paths on a hardcoded HTTPS allowlist.
 *
 * Caller-supplied `trustedOrigin` is validated against ALLOWED_ORIGINS; anything else falls back.
 * This prevents attacker-controlled `Origin` / `Referer` headers from redirecting to phishing sites.
 */
const ALLOWED_ORIGINS: readonly string[] = [
  'https://oweable.com',
  'https://www.oweable.com',
] as const;

// Localhost allowed only when explicitly opted in (local dev / preview).
function resolveTrustedOrigin(supplied: string): string {
  const trimmed = supplied.trim();
  if (ALLOWED_ORIGINS.includes(trimmed)) return trimmed;
  const allowLocal = Deno.env.get('STRIPE_ALLOW_LOCAL_REDIRECT') === 'true';
  if (allowLocal) {
    try {
      const u = new URL(trimmed);
      if (
        (u.protocol === 'http:' || u.protocol === 'https:') &&
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
      ) {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* fall through */
    }
  }
  return ALLOWED_ORIGINS[0];
}

export function safeRedirectUrl(
  supplied: string | undefined,
  fallback: string,
  trustedOriginRaw: string,
): string {
  const trustedOrigin = resolveTrustedOrigin(trustedOriginRaw);
  if (!supplied) return fallback.startsWith('http') ? fallback : `${trustedOrigin}${fallback}`;

  // Relative same-origin path.
  if (/^\/[^/]/.test(supplied) || supplied === '/') return `${trustedOrigin}${supplied}`;

  // Absolute URL — must exactly match the trusted origin (no subdomain/scheme tricks).
  try {
    const u = new URL(supplied);
    if (`${u.protocol}//${u.host}` === trustedOrigin) return supplied;
  } catch {
    /* fall through to fallback */
  }
  return fallback.startsWith('http') ? fallback : `${trustedOrigin}${fallback}`;
}
