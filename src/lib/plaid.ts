import { supabase } from './supabaseClient';

async function parseFunctionError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Unexpected server error';
  const anyErr = error as { context?: { json?: () => Promise<{ error?: string }> }; message?: string };

  try {
    const payload = await anyErr?.context?.json?.();
    if (payload?.error) return payload.error;
  } catch {
    // noop: keep fallback message
  }

  if (/non-2xx|status code/i.test(fallback)) {
    return 'Bank linking service is temporarily unavailable. Please retry in a moment.';
  }
  return fallback;
}

export async function createPlaidLinkToken(
  options?: { mode?: 'update' },
): Promise<{ link_token: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('plaid-link-token', {
    method: 'POST',
    body: options?.mode === 'update' ? { mode: 'update' } : {},
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { link_token?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.link_token) return { error: 'No link token returned' };
  return { link_token: d.link_token };
}

export async function exchangePlaidPublicToken(
  public_token: string,
  metadata?: { institution?: { name?: string; institution_id?: string } | null },
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('plaid-exchange', {
    method: 'POST',
    body: { public_token, metadata },
  });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { ok?: boolean; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.ok) return { error: 'Exchange failed' };
  return { ok: true };
}

export async function disconnectPlaid(): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('plaid-disconnect', { method: 'POST' });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { ok?: boolean; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.ok) return { error: 'Disconnect failed' };
  return { ok: true };
}

export async function syncPlaidTransactions(): Promise<
  { ok: true; processed: number; errors: number } | { error: string }
> {
  const { data, error } = await supabase.functions.invoke('plaid-sync', { method: 'POST' });
  if (error) return { error: await parseFunctionError(error) };
  const d = data as { ok?: boolean; processed?: number; errors?: number; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.ok) return { error: 'Sync failed' };
  return { ok: true, processed: d.processed ?? 0, errors: d.errors ?? 0 };
}
