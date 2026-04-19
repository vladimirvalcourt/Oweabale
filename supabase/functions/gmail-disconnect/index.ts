import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: ch });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
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

    const body = (await req.json().catch(() => ({}))) as { connection_id?: string };
    const connectionId = typeof body.connection_id === 'string' ? body.connection_id.trim() : '';

    if (connectionId) {
      const { error } = await supabaseAdmin
        .from('email_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', user.id);
      if (error) {
        console.error('[gmail-disconnect]', error.message);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), { status: 500, headers: ch });
      }
    } else {
      const { error } = await supabaseAdmin.from('email_connections').delete().eq('user_id', user.id);
      if (error) {
        console.error('[gmail-disconnect] all', error.message);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), { status: 500, headers: ch });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: ch });
  } catch (e) {
    console.error('[gmail-disconnect]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'error' }), {
      status: 500,
      headers: ch,
    });
  }
});
