import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeProtectedHeader, importJWK, jwtVerify } from 'https://esm.sh/jose@5.9.6';
import { plaidPost } from '../_shared/plaid_client.ts';
import { runSyncForItemId } from '../_shared/plaid_sync_runner.ts';

const jwkCache = new Map<string, Record<string, unknown>>();

async function sha256Hex(body: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifyPlaidWebhook(rawBody: string, jwtStr: string | null): Promise<boolean> {
  if (!jwtStr) return false;

  let header: { alg?: string; kid?: string };
  try {
    header = decodeProtectedHeader(jwtStr) as { alg?: string; kid?: string };
  } catch {
    return false;
  }
  if (header.alg !== 'ES256' || !header.kid) return false;

  let jwk = jwkCache.get(header.kid);
  if (!jwk) {
    const res = await plaidPost<{ key: Record<string, unknown> }>('/webhook_verification_key/get', {
      key_id: header.kid,
    });
    jwk = res.key;
    jwkCache.set(header.kid, jwk);
  }

  const key = await importJWK(jwk);
  let payload: { request_body_sha256?: string };
  try {
    const verified = await jwtVerify(jwtStr, key, { maxTokenAge: '5m' });
    payload = verified.payload as { request_body_sha256?: string };
  } catch {
    return false;
  }

  const claimed = payload.request_body_sha256;
  if (!claimed || typeof claimed !== 'string') return false;
  const actual = await sha256Hex(rawBody);
  return constantTimeEq(actual.toLowerCase(), claimed.toLowerCase());
}

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const rawBody = await req.text();
  const jwtHeader = req.headers.get('plaid-verification') ?? req.headers.get('Plaid-Verification');

  const skipVerify = Deno.env.get('PLAID_SKIP_WEBHOOK_VERIFY') === 'true';
  if (!skipVerify) {
    const ok = await verifyPlaidWebhook(rawBody, jwtHeader);
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody) as PlaidWebhookBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const itemId = body.item_id;
  if (!itemId) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date().toISOString();
  await supabaseAdmin
    .from('plaid_items')
    .update({ last_webhook_at: now, updated_at: now })
    .eq('item_id', itemId);

  const code = body.webhook_code ?? '';
  const wtype = body.webhook_type ?? '';

  if (wtype === 'ITEM' && code === 'ITEM_LOGIN_REQUIRED') {
    const { data: row } = await supabaseAdmin
      .from('plaid_items')
      .select('user_id')
      .eq('item_id', itemId)
      .maybeSingle();
    if (row?.user_id) {
      await supabaseAdmin
        .from('plaid_items')
        .update({
          item_login_required: true,
          last_sync_error: 'ITEM_LOGIN_REQUIRED',
          updated_at: now,
        })
        .eq('item_id', itemId);
      await supabaseAdmin
        .from('profiles')
        .update({ plaid_needs_relink: true, updated_at: now })
        .eq('id', row.user_id);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const syncCodes = new Set([
    'SYNC_UPDATES_AVAILABLE',
    'DEFAULT_UPDATE',
    'INITIAL_UPDATE',
    'HISTORICAL_UPDATE',
    'TRANSACTIONS_REMOVED',
  ]);

  if (syncCodes.has(code)) {
    await runSyncForItemId(supabaseAdmin, itemId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, ignored: code || wtype }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
