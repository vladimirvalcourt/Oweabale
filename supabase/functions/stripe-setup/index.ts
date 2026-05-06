import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getStripeSecretKey } from '../_shared/stripeEnv.ts';

const WEBHOOK_URL = 'https://horlyscpspctvceddcup.supabase.co/functions/v1/stripe-webhook';
const PRICE_IDS = {
  monthly: 'price_1TMhs0ED22C2sALQbLVdl7Wf',
  yearly: 'price_1TOuyuED22C2sALQUFifKiSE',
};

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    // Admin check
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const stripeSecret = getStripeSecretKey();
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const report: Record<string, unknown> = {
      webhooks: [] as Record<string, unknown>[],
      prices: [] as Record<string, unknown>[],
      subscriptions: [] as Record<string, unknown>[],
      customers: [] as Record<string, unknown>[],
      errors: [] as Record<string, unknown>[],
    };

    // 1. Register/update webhook
    try {
      const existing = await stripe.webhookEndpoints.list({ limit: 100 });
      const already = existing.data.find((w) => w.url === WEBHOOK_URL);

      if (already) {
        const missing = REQUIRED_EVENTS.filter((e) => !already.enabled_events.includes(e));
        if (missing.length > 0) {
          const updated = await stripe.webhookEndpoints.update(already.id, {
            enabled_events: [...new Set([...already.enabled_events, ...REQUIRED_EVENTS])],
          });
          report.webhooks.push({ action: 'updated', id: updated.id, url: updated.url, addedEvents: missing });
        } else {
          report.webhooks.push({ action: 'exists', id: already.id, url: already.url });
        }
      } else {
        const created = await stripe.webhookEndpoints.create({
          url: WEBHOOK_URL,
          enabled_events: REQUIRED_EVENTS,
        });
        report.webhooks.push({ action: 'created', id: created.id, url: created.url, secret: created.secret });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Webhook error';
      report.errors.push({ step: 'webhook', message: msg });
    }

    // 2. Verify price IDs
    for (const [name, id] of Object.entries(PRICE_IDS)) {
      try {
        const price = await stripe.prices.retrieve(id);
        report.prices.push({
          name,
          id: price.id,
          product: price.product,
          active: price.active,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Price error';
        report.errors.push({ step: `price_${name}`, message: msg });
      }
    }

    // 3. List recent subscriptions
    try {
      const subs = await stripe.subscriptions.list({ limit: 10 });
      report.subscriptions = subs.data.map((s) => ({
        id: s.id,
        status: s.status,
        customer: s.customer,
        current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Subscription error';
      report.errors.push({ step: 'subscriptions', message: msg });
    }

    // 4. List recent customers
    try {
      const customers = await stripe.customers.list({ limit: 10 });
      report.customers = customers.data.map((c) => ({ id: c.id, email: c.email }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Customer error';
      report.errors.push({ step: 'customers', message: msg });
    }

    return new Response(JSON.stringify(report), {
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
