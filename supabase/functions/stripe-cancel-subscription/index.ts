import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getStripeSecretKey } from '../_shared/stripeEnv.ts';
import { upsertSubscriptionAndEntitlement } from '../_shared/stripeBilling.ts';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing Authorization header');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const stripeSecret = getStripeSecretKey();
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    const customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) throw new Error('No Stripe customer on file.');

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    const active = subscriptions.data.find((s) => s.status === 'active' || s.status === 'trialing');
    if (!active) {
      return new Response(JSON.stringify({ ok: true, cancelled: false, message: 'No active subscription found.' }), {
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as { immediate?: boolean };
    const immediate = body.immediate === true;

    const updated = immediate
      ? await stripe.subscriptions.cancel(active.id, { prorate: true })
      : await stripe.subscriptions.update(active.id, { cancel_at_period_end: true });

    await upsertSubscriptionAndEntitlement(supabaseAdmin, updated);

    return new Response(
      JSON.stringify({
        ok: true,
        cancelled: true,
        immediate,
        status: updated.status,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        currentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : null,
      }),
      {
        headers: { ...ch, 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const safe = /unauthorized|missing authorization header|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
