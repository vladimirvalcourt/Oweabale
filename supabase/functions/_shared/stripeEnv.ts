const LIVE_SECRET_PREFIX = 'sk_live_';
const TEST_SECRET_PREFIX = 'sk_test_';
const LIVE_WEBHOOK_PREFIX = 'whsec_';
const TEST_WEBHOOK_PREFIX = 'whsec_test_';

export function getStripeSecretKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  if (!key.startsWith(LIVE_SECRET_PREFIX) && !key.startsWith(TEST_SECRET_PREFIX)) {
    throw new Error('Invalid STRIPE_SECRET_KEY format');
  }
  return key;
}

export function getStripeWebhookSecret(): string {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  if (!secret.startsWith(LIVE_WEBHOOK_PREFIX) && !secret.startsWith(TEST_WEBHOOK_PREFIX)) {
    throw new Error('Invalid STRIPE_WEBHOOK_SECRET format');
  }
  return secret;
}

