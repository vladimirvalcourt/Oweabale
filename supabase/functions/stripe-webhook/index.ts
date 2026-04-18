import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  upsertOneTimePaymentAndEntitlement,
  upsertSubscriptionAndEntitlement,
} from '../_shared/stripeBilling.ts';
import { getStripeSecretKey, getStripeWebhookSecret } from '../_shared/stripeEnv.ts';

type AdminClient = ReturnType<typeof createClient>;

type ClaimResult = 'inserted' | 'duplicate_completed' | 'duplicate_pending';

function payloadJson(event: Stripe.Event): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event.data.object)) as Record<string, unknown>;
}

/**
 * Claim this event id before running handlers so Stripe retries do not double-apply.
 * Returns duplicate_completed when a prior delivery finished; duplicate_pending when
 * a prior attempt failed mid-flight and should be retried.
 */
async function claimStripeWebhookEvent(
  supabaseAdmin: AdminClient,
  event: Stripe.Event,
): Promise<ClaimResult> {
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: payloadJson(event),
    processing_completed: false,
  });

  if (!error) return 'inserted';
  if (error.code === '23505' || error.message?.includes('duplicate key')) {
    const { data, error: selErr } = await supabaseAdmin
      .from('stripe_events')
      .select('processing_completed')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
    if (selErr) {
      console.error('[stripe-webhook] duplicate claim select failed', selErr);
      throw new Error(selErr.message);
    }
    if (data?.processing_completed === true) return 'duplicate_completed';
    return 'duplicate_pending';
  }
  console.error('[stripe-webhook] stripe_events claim insert failed', error);
  throw new Error(error.message);
}

async function markStripeWebhookEventComplete(
  supabaseAdmin: AdminClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stripe_events')
    .update({
      processing_completed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', eventId);
  if (error) {
    console.error('[stripe-webhook] mark processing_completed failed', error);
    throw new Error(error.message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }
    const stripeSecret = getStripeSecretKey();
    const webhookSecret = getStripeWebhookSecret();

    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const claim = await claimStripeWebhookEvent(supabaseAdmin, event);
    if (claim === 'duplicate_completed') {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
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

    await markStripeWebhookEventComplete(supabaseAdmin, event.id);

    if (claim === 'duplicate_pending') {
      console.log('[stripe-webhook] completed retry for event', event.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    const isSignature =
      /signature|No signatures found|timestamp/i.test(message) ||
      message.includes('Missing stripe-signature');
    const hint = isSignature ? 'stripe_webhook_signature_mismatch' : 'stripe_webhook_handler_error';
    console.error(`[stripe-webhook] ${hint}:`, message);
    // 400: malformed / bad signature (Stripe should not retry the same body blindly).
    // 500: handler / DB errors so Stripe retries; claim row stays processing_completed=false.
    const status = isSignature ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
