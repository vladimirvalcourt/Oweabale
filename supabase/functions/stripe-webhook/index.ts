import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

async function markStripeEventProcessed(
  supabaseAdmin: AdminClient,
  event: Stripe.Event,
  payload: unknown
): Promise<boolean> {
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: payload as Record<string, unknown>,
  });

  return !error;
}

async function upsertSubscriptionAndEntitlement(
  supabaseAdmin: AdminClient,
  subscription: Stripe.Subscription
) {
  const customerId = String(subscription.customer);
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  const metaUserId =
    typeof subscription.metadata?.user_id === 'string'
      ? subscription.metadata.user_id
      : undefined;
  const userId = (profile?.id as string | undefined) ?? metaUserId;
  if (!userId) return;

  if (!profile?.id && metaUserId) {
    await supabaseAdmin
      .from('profiles')
      .upsert({ id: metaUserId, stripe_customer_id: customerId }, { onConflict: 'id' });
  }

  const firstItem = subscription.items.data[0];
  const status = subscription.status;
  const isActive = status === 'active' || status === 'trialing';
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const periodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000).toISOString()
    : null;
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null;
  const featureKey = subscription.metadata.feature_key || 'full_suite';

  await supabaseAdmin.from('billing_subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstItem?.price?.id ?? null,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: canceledAt,
      metadata: subscription.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' }
  );

  await supabaseAdmin
    .from('entitlements')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'subscription')
    .eq('feature_key', featureKey);

  await supabaseAdmin.from('entitlements').insert({
    user_id: userId,
    feature_key: featureKey,
    source: 'subscription',
    status: isActive ? 'active' : 'expired',
    starts_at: periodStart ?? new Date().toISOString(),
    ends_at: periodEnd,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  });
}

async function upsertOneTimePaymentAndEntitlement(
  supabaseAdmin: AdminClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const featureKey = session.metadata?.feature_key || 'full_suite';
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  await supabaseAdmin.from('billing_payments').upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof session.customer === 'string' ? session.customer : null,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      status: session.payment_status || 'paid',
      product_key: session.metadata?.plan_key ?? null,
      metadata: session.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_checkout_session_id' }
  );

  await supabaseAdmin
    .from('entitlements')
    .delete()
    .eq('user_id', userId)
    .eq('source', 'one_time')
    .eq('feature_key', featureKey);

  await supabaseAdmin.from('entitlements').insert({
    user_id: userId,
    feature_key: featureKey,
    source: 'one_time',
    status: 'active',
    starts_at: new Date().toISOString(),
    ends_at: null,
    stripe_payment_intent_id: paymentIntentId,
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const inserted = await markStripeEventProcessed(supabaseAdmin, event, event.data.object);
    if (!inserted) {
      return new Response(JSON.stringify({ received: true, deduplicated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === 'string' ? session.customer : null;
        const userId = session.metadata?.user_id;
        if (customerId && userId) {
          await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: 'id' });
        }

        if (session.mode === 'payment' && session.payment_status === 'paid') {
          await upsertOneTimePaymentAndEntitlement(supabaseAdmin, session);
        }

        if (
          session.mode === 'subscription' &&
          (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
        ) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as { id?: string } | null)?.id;
          if (subId) {
            const sub = await stripe.subscriptions.retrieve(subId);
            await upsertSubscriptionAndEntitlement(supabaseAdmin, sub);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionAndEntitlement(supabaseAdmin, subscription);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.subscription;
        const subId = typeof subRef === 'string' ? subRef : subRef?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscriptionAndEntitlement(supabaseAdmin, sub);
        }
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    const hint =
      /signature|No signatures found|timestamp/i.test(message)
        ? 'stripe_webhook_signature_mismatch'
        : 'stripe_webhook_handler_error';
    console.error(`[stripe-webhook] ${hint}:`, message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
