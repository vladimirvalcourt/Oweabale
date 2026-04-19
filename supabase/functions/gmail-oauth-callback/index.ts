import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { googleRefreshTokenFpHash, googleRefreshTokenFpPrefix } from '../_shared/riscGoogleFingerprint.ts';
import { encryptSecret } from '../_shared/tokenCrypto.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = { ...corsHeaders(origin, req.headers), 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin, req.headers) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: ch });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const clientId = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID')?.trim();
    const clientSecret = Deno.env.get('GOOGLE_GMAIL_CLIENT_SECRET')?.trim();
    const encKey = Deno.env.get('EMAIL_TOKEN_ENCRYPTION_KEY')?.trim();

    if (!supabaseUrl || !serviceKey || !clientId || !clientSecret || !encKey) {
      console.error('[gmail-oauth-callback] missing env');
      return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500, headers: ch });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: ch });
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: ch });
    }

    const body = (await req.json()) as { code?: string; redirect_uri?: string; code_verifier?: string };
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri.trim() : '';
    const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier.trim() : '';
    if (!code || !redirectUri || !codeVerifier) {
      return new Response(
        JSON.stringify({ error: 'code, redirect_uri, and code_verifier (PKCE) required' }),
        { status: 400, headers: ch },
      );
    }

    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.warn('[gmail-oauth-callback] token exchange failed', tokenRes.status, t.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Google token exchange failed' }), { status: 400, headers: ch });
    }
    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const refresh = tokens.refresh_token;
    if (!refresh) {
      return new Response(
        JSON.stringify({
          error:
            'No refresh token from Google. Revoke Oweable in Google Account permissions and connect again with consent.',
        }),
        { status: 400, headers: ch },
      );
    }

    const access = tokens.access_token;
    if (!access) {
      return new Response(JSON.stringify({ error: 'No access token from Google' }), { status: 400, headers: ch });
    }

    const profRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!profRes.ok) {
      const t = await profRes.text();
      console.warn('[gmail-oauth-callback] profile failed', profRes.status, t.slice(0, 200));
      return new Response(JSON.stringify({ error: 'Could not read Gmail profile' }), { status: 400, headers: ch });
    }
    const profile = (await profRes.json()) as { emailAddress?: string };
    const emailAddr = profile.emailAddress?.trim();
    if (!emailAddr) {
      return new Response(JSON.stringify({ error: 'No email on Gmail profile' }), { status: 400, headers: ch });
    }

    const ciphertext = await encryptSecret(refresh, encKey);
    const fpHash = await googleRefreshTokenFpHash(refresh);
    const fpPrefix = googleRefreshTokenFpPrefix(refresh);
    const now = new Date().toISOString();

    const { error: upsertErr } = await supabaseAdmin.from('email_connections').upsert(
      {
        user_id: user.id,
        provider: 'gmail',
        email_address: emailAddr,
        encrypted_refresh_token: ciphertext,
        google_refresh_token_fp_hash: fpHash,
        google_refresh_token_fp_prefix: fpPrefix,
        updated_at: now,
      },
      { onConflict: 'user_id,provider,email_address' },
    );
    if (upsertErr) {
      console.error('[gmail-oauth-callback] upsert', upsertErr.message);
      return new Response(JSON.stringify({ error: 'Failed to save connection' }), { status: 500, headers: ch });
    }

    return new Response(JSON.stringify({ ok: true, email: emailAddr }), { status: 200, headers: ch });
  } catch (e) {
    console.error('[gmail-oauth-callback]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'error' }), {
      status: 500,
      headers: ch,
    });
  }
});
