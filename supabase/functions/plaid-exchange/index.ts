import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { plaidPost } from '../_shared/plaid_client.ts';
import { hasPaidFullSuiteAccess } from '../_shared/plaidAccess.ts';

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
    const hasPaidAccess = await hasPaidFullSuiteAccess(supabaseAdmin, user.id);
    if (!hasPaidAccess) {
      return new Response(JSON.stringify({ error: 'Plaid is available on Full Suite only.' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

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

    const exchange = await plaidPost<{
      access_token?: string;
      item_id?: string;
    }>('/item/public_token/exchange', {
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
        item_login_required: false,
        last_sync_error: null,
      },
      { onConflict: 'item_id' },
    );

    if (upsertErr) throw upsertErr;

    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: user.id,
        plaid_institution_name: institutionName,
        plaid_linked_at: now,
        plaid_needs_relink: false,
        updated_at: now,
      },
      { onConflict: 'id' },
    );

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
