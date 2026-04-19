import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const c = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const cronSecret = Deno.env.get('REENGAGEMENT_CRON_SECRET');
    if (!cronSecret) {
      return new Response(JSON.stringify({ error: 'Missing REENGAGEMENT_CRON_SECRET' }), {
        status: 500,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const bearer = authHeader?.replace('Bearer ', '') ?? '';
    if (bearer !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: tokens, error } = await supabaseClient
      .from('device_tokens')
      .select('*')
      .lt('last_active_at', threeDaysAgo.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to process push notifications' }), {
        status: 500,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const notificationsSent = tokens?.map((_tokenRow: unknown) => {
      // Logic for APNs / Firebase Cloud Messaging would go here.
      return true;
    });

    return new Response(
      JSON.stringify({
        message: 'Push notifications processed',
        sent_count: notificationsSent?.length || 0,
      }),
      { headers: { ...c, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    const safe = /unauthorized|method not allowed/i.test(msg) ? msg : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }
});
