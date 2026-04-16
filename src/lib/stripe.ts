import { supabase } from './supabaseClient';

async function parseFunctionError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Unexpected server error';
  const anyErr = error as { context?: { json?: () => Promise<{ error?: string }> } };

  try {
    const payload = await anyErr?.context?.json?.();
    if (payload?.error) return payload.error;
  } catch {
    // noop
  }

  return fallback;
}

type PlanKey = 'pro_monthly';

export async function createStripeCheckoutSession(
  planKey: PlanKey
): Promise<{ checkoutUrl: string } | { error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Please sign in to start checkout.' };
  }

  const { data, error } = await supabase.functions.invoke('stripe-checkout-session', {
    method: 'POST',
    body: { planKey },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { checkoutUrl?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.checkoutUrl) return { error: 'No checkout URL returned' };
  return { checkoutUrl: d.checkoutUrl };
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

  const { data, error } = await supabase.functions.invoke('stripe-sync-billing', {
    method: 'POST',
    body: {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { ok?: boolean; synced?: boolean; error?: string };
  if (d?.error) return { error: d.error };
  if (d?.ok) return { ok: true as const, synced: d.synced };
  return { error: 'Could not sync billing' };
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

  const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
    method: 'POST',
    body: returnUrl ? { returnUrl } : {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { url?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.url) return { error: 'No portal URL returned' };
  return { url: d.url };
}
