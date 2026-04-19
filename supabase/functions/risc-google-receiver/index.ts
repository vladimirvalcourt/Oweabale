import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyGoogleRiscSecurityEventJwt } from '../_shared/riscGoogleJwt.ts';
import { corsHeaders } from '../_shared/cors.ts';

const EVENT_SESSIONS_REVOKED = 'https://schemas.openid.net/secevent/risc/event-type/sessions-revoked';
const EVENT_TOKENS_REVOKED = 'https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked';
const EVENT_TOKEN_REVOKED = 'https://schemas.openid.net/secevent/oauth/event-type/token-revoked';
const EVENT_ACCOUNT_DISABLED = 'https://schemas.openid.net/secevent/risc/event-type/account-disabled';
const EVENT_ACCOUNT_ENABLED = 'https://schemas.openid.net/secevent/risc/event-type/account-enabled';
const EVENT_ACCOUNT_PURGED = 'https://schemas.openid.net/secevent/risc/event-type/account-purged';
const EVENT_CRED_CHANGE = 'https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required';
const EVENT_VERIFICATION = 'https://schemas.openid.net/secevent/risc/event-type/verification';

function parseClientIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractIssSub(eventPayload: Record<string, unknown>): string | null {
  const subj = eventPayload.subject as Record<string, unknown> | undefined;
  if (!subj) return null;
  const st = subj.subject_type;
  if (st === 'iss-sub' || st === 'id_token_claims') {
    const s = subj.sub;
    return typeof s === 'string' && s.trim() ? s.trim() : null;
  }
  return null;
}

function extractTokenRef(
  eventPayload: Record<string, unknown>,
): { alg: string; token: string } | null {
  const subj = eventPayload.subject as Record<string, unknown> | undefined;
  if (!subj) return null;
  if (subj.subject_type !== 'oauth-token') return null;
  if (subj.token_type !== 'refresh_token') return null;
  const alg = subj.token_identifier_alg;
  const token = subj.token;
  if (typeof alg !== 'string' || typeof token !== 'string') return null;
  return { alg, token };
}

async function resolveUserId(
  admin: ReturnType<typeof createClient>,
  googleSub: string,
): Promise<string | null> {
  const { data, error } = await admin.rpc('find_user_id_by_google_sub', { lookup_sub: googleSub });
  if (error) {
    console.warn('[risc-google-receiver] find_user_id_by_google_sub', error.message);
    return null;
  }
  if (typeof data === 'string' && data) return data;
  return null;
}

async function revokeSessionsAndGmail(
  admin: ReturnType<typeof createClient>,
  userId: string,
  reason: string,
): Promise<void> {
  const { error: signOutErr } = await admin.auth.admin.signOut(userId, 'global');
  if (signOutErr) {
    console.warn('[risc-google-receiver] auth.admin.signOut', signOutErr.message, reason);
    const { error: rpcErr } = await admin.rpc('risc_revoke_user_sessions', { target_user: userId });
    if (rpcErr) console.warn('[risc-google-receiver] risc_revoke_user_sessions fallback', rpcErr.message);
  } else {
    console.log('[risc-google-receiver] sessions revoked (global)', userId.slice(0, 8), reason);
  }

  const { error: delErr } = await admin.from('email_connections').delete().eq('user_id', userId);
  if (delErr) console.warn('[risc-google-receiver] email_connections delete', delErr.message);
}

async function handleTokenRevoked(
  admin: ReturnType<typeof createClient>,
  eventPayload: Record<string, unknown>,
): Promise<void> {
  const ref = extractTokenRef(eventPayload);
  if (!ref) return;
  if (ref.alg === 'hash_base64_sha512_sha512') {
    const { error } = await admin.from('email_connections').delete().eq('google_refresh_token_fp_hash', ref.token);
    if (error) console.warn('[risc-google-receiver] delete by hash', error.message);
    return;
  }
  if (ref.alg === 'prefix' && ref.token.length >= 8) {
    const { error } = await admin
      .from('email_connections')
      .delete()
      .eq('google_refresh_token_fp_prefix', ref.token.slice(0, 16));
    if (error) console.warn('[risc-google-receiver] delete by prefix', error.message);
  }
}

