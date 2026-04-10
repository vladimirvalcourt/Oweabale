import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: tokens, error } = await supabaseClient
      .from('device_tokens')
      .select('*')
      .lt('last_active_at', threeDaysAgo.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const notificationsSent = tokens?.map((tokenRow: any) => {
      // Logic for APNs / Firebase Cloud Messaging would go here.
      console.log(`[SIMULATED PUSH] Sending re-engagement push to token: ${tokenRow.token}`);
      return tokenRow.token;
    });

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent_count: notificationsSent?.length || 0
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
