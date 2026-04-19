/**
 * Modern OAuth (PKCE) requires Web Crypto — SubtleCrypto.digest / getRandomValues.
 * IE11 and some embedded WebViews lack this and trigger Google "legacy browser" warnings.
 */
export function browserSupportsModernWebCrypto(): boolean {
  if (typeof window === 'undefined') return true;
  return Boolean(window.crypto?.subtle && typeof TextEncoder !== 'undefined');
}
