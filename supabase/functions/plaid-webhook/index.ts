import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const rawBody = await req.text();
    const jwtHeader = req.headers.get('plaid-verification') ?? req.headers.get('Plaid-Verification');

    const signed = await verifyPlaidWebhook(rawBody, jwtHeader);
    if (!signed) return json({ error: 'Invalid webhook signature' }, 401);

    let body: PlaidWebhookBody;
    try {
      body = JSON.parse(rawBody) as PlaidWebhookBody;
    } catch {
      return json({ error: 'Invalid JSON payload' }, 400);
    }

    const wtype = typeof body.webhook_type === 'string' ? body.webhook_type : '';
    const code = typeof body.webhook_code === 'string' ? body.webhook_code : '';
    const itemId = typeof body.item_id === 'string' ? body.item_id : '';
    if (!wtype || !code) return json({ error: 'Missing webhook_type or webhook_code' }, 400);
    if (!itemId) return json({ error: 'Missing item_id' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfiguration' }, 500);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();
    const { error: touchErr } = await supabaseAdmin
      .from('plaid_items')
      .update({ last_webhook_at: now, updated_at: now })
      .eq('item_id', itemId);
    if (touchErr) {
      console.error('[plaid-webhook] failed to update webhook timestamp');
      return json({ error: 'Webhook processing failed' }, 500);
    }

    const routeKey = `${wtype}:${code}`;
    const syncRouteKeys = new Set([
      'TRANSACTIONS:SYNC_UPDATES_AVAILABLE',
      'TRANSACTIONS:DEFAULT_UPDATE',
      'TRANSACTIONS:INITIAL_UPDATE',
      'TRANSACTIONS:HISTORICAL_UPDATE',
      'TRANSACTIONS:TRANSACTIONS_REMOVED',
    ]);

    if (routeKey === 'ITEM:ITEM_LOGIN_REQUIRED') {
      const { data: row, error: rowErr } = await supabaseAdmin
        .from('plaid_items')
        .select('user_id')
        .eq('item_id', itemId)
        .maybeSingle();
      if (rowErr) {
        console.error('[plaid-webhook] failed to resolve plaid item owner');
        return json({ error: 'Webhook processing failed' }, 500);
      }
      const userId = row?.user_id;
      if (!userId) return json({ ok: true, ignored: 'unknown_item_id' }, 200);

      const { error: itemErr } = await supabaseAdmin
        .from('plaid_items')
        .update({ item_login_required: true, last_sync_error: 'ITEM_LOGIN_REQUIRED', updated_at: now })
        .eq('item_id', itemId);
      if (itemErr) {
        console.error('[plaid-webhook] failed to mark item_login_required');
        return json({ error: 'Webhook processing failed' }, 500);
      }

      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update({ plaid_needs_relink: true, updated_at: now })
        .eq('id', userId);
      if (profileErr) {
        console.error('[plaid-webhook] failed to update profile relink flag');
        return json({ error: 'Webhook processing failed' }, 500);
      }

      return json({ ok: true }, 200);
    }

    if (syncRouteKeys.has(routeKey)) {
      await runSyncForItemId(supabaseAdmin, itemId);
      return json({ ok: true }, 200);
    }

    return json({ ok: true, ignored: routeKey }, 200);
  } catch {
    console.error('[plaid-webhook] unhandled processing error');
    return json({ error: 'Webhook processing failed' }, 500);
  }
});
