import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req) => {
  // This function is cron-only — no CORS headers needed; block all non-cron callers.
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('REENGAGEMENT_CRON_SECRET');

  if (!cronSecret) {
    // Fail closed: if the secret is not configured, refuse all requests.
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: tokens, error } = await supabaseClient
      .from('device_tokens')
      .select('id, token, user_id')
      .lt('last_active_at', threeDaysAgo.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const notificationsSent = (tokens ?? []).map((tokenRow: { id: string; token: string; user_id: string }) => {
      // Logic for APNs / Firebase Cloud Messaging would go here.
      console.log(`[SIMULATED PUSH] Sending re-engagement push to device id: ${tokenRow.id}`);
      return tokenRow.id;
    });

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent_count: notificationsSent.length,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
