import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  upsertOneTimePaymentAndEntitlement,
  upsertSubscriptionAndEntitlement,
} from '../_shared/stripeBilling.ts';
import {
  getStripeSecretKey,
  getStripeWebhookSecret,
  STRIPE_API_VERSION,
} from '../_shared/stripeEnv.ts';
import { createPostHogClient } from '../_shared/posthog.ts';

type AdminClient = ReturnType<typeof createClient>;

type ClaimResult = 'inserted' | 'duplicate_completed' | 'duplicate_pending';

function payloadJson(event: Stripe.Event): Record<string, unknown> {
  return JSON.parse(JSON.stringify(event.data.object)) as Record<string, unknown>;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
  const { data, error } = await supabaseAdmin.rpc('claim_stripe_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_payload: payloadJson(event),
  });
  if (error) {
    console.error('[stripe-webhook] claim_stripe_event rpc failed', error);
    throw new Error(error.message);
  }
  const result = typeof data === 'string' ? data : String(data);
  if (result === 'inserted' || result === 'duplicate_completed' || result === 'duplicate_pending') {
    return result as ClaimResult;
  }
  throw new Error(`Unexpected claim_stripe_event result: ${result}`);
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
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const startedAt = Date.now();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }
    const stripeSecret = getStripeSecretKey();
    const webhookSecret = getStripeWebhookSecret();

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[stripe-webhook] missing stripe-signature header');
      return json({ error: 'Invalid webhook signature' }, 400);
    }

    const rawBody = await req.text();
    const stripe = new Stripe(stripeSecret, { apiVersion: STRIPE_API_VERSION });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    if (!event?.id || !event?.type) {
      console.error('[stripe-webhook] invalid event envelope');
      return json({ error: 'Invalid webhook payload' }, 400);
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const claim = await claimStripeWebhookEvent(supabaseAdmin, event);
    if (claim === 'duplicate_completed') {
      return json({ received: true, duplicate: true }, 200);
    }

    const posthog = createPostHogClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId =
          typeof session.customer === 'string' ? session.customer : null;
        const userId = session.metadata?.user_id;
        if (customerId && userId) {
          const { error: profileErr } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: 'id' });
          if (profileErr) throw new Error('Failed to upsert stripe customer profile');
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
          if (posthog && userId) {
            posthog.capture({
              distinctId: userId,
              event: 'subscription activated',
              properties: {
                plan_key: session.metadata?.plan_key,
                mode: session.mode,
                payment_status: session.payment_status,
              },
            });
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionAndEntitlement(supabaseAdmin, subscription);
        const subUserId = subscription.metadata?.user_id;
        if (posthog && subUserId) {
          const phEvent =
            event.type === 'customer.subscription.deleted'
              ? 'subscription cancelled'
              : 'subscription updated';
          posthog.capture({
            distinctId: subUserId,
            event: phEvent,
            properties: {
              status: subscription.status,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
          });
        }
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
          const invoiceUserId = sub.metadata?.user_id;
          if (posthog && invoiceUserId && event.type === 'invoice.payment_failed') {
            posthog.capture({
              distinctId: invoiceUserId,
              event: 'invoice payment failed',
              properties: { subscription_id: subId },
            });
          }
        }
        break;
      }
      default:
        console.log('[stripe-webhook] ignored event type', event.type);
        break;
    }

    if (posthog) await posthog.shutdown();

    await markStripeWebhookEventComplete(supabaseAdmin, event.id);

    if (claim === 'duplicate_pending') {
      console.log('[stripe-webhook] completed retry for event', event.id);
    }
    console.log('[stripe-webhook] processed event', event.id, event.type, 'in_ms', Date.now() - startedAt);

    return json({ received: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    const isSignature =
      /signature|No signatures found|timestamp/i.test(message) ||
      message.includes('Missing stripe-signature');
    const hint = isSignature
      ? 'stripe_webhook_signature_mismatch'
      : 'stripe_webhook_handler_error';
    console.error(`[stripe-webhook] ${hint}`);
    // 400: malformed / bad signature (Stripe should not retry the same body blindly).
    // 500: handler / DB errors so Stripe retries; claim row stays processing_completed=false.
    const status = isSignature ? 400 : 500;
    return json({ error: isSignature ? 'Invalid webhook signature' : 'Webhook processing failed' }, status);
  }
});
