import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AdminClient = ReturnType<typeof createClient>;

export async function upsertSubscriptionAndEntitlement(
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
  if (!userId) {
    console.error('[stripeBilling] No userId found for subscription', subscription.id, 'customer', customerId);
    return;
  }

  if (!profile?.id && metaUserId) {
    await supabaseAdmin
      .from('profiles')
      .upsert({ id: metaUserId, stripe_customer_id: customerId }, { onConflict: 'id' });
  }

  const firstItem = subscription.items.data[0];
  const rawPrice = firstItem?.price;
  const stripePriceId =
    typeof rawPrice === 'string' ? rawPrice : rawPrice?.id ?? null;
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

  const { error: subErr } = await supabaseAdmin.from('billing_subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
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
  if (subErr) {
    console.error('[stripeBilling] billing_subscriptions upsert', subErr);
    throw new Error(subErr.message);
  }

  // Atomic upsert: the unique constraint on (user_id, feature_key, source)
  // means this is a single idempotent write — no DELETE + INSERT race window.
  const { error: entErr } = await supabaseAdmin.from('entitlements').upsert(
    {
      user_id: userId,
      feature_key: featureKey,
      source: 'subscription',
      status: isActive ? 'active' : 'expired',
      starts_at: periodStart ?? new Date().toISOString(),
      ends_at: periodEnd,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,feature_key,source' }
  );
  if (entErr) {
    console.error('[stripeBilling] entitlements upsert', entErr);
    throw new Error(entErr.message);
  }
}

export async function upsertOneTimePaymentAndEntitlement(
  supabaseAdmin: AdminClient,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const featureKey = session.metadata?.feature_key || 'full_suite';
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null;

  const { error: payErr } = await supabaseAdmin.from('billing_payments').upsert(
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
  if (payErr) {
    console.error('[stripeBilling] billing_payments upsert', payErr);
    throw new Error(payErr.message);
  }

  // Atomic upsert: see subscription path above for rationale.
  const { error: entErr } = await supabaseAdmin.from('entitlements').upsert(
    {
      user_id: userId,
      feature_key: featureKey,
      source: 'one_time',
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: null,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,feature_key,source' }
  );
  if (entErr) {
    console.error('[stripeBilling] entitlements upsert (one_time)', entErr);
    throw new Error(entErr.message);
  }
}
