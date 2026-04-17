import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { isWebPushConfigured, sendPushToSubscription } from '../_shared/vapidWebPush.ts';

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
    if (!isWebPushConfigured()) {
      return new Response(JSON.stringify({ error: 'Web Push is not configured.' }), {
        status: 503,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Server misconfiguration');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization') ?? '';
    const cronSecret = Deno.env.get('WEB_PUSH_CRON_SECRET');
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ ok: true, message: 'Cron path reserved for future scheduled pushes.' }),
        { headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      body?: string;
    };
    const title = (body.title ?? 'Oweable').slice(0, 120);
    const text = (body.body ?? 'Test notification').slice(0, 500);

    const { data: rows, error: listErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user.id);
    if (listErr) throw listErr;

    const subs = (rows ?? []) as { endpoint: string; p256dh: string; auth: string }[];
    if (subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, error: 'No push subscriptions for this user' }), {
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const row of subs) {
      try {
        await sendPushToSubscription(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          { title, body: text },
        );
        sent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        if (/410|Gone|not found/i.test(msg)) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', row.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors: errors.length ? errors : undefined }), {
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
