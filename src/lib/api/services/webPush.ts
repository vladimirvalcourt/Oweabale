import { supabase } from '@/lib/api/supabase/client';

const SW_PATH = '/push-handler.js';

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getVapidPublicKey(): string | null {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return Boolean(sub);
}

/**
 * Returns the push-specific SW registration.
 * Uses the already-active SW if it controls this page (VitePWA's precache SW),
 * otherwise registers the dedicated push handler at /push-handler.js.
 * This avoids conflicting with VitePWA's generated sw.js at the same path.
 */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // Prefer the already-controlling SW; it will handle push events too
  // if they were merged. Otherwise register the dedicated push handler.
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: '/' });
}

export async function subscribeWebPush(): Promise<{ ok: true } | { error: string }> {
  if (!isWebPushSupported()) {
    return { error: 'Browser push is not supported in this browser.' };
  }
  const vapidKey = getVapidPublicKey();
  if (!vapidKey) {
    return { error: 'Push is not configured (missing VITE_VAPID_PUBLIC_KEY).' };
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    return { error: 'Notification permission was not granted.' };
  }

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const { data, error } = await supabase.functions.invoke('push-subscribe', {
    method: 'POST',
    body: { subscription: sub.toJSON() },
  });
  if (error) {
    return { error: error.message || 'Failed to save subscription' };
  }
  const payload = data as { error?: string } | null;
  if (payload?.error) return { error: payload.error };

  return { ok: true };
}

export async function unsubscribeWebPush(): Promise<{ ok: true } | { error: string }> {
  if (!isWebPushSupported()) return { error: 'Browser push is not supported.' };

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  const endpoint = sub?.endpoint;
  if (sub) await sub.unsubscribe();

  if (endpoint) {
    const { error } = await supabase.functions.invoke('push-subscribe', {
      method: 'POST',
      body: { unsubscribe: true, endpoint },
    });
    if (error) return { error: error.message };
  }

  return { ok: true };
}

export async function sendTestWebPush(): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('send-web-push', {
    method: 'POST',
    body: { title: 'Oweable', body: 'Web push is working.' },
  });
  if (error) return { error: error.message || 'Failed to send test' };
  const payload = data as { error?: string; sent?: number } | null;
  if (payload?.error) return { error: payload.error };
  if (payload && typeof payload.sent === 'number' && payload.sent === 0) {
    return { error: 'No active push subscription. Enable web push first.' };
  }
  return { ok: true };
}

export async function sendWebPushMessage(
  title: string,
  body: string,
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('send-web-push', {
    method: 'POST',
    body: { title, body },
  });
  if (error) return { error: error.message || 'Failed to send push notification' };
  const payload = data as { error?: string } | null;
  if (payload?.error) return { error: payload.error };
  return { ok: true };
}

/** Convert VAPID base64url key to a typed Uint8Array for PushManager.subscribe(). */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Allocate an ArrayBuffer directly (not SharedArrayBuffer) so TS's strict generic matches.
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
