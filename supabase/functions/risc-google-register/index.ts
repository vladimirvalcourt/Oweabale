import {
  mintRiscManagementBearerToken,
  RISC_EVENT_TYPES,
  type GoogleServiceAccountJson,
} from '../_shared/riscGoogleJwt.ts';
import { corsHeaders } from '../_shared/cors.ts';

function parseServiceAccount(raw: string | undefined): GoogleServiceAccountJson {
  const t = raw?.trim();
  if (!t) throw new Error('missing RISC_SERVICE_ACCOUNT_JSON');
  const sa = JSON.parse(t) as GoogleServiceAccountJson;
  if (!sa.private_key || !sa.client_email) throw new Error('invalid service account json');
  return sa;
}

Deno.serve(async (req: Request) => {
  const c = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: c });
  }

  const adminSecret = Deno.env.get('RISC_REGISTER_SECRET')?.trim();
  const provided = req.headers.get('x-risc-register-secret')?.trim();
  if (!adminSecret || provided !== adminSecret) {
    return new Response('Unauthorized', { status: 401, headers: c });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()?.replace(/\/$/, '');
  const receiverOverride = Deno.env.get('RISC_RECEIVER_URL')?.trim();
  const receiverUrl =
    receiverOverride ||
    (supabaseUrl ? `${supabaseUrl}/functions/v1/risc-google-receiver` : '');

  if (!receiverUrl) {
    return new Response(JSON.stringify({ error: 'Set RISC_RECEIVER_URL or SUPABASE_URL' }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  let sa: GoogleServiceAccountJson;
  try {
    sa = parseServiceAccount(Deno.env.get('RISC_SERVICE_ACCOUNT_JSON'));
  } catch (e) {
    console.error('[risc-google-register] service account parse failed');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  let bearer: string;
  try {
    bearer = await mintRiscManagementBearerToken(sa);
  } catch (e) {
    console.error('[risc-google-register] mint token', e);
    return new Response(JSON.stringify({ error: 'Failed to mint RISC bearer token' }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    events_requested?: string[];
    action?: string;
    state?: string;
  };

  if (body.action === 'verify') {
    const state =
      typeof body.state === 'string' && body.state.trim()
        ? body.state.trim()
        : `oweable-risc-verify-${Date.now()}`;
    const vres = await fetch('https://risc.googleapis.com/v1beta/stream:verify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state }),
    });
    const vtext = await vres.text();
    if (!vres.ok) {
      console.error('[risc-google-register] stream:verify', vres.status, vtext.slice(0, 800));
      return new Response(
        JSON.stringify({ error: 'RISC stream:verify failed', status: vres.status, body: vtext }),
        { status: 502, headers: { ...c, 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: true, action: 'verify', state, google_response: vtext || null }), {
      status: 200,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  const events = Array.isArray(body.events_requested) && body.events_requested.length
    ? body.events_requested
    : [...RISC_EVENT_TYPES];

  const streamCfg = {
    delivery: {
      delivery_method: 'https://schemas.openid.net/secevent/risc/delivery-method/push',
      url: receiverUrl,
    },
    events_requested: events,
  };

  const res = await fetch('https://risc.googleapis.com/v1beta/stream:update', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(streamCfg),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('[risc-google-register] stream:update', res.status, text.slice(0, 800));
    return new Response(JSON.stringify({ error: 'RISC stream:update failed', status: res.status, body: text }), {
      status: 502,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, receiver_url: receiverUrl, events_requested: events, google_response: text || null }),
    { status: 200, headers: { ...c, 'Content-Type': 'application/json' } },
  );
});
