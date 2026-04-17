import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { plaidPost } from '../_shared/plaid_client.ts';

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

    const { data: items, error: listErr } = await supabaseAdmin
      .from('plaid_items')
      .select('id, access_token')
      .eq('user_id', user.id);

    if (listErr) throw listErr;

    for (const row of items ?? []) {
      try {
        await plaidPost('/item/remove', { access_token: row.access_token });
      } catch {
        /* continue — still delete local row */
      }
    }

    const { error: delErr } = await supabaseAdmin.from('plaid_items').delete().eq('user_id', user.id);
    if (delErr) throw delErr;

    // Remove all bank-sourced transactions so disconnecting fully clears imported data.
    const { error: txDelErr } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'plaid');
    if (txDelErr) throw txDelErr;

    const now = new Date().toISOString();
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .update({
        plaid_institution_name: null,
        plaid_linked_at: null,
        plaid_last_sync_at: null,
        plaid_needs_relink: false,
        updated_at: now,
      })
      .eq('id', user.id);
    if (profErr) throw profErr;

    return new Response(JSON.stringify({ ok: true }), {
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
