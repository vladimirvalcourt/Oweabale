import { fetchWithTimeout } from './fetchWithTimeout.ts';

export function plaidBaseUrl(): string {
  const env = (Deno.env.get('PLAID_ENV') ?? 'sandbox').toLowerCase();
  if (env === 'production') return 'https://production.plaid.com';
  if (env === 'development') return 'https://development.plaid.com';
  return 'https://sandbox.plaid.com';
}

export async function plaidPost<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  if (!clientId || !secret) {
    throw new Error('Plaid is not configured (PLAID_CLIENT_ID / PLAID_SECRET)');
  }
  const res = await fetchWithTimeout(`${plaidBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
    timeoutMs: 20_000,
    retries: 1,
  });
  const json = (await res.json()) as T & {
    error_message?: string;
    error_code?: string;
  };
  if (!res.ok) {
    const msg = json.error_message ?? `Plaid HTTP ${res.status}`;
    const err = new Error(msg) as Error & { plaidCode?: string };
    err.plaidCode = json.error_code;
    throw err;
  }
  return json as T;
}
