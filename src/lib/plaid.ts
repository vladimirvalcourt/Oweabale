import { supabase } from './supabaseClient';

export async function createPlaidLinkToken(): Promise<{ link_token: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('plaid-link-token', { method: 'POST' });
  if (error) return { error: error.message };
  const d = data as { link_token?: string; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.link_token) return { error: 'No link token returned' };
  return { link_token: d.link_token };
}

export async function exchangePlaidPublicToken(
  public_token: string,
  metadata?: { institution?: { name?: string; institution_id?: string } },
): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('plaid-exchange', {
    method: 'POST',
    body: { public_token, metadata },
  });
  if (error) return { error: error.message };
  const d = data as { ok?: boolean; error?: string };
  if (d?.error) return { error: d.error };
  if (!d?.ok) return { error: 'Exchange failed' };
  return { ok: true };
}
