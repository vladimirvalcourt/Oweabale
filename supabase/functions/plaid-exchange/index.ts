import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://oweable.com',
  'https://www.oweable.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function corsHeaders(origin: string | null) {
  const o = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://oweable.com';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function plaidBaseUrl(): string {
  const env = (Deno.env.get('PLAID_ENV') ?? 'sandbox').toLowerCase();
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

async function plaidPost(path: string, body: Record<string, unknown>) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  if (!clientId || !secret) {
    throw new Error('Plaid is not configured (PLAID_CLIENT_ID / PLAID_SECRET)');
  }
  const res = await fetch(`${plaidBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  });
  const json = (await res.json()) as {
    error_message?: string;
    access_token?: string;
    item_id?: string;
  };
  if (!res.ok) {
    throw new Error(json.error_message ?? `Plaid HTTP ${res.status}`);
  }
  return json;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: platform } = await supabaseAdmin.from('platform_settings').select('plaid_enabled').maybeSingle();
    if (platform && platform.plaid_enabled === false) {
      return new Response(JSON.stringify({ error: 'Bank linking is temporarily disabled.' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as {
      public_token?: string;
      metadata?: { institution?: { name?: string; institution_id?: string } };
    };
    const public_token = body.public_token;
    if (!public_token) throw new Error('Missing public_token');

    const exchange = await plaidPost('/item/public_token/exchange', {
      public_token,
    });

    if (!exchange.access_token || !exchange.item_id) {
      throw new Error('Invalid Plaid exchange response');
    }

    const institutionName =
      body.metadata?.institution?.name ?? 'Linked bank';
    const institutionId = body.metadata?.institution?.institution_id ?? null;

    const now = new Date().toISOString();

    const { error: upsertErr } = await supabaseAdmin.from('plaid_items').upsert(
      {
        user_id: user.id,
        item_id: exchange.item_id,
        access_token: exchange.access_token,
        institution_id: institutionId,
        institution_name: institutionName,
        updated_at: now,
      },
      { onConflict: 'item_id' },
    );

    if (upsertErr) throw upsertErr;

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        plaid_institution_name: institutionName,
        plaid_linked_at: now,
      })
      .eq('id', user.id);

    if (profileErr) throw profileErr;

    return new Response(JSON.stringify({ ok: true, item_id: exchange.item_id }), {
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
