const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/** True when the Vite bundle has a Google OAuth Web client ID (required for Connect Gmail). */
export function isGmailOAuthConfigured(): boolean {
  const id = import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID as string | undefined;
  return Boolean(id?.trim());
}

export function getGoogleEmailOAuthRedirectUri(): string {
  return `${window.location.origin}/auth/google-email/callback`;
}

/** Build Google OAuth URL; stores CSRF state in sessionStorage. */
export function buildGmailConnectUrl(): string {
  const clientId = import.meta.env.VITE_GOOGLE_GMAIL_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) {
    throw new Error('VITE_GOOGLE_GMAIL_CLIENT_ID is not set');
  }
  const state = crypto.randomUUID();
  sessionStorage.setItem('gmail_oauth_state', state);
  const params = new URLSearchParams({
    client_id: clientId.trim(),
    redirect_uri: getGoogleEmailOAuthRedirectUri(),
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function consumeGmailOAuthState(expected: string): boolean {
  const saved = sessionStorage.getItem('gmail_oauth_state');
  sessionStorage.removeItem('gmail_oauth_state');
  return Boolean(saved && expected && saved === expected);
}
