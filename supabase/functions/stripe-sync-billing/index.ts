import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { upsertSubscriptionAndEntitlement } from '../_shared/stripeBilling.ts';
import { getStripeSecretKey } from '../_shared/stripeEnv.ts';

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
    const stripeSecret = getStripeSecretKey();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing Authorization header');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      return new Response(
        JSON.stringify({
          error: 'No Stripe customer on file yet. Try again after starting checkout once.',
        }),
        { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    const preferred =
      list.data.find((s) => s.status === 'active' || s.status === 'trialing') ??
      list.data[0];

    if (!preferred) {
      return new Response(JSON.stringify({ ok: true, synced: false }), {
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const sub = await stripe.subscriptions.retrieve(preferred.id);
    await upsertSubscriptionAndEntitlement(supabaseAdmin, sub);

    return new Response(JSON.stringify({ ok: true, synced: true }), {
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
