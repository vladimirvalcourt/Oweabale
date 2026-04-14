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

type PlanKey = 'pro_monthly' | 'pro_yearly' | 'lifetime';

export async function createStripeCheckoutSession(
  planKey: PlanKey
): Promise<{ checkoutUrl: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout-session', {
    method: 'POST',
    body: { planKey },
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { checkoutUrl?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.checkoutUrl) return { error: 'No checkout URL returned' };
  return { checkoutUrl: d.checkoutUrl };
}

export async function createStripePortalSession(
  returnUrl?: string
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
    method: 'POST',
    body: returnUrl ? { returnUrl } : {},
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { url?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.url) return { error: 'No portal URL returned' };
  return { url: d.url };
}
