import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getStripeSecretKey } from '../_shared/stripeEnv.ts';

type PlanKey = 'pro_monthly';

type PlanConfig = {
  planKey: PlanKey;
  mode: 'subscription';
  priceId: string;
  featureKey: string;
};

function getPlanConfig(planKey: string): PlanConfig | null {
  const monthly = Deno.env.get('STRIPE_PRICE_PRO_MONTHLY');

  const plans: Record<PlanKey, PlanConfig | null> = {
    pro_monthly: monthly
      ? { planKey: 'pro_monthly', mode: 'subscription', priceId: monthly, featureKey: 'full_suite' }
      : null,
  };

  return plans[planKey as PlanKey] ?? null;
}

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

    const body = (await req.json().catch(() => ({}))) as {
      planKey?: string;
      successUrl?: string;
      cancelUrl?: string;
    };
    if (!body.planKey) throw new Error('planKey is required');

    const plan = getPlanConfig(body.planKey);
    if (!plan) throw new Error('Unknown plan or missing Stripe price env configuration');

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? (profile?.email as string | undefined),
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: 'id' });
    }

    const defaultOrigin =
      origin && /^https?:\/\//.test(origin) ? origin : 'https://oweable.com';
    const successUrl =
      body.successUrl ??
      `${defaultOrigin}/settings?tab=billing&billing=success`;
    const cancelUrl = body.cancelUrl ?? `${defaultOrigin}/pricing?billing=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: plan.mode,
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        plan_key: plan.planKey,
        feature_key: plan.featureKey,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_key: plan.planKey,
          feature_key: plan.featureKey,
        },
      },
    });

    return new Response(
      JSON.stringify({
        checkoutUrl: session.url,
        sessionId: session.id,
      }),
      { headers: { ...ch, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }
});
