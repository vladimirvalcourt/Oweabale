/**
 * fetch() with an AbortController timeout and optional one-shot retry with jittered backoff.
 * Retries only on network errors or 5xx. 4xx responses are returned untouched (caller decides).
 */
export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
}

export async function fetchWithTimeout(
  input: string | URL | Request,
  init: FetchOptions = {},
): Promise<Response> {
  const { timeoutMs = 15_000, retries = 0, retryBaseMs = 400, ...rest } = init;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(new Error('timeout')), timeoutMs);
    try {
      const res = await fetch(input, { ...rest, signal: ac.signal });
      if (res.status >= 500 && attempt < retries) {
        await sleep(jitter(retryBaseMs, attempt));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= retries) break;
      await sleep(jitter(retryBaseMs, attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? 'fetch failed'));
}

function jitter(base: number, attempt: number): number {
  const backoff = base * 2 ** attempt;
  return backoff + Math.floor(Math.random() * base);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
