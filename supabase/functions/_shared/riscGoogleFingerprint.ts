/** Fingerprints for Google RISC `token-revoked` (refresh_token) matching. */

export async function googleRefreshTokenFpHash(refreshToken: string): Promise<string> {
  const enc = new TextEncoder().encode(refreshToken);
  const h1 = new Uint8Array(await crypto.subtle.digest('SHA-512', enc));
  const h2 = new Uint8Array(await crypto.subtle.digest('SHA-512', h1));
  let bin = '';
  for (let i = 0; i < h2.length; i++) bin += String.fromCharCode(h2[i]!);
  return btoa(bin);
}

export function googleRefreshTokenFpPrefix(refreshToken: string): string {
  return refreshToken.slice(0, 16);
}
