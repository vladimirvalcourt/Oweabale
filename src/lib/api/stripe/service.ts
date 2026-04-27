import { supabase } from '../supabase/client';

/** Never show raw Edge Function / network errors in billing UI — log for support. */
export const BILLING_USER_SAFE_MESSAGE =
  'Unable to load billing status. Please refresh or try again shortly.';

async function parseFunctionError(error: unknown): Promise<string> {
  const anyErr = error as { context?: { json?: () => Promise<{ error?: string }> } };

  try {
    const payload = await anyErr?.context?.json?.();
    if (payload?.error) {
      console.warn('[stripe] function error body:', payload.error);
    }
  } catch {
    // noop
  }
  if (error instanceof Error) {
    console.warn('[stripe] function invoke:', error.message);
  }

  return BILLING_USER_SAFE_MESSAGE;
}

export type StripeCheckoutPlanKey = 'pro_monthly' | 'pro_yearly';

export async function createStripeCheckoutSession(
  planKey: StripeCheckoutPlanKey
): Promise<{ checkoutUrl: string } | { error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Please sign in to start checkout.' };
  }

  let data: unknown;
  let error: unknown;
  try {
    const res = await supabase.functions.invoke('stripe-checkout-session', {
      method: 'POST',
      body: { planKey },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    data = res.data;
    error = res.error;
  } catch (e) {
    console.error('[stripe] stripe-checkout-session', e);
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { checkoutUrl?: string; error?: string };
  if (d?.error) return { error: BILLING_USER_SAFE_MESSAGE };
  if (!d?.checkoutUrl) return { error: BILLING_USER_SAFE_MESSAGE };
  return { checkoutUrl: d.checkoutUrl };
}

async function rawInvokeErrorMessage(error: unknown): Promise<string | null> {
  const anyErr = error as { message?: string; context?: Response };
  if (anyErr.context && typeof anyErr.context.json === 'function') {
    try {
      const j = (await anyErr.context.json()) as { error?: string; message?: string };
      return typeof j?.error === 'string' ? j.error : typeof j?.message === 'string' ? j.message : null;
    } catch {
      return null;
    }
  }
  return typeof anyErr.message === 'string' ? anyErr.message : null;
}

export async function syncStripeBilling(): Promise<
  { ok: true; synced?: boolean } | { error: string }
> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Please sign in to refresh billing.' };
  }

  let data: unknown;
  let error: unknown;
  try {
    const res = await supabase.functions.invoke('stripe-sync-billing', {
      method: 'POST',
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    data = res.data;
    error = res.error;
  } catch (e) {
    console.error('[stripe] stripe-sync-billing', e);
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  if (error) {
    const raw = (await rawInvokeErrorMessage(error)) ?? '';
    console.warn('[stripe] stripe-sync-billing invoke error (logged only):', raw);
    if (/no stripe customer/i.test(raw)) {
      return { ok: true as const, synced: false };
    }
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  const d = data as { ok?: boolean; synced?: boolean; error?: string };
  if (d?.error) {
    console.warn('[stripe] sync response error field:', d.error);
    if (/no stripe customer/i.test(d.error)) {
      return { ok: true as const, synced: false };
    }
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  if (d?.ok) return { ok: true as const, synced: d.synced };
  return { error: BILLING_USER_SAFE_MESSAGE };
}

export async function createStripePortalSession(
  returnUrl?: string
): Promise<{ url: string } | { error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Please sign in to manage billing.' };
  }

  let data: unknown;
  let error: unknown;
  try {
    const res = await supabase.functions.invoke('stripe-customer-portal', {
      method: 'POST',
      body: returnUrl ? { returnUrl } : {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    data = res.data;
    error = res.error;
  } catch (e) {
    console.error('[stripe] stripe-customer-portal', e);
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { url?: string; error?: string };
  if (d?.error) return { error: BILLING_USER_SAFE_MESSAGE };
  if (!d?.url) return { error: BILLING_USER_SAFE_MESSAGE };
  return { url: d.url };
}

export async function cancelStripeSubscription(opts?: {
  immediate?: boolean;
}): Promise<{ ok: true; cancelled: boolean; message?: string } | { error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Please sign in to manage your subscription.' };
  }

  let data: unknown;
  let error: unknown;
  try {
    const res = await supabase.functions.invoke('stripe-cancel-subscription', {
      method: 'POST',
      body: { immediate: opts?.immediate === true },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    data = res.data;
    error = res.error;
  } catch (e) {
    console.error('[stripe] stripe-cancel-subscription', e);
    return { error: BILLING_USER_SAFE_MESSAGE };
  }
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { ok?: boolean; cancelled?: boolean; message?: string; error?: string };
  if (d?.error) return { error: BILLING_USER_SAFE_MESSAGE };
  if (!d?.ok) return { error: 'Could not cancel subscription' };
  return { ok: true as const, cancelled: Boolean(d.cancelled), message: d.message };
}
