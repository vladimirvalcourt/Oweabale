import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { safeRedirectUrl } from '../_shared/stripeRedirects.ts';
import { getStripeSecretKey } from '../_shared/stripeEnv.ts';

function isNoSuchCustomerError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('No such customer');
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const createAndPersistCustomer = async () => {
      const customer = await stripe.customers.create(
        {
          email: user.email ?? (profile?.email as string | undefined),
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `customer_${user.id}` },
      );
      const nextCustomerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: nextCustomerId }, { onConflict: 'id' });
      return nextCustomerId;
    };

    let customerId = profile?.stripe_customer_id as string | null;
    if (!customerId) {
      customerId = await createAndPersistCustomer();
    }

    const body = (await req.json().catch(() => ({}))) as { returnUrl?: string };
    const defaultOrigin =
      origin && /^https?:\/\//.test(origin) ? origin : 'https://oweable.com';
    const returnUrl = safeRedirectUrl(
      body.returnUrl,
      `${defaultOrigin}/settings`,
      defaultOrigin,
    );
    const portalIdempotencyKey = `portal_${user.id}_${Math.floor(Date.now() / 10_000)}`;

    let session: Stripe.BillingPortal.Session;
    try {
      session = await stripe.billingPortal.sessions.create(
        { customer: customerId, return_url: returnUrl },
        { idempotencyKey: portalIdempotencyKey },
      );
    } catch (error) {
      if (!isNoSuchCustomerError(error)) throw error;
      customerId = await createAndPersistCustomer();
      session = await stripe.billingPortal.sessions.create(
        { customer: customerId, return_url: returnUrl },
        { idempotencyKey: `${portalIdempotencyKey}_recustomer` },
      );
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
