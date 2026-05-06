import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { plaidPost } from '../_shared/plaid_client.ts';
import { createPostHogClient } from '../_shared/posthog.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = corsHeaders(origin, req.headers);

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
    const body = (await req.json().catch(() => ({}))) as { plaid_item_id?: string };
    const plaidItemId = typeof body.plaid_item_id === 'string' ? body.plaid_item_id.trim() : '';

    const { data: platform } = await supabaseAdmin.from('platform_settings').select('plaid_enabled').maybeSingle();
    if (platform && platform.plaid_enabled === false) {
      return new Response(JSON.stringify({ error: 'Bank linking is temporarily disabled.' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    let itemQuery = supabaseAdmin
      .from('plaid_items')
      .select('id, access_token')
      .eq('user_id', user.id);
    if (plaidItemId) {
      itemQuery = itemQuery.eq('id', plaidItemId);
    }
    const { data: items, error: listErr } = await itemQuery;

    if (listErr) throw listErr;

    for (const row of items ?? []) {
      try {
        await plaidPost('/item/remove', { access_token: row.access_token });
      } catch {
        /* continue — still delete local row */
      }
    }

    let deleteQuery = supabaseAdmin.from('plaid_items').delete().eq('user_id', user.id);
    if (plaidItemId) {
      deleteQuery = deleteQuery.eq('id', plaidItemId);
    }
    const { error: delErr } = await deleteQuery;
    if (delErr) throw delErr;

    const now = new Date().toISOString();
    const { count: remainingItems, error: remainingErr } = await supabaseAdmin
      .from('plaid_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (remainingErr) throw remainingErr;

    const profilePatch: Record<string, string | boolean | null> = {
      plaid_needs_relink: false,
      updated_at: now,
    };
    if ((remainingItems ?? 0) === 0) {
      profilePatch.plaid_institution_name = null;
      profilePatch.plaid_linked_at = null;
      profilePatch.plaid_last_sync_at = null;
    }

    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .update(profilePatch)
      .eq('id', user.id);
    if (profErr) throw profErr;

    const posthog = createPostHogClient();
    if (posthog) {
      posthog.capture({ distinctId: user.id, event: 'bank account disconnected' });
      await posthog.shutdown();
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[plaid-disconnect] Error:', msg, e);
    const safe = /unauthorized|missing authorization header|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: { ...corsHeaders(req.headers.get('origin'), req.headers), 'Content-Type': 'application/json' },
    });
  }
});
