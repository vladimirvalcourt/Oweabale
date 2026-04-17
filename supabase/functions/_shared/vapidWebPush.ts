/** VAPID Web Push — Edge Functions (Deno-compatible `web-push`). */
import webpush from 'npm:web-push@3.6.7';

const subject = Deno.env.get('WEB_PUSH_SUBJECT') ?? 'mailto:support@oweable.com';

function configured(): boolean {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY')?.trim();
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')?.trim();
  return Boolean(pub && priv);
}

export function initWebPush(): void {
  if (!configured()) return;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function isWebPushConfigured(): boolean {
  return configured();
}

export interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
}

export async function sendPushToSubscription(
  sub: SubscriptionInput,
  payload: PushPayload,
): Promise<void> {
  initWebPush();
  if (!configured()) throw new Error('Web Push is not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    },
    JSON.stringify(payload),
    { TTL: 86400 },
  );
}
