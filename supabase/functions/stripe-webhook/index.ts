import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  upsertOneTimePaymentAndEntitlement,
  upsertSubscriptionAndEntitlement,
} from '../_shared/stripeBilling.ts';
import { getStripeSecretKey, getStripeWebhookSecret } from '../_shared/stripeEnv.ts';

type AdminClient = ReturnType<typeof createClient>;

/**
 * Inserts the event into stripe_events BEFORE any business logic is executed.
 * Returns 'inserted' for a new event, 'duplicate' if already processed, or 'failed'.
 *
 * Idempotency design: the unique constraint on stripe_event_id is the source of
 * truth. Inserting first means a duplicate Stripe delivery is detected before any
 * DB mutations occur, preventing double-processing.
 */
async function recordStripeEventOrDuplicate(
  supabaseAdmin: AdminClient,
  event: Stripe.Event,
  payload: unknown
): Promise<'inserted' | 'duplicate' | 'failed'> {
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: payload as Record<string, unknown>,
  });

  if (!error) return 'inserted';
  if (error.code === '23505' || error.message?.includes('duplicate key')) return 'duplicate';
  console.error('[stripe-webhook] stripe_events insert failed', error);
  return 'failed';
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

    // ── Idempotency gate ────────────────────────────────────────────────────
    // Record the event BEFORE any business logic. The unique constraint on
    // stripe_event_id ensures that a duplicate delivery is short-circuited
    // here, not after state-mutating operations have already run.
    const rec = await recordStripeEventOrDuplicate(supabaseAdmin, event, event.data.object);
    if (rec === 'duplicate') {
      console.log('[stripe-webhook] duplicate event id — skipping processing', event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (rec === 'failed') {
      return new Response(JSON.stringify({ error: 'Could not record event' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // ── End idempotency gate ────────────────────────────────────────────────

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
    // Return a generic error to avoid leaking internal details to callers.
    const clientMessage =
      hint === 'stripe_webhook_signature_mismatch'
        ? 'Webhook signature verification failed'
        : 'Webhook processing error';
    return new Response(JSON.stringify({ error: clientMessage }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
