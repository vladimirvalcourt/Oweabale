/**
 * Restrict success/cancel/portal return URLs to same-origin paths or full URLs on the trusted origin.
 */
export function safeRedirectUrl(
  supplied: string | undefined,
  fallback: string,
  trustedOrigin: string,
): string {
  if (!supplied) return fallback;
  if (/^\/[^/]/.test(supplied) || supplied === '/') return `${trustedOrigin}${supplied}`;
  if (supplied.startsWith(`${trustedOrigin}/`)) return supplied;
  return fallback;
}
