import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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
    if (!supabaseUrl || !serviceKey) throw new Error('Server misconfiguration');

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

    const body = (await req.json()) as {
      subscription?: {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      unsubscribe?: boolean;
      endpoint?: string;
    };

    if (body.unsubscribe && body.endpoint) {
      const { error: delErr } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', body.endpoint);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const sub = body.subscription;
    const endpoint = sub?.endpoint?.trim();
    const p256dh = sub?.keys?.p256dh?.trim();
    const auth = sub?.keys?.auth?.trim();
    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: 'Invalid subscription payload' }), {
        status: 400,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        updated_at: now,
      },
      { onConflict: 'user_id,endpoint' },
    );
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const safe = /unauthorized|missing authorization header|method not allowed|invalid subscription payload/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: { ...corsHeaders(req.headers.get('origin'), req.headers), 'Content-Type': 'application/json' },
    });
  }
});