Deno.serve(async (req: Request) => {
  const c = corsHeaders(req.headers.get('origin'), req.headers);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: c });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const clientIdsRaw = Deno.env.get('RISC_GOOGLE_OAUTH_CLIENT_IDS')?.trim();

  if (!supabaseUrl || !serviceKey || !clientIdsRaw) {
    console.error('[risc-google-receiver] missing SUPABASE_URL, SERVICE_ROLE, or RISC_GOOGLE_OAUTH_CLIENT_IDS');
    return new Response('Server misconfiguration', { status: 500, headers: c });
  }

  const allowedClientIds = parseClientIds(clientIdsRaw);
  if (!allowedClientIds.length) {
    return new Response('Server misconfiguration', { status: 500, headers: c });
  }

  const bodyText = (await req.text()).trim();
  if (!bodyText.startsWith('ey')) {
    return new Response('Bad Request', { status: 400, headers: c });
  }

  let verified: Awaited<ReturnType<typeof verifyGoogleRiscSecurityEventJwt>>;
  try {
    verified = await verifyGoogleRiscSecurityEventJwt(bodyText, allowedClientIds);
  } catch (e) {
    console.warn('[risc-google-receiver] jwt verify failed', e instanceof Error ? e.message : e);
    return new Response('Bad Request', { status: 400, headers: c });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: dedupErr } = await admin.from('risc_google_events').insert({ jti: verified.jti });
  if (dedupErr) {
    const dup = dedupErr.code === '23505' || dedupErr.message?.includes('duplicate');
    if (dup) return new Response(null, { status: 202, headers: c });
    console.error('[risc-google-receiver] dedup insert', dedupErr.message);
    return new Response('Failed', { status: 500, headers: c });
  }

  for (const [eventUri, rawPayload] of Object.entries(verified.events)) {
    const eventPayload = rawPayload as Record<string, unknown>;

    if (eventUri === EVENT_VERIFICATION) {
      console.log('[risc-google-receiver] verification event', eventPayload.state ?? '');
      continue;
    }

    if (eventUri === EVENT_ACCOUNT_ENABLED) {
      console.log('[risc-google-receiver] account-enabled (no automatic action)');
      continue;
    }

    if (eventUri === EVENT_TOKEN_REVOKED) {
      await handleTokenRevoked(admin, eventPayload);
      continue;
    }

    const googleSub = extractIssSub(eventPayload);
    if (!googleSub) {
      console.warn('[risc-google-receiver] event without iss-sub subject', eventUri);
      continue;
    }

    const userId = await resolveUserId(admin, googleSub);
    if (!userId) {
      console.warn('[risc-google-receiver] no Oweable user for google sub');
      continue;
    }

    if (eventUri === EVENT_SESSIONS_REVOKED || eventUri === EVENT_TOKENS_REVOKED) {
      await revokeSessionsAndGmail(admin, userId, eventUri);
      continue;
    }

    if (eventUri === EVENT_ACCOUNT_PURGED) {
      await revokeSessionsAndGmail(admin, userId, EVENT_ACCOUNT_PURGED);
      continue;
    }

    if (eventUri === EVENT_CRED_CHANGE) {
      await revokeSessionsAndGmail(admin, userId, EVENT_CRED_CHANGE);
      continue;
    }

    if (eventUri === EVENT_ACCOUNT_DISABLED) {
      const reason = eventPayload.reason;
      if (reason === 'bulk-account') {
        console.log('[risc-google-receiver] account-disabled bulk-account — logging only');
        continue;
      }
      await revokeSessionsAndGmail(admin, userId, `${EVENT_ACCOUNT_DISABLED}:${String(reason ?? 'unknown')}`);
      continue;
    }

    console.warn('[risc-google-receiver] unhandled event type', eventUri);
  }

  return new Response(null, { status: 202, headers: c });
});
