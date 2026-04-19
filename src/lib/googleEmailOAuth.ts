import { browserSupportsModernWebCrypto } from './browserSupport';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_OAUTH_STATE_KEY = 'gmail_oauth_state';
const GMAIL_PKCE_VERIFIER_KEY = 'gmail_oauth_code_verifier';

/** RFC 7636: 43–128 chars from unreserved characters. */
const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

function generateCodeVerifier(length = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += PKCE_CHARSET[bytes[i]! % PKCE_CHARSET.length];
  }
  return out;
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256Base64Url(ascii: string): Promise<string> {
  const data = new TextEncoder().encode(ascii);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

/** True when the Vite bundle has a Google OAuth Web client ID (required for Connect Gmail). */
export function isGmailOAuthConfigured(): boolean {
  const id = import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID as string | undefined;
  return Boolean(id?.trim());
}

export function getGoogleEmailOAuthRedirectUri(): string {
  return `${window.location.origin}/auth/google-email/callback`;
}

/**
 * Build Google OAuth 2.0 authorization URL with PKCE (S256).
 * Stores CSRF `state` and `code_verifier` in sessionStorage for the callback exchange.
 */
export async function buildGmailConnectUrl(): Promise<string> {
  if (!browserSupportsModernWebCrypto()) {
    throw new Error(
      'This browser cannot use secure Google sign-in. Use a current Chrome, Safari, Firefox, or Edge.',
    );
  }
  const clientId = import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) {
    throw new Error('VITE_GOOGLE_GMAIL_CLIENT_ID is not set');
  }
  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await sha256Base64Url(codeVerifier);

  sessionStorage.setItem(GMAIL_OAUTH_STATE_KEY, state);
  sessionStorage.setItem(GMAIL_PKCE_VERIFIER_KEY, codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: getGoogleEmailOAuthRedirectUri(),
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function consumeGmailOAuthState(expected: string): boolean {
  const saved = sessionStorage.getItem(GMAIL_OAUTH_STATE_KEY);
  sessionStorage.removeItem(GMAIL_OAUTH_STATE_KEY);
  return Boolean(saved && expected && saved === expected);
}

/** Returns PKCE verifier once; must be sent to the token endpoint with the authorization code. */
export function consumeGmailOAuthCodeVerifier(): string | null {
  const v = sessionStorage.getItem(GMAIL_PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(GMAIL_PKCE_VERIFIER_KEY);
  return v?.trim() ? v : null;
}

/** Clear PKCE material if the OAuth round-trip aborts before token exchange (e.g. invalid state). */
export function clearGmailOAuthPkceMaterial(): void {
  sessionStorage.removeItem(GMAIL_PKCE_VERIFIER_KEY);
}

/** Remove Gmail OAuth session keys (state + PKCE) on cancel/error before callback completes. */
export function clearGmailOAuthSessionStorage(): void {
  sessionStorage.removeItem(GMAIL_OAUTH_STATE_KEY);
  sessionStorage.removeItem(GMAIL_PKCE_VERIFIER_KEY);
}
