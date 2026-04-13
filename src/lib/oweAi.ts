import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OweAiChatMessage = { role: 'user' | 'assistant'; content: string };

export type OweAiResult =
  | { type: 'reply'; text: string }
  | { type: 'blocked'; message: string; code: string }
  | { type: 'disabled'; message: string };

/** Supabase sets `error.context` to the fetch Response for HTTP errors. */
function responseFromFunctionsError(e: unknown): Response | null {
  if (e instanceof FunctionsHttpError) {
    return e.context instanceof Response ? e.context : null;
  }
  if (typeof e === 'object' && e !== null && 'context' in e) {
    const c = (e as { context: unknown }).context;
    return c instanceof Response ? c : null;
  }
  return null;
}

async function readErrorResponseBody(res: Response): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const status = res.status;
  try {
    const raw = await res.text();
    if (!raw.trim()) return { status, body: {} };
    try {
      return { status, body: JSON.parse(raw) as Record<string, unknown> };
    } catch {
      return { status, body: { error: raw.slice(0, 500) } };
    }
  } catch {
    return { status, body: {} };
  }
}

export async function invokeOweAi(messages: OweAiChatMessage[]): Promise<OweAiResult> {
  const body = { messages };
  const doInvoke = () => supabase.functions.invoke('owe-ai', { body });

  let { data, error } = await doInvoke();

  const httpRes = responseFromFunctionsError(error);
  if (httpRes && (httpRes.status === 401 || httpRes.status === 403)) {
    const { error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr) {
      ({ data, error } = await doInvoke());
    }
  }

  if (error) {
    const res = responseFromFunctionsError(error);
    if (res) {
      const { status, body: b } = await readErrorResponseBody(res);
      if (status === 422 && typeof b.message === 'string' && b.message.trim()) {
        return {
          type: 'blocked',
          message: b.message.trim(),
          code: typeof b.error === 'string' ? b.error : 'OFF_TOPIC',
        };
      }
      if (status === 503 && b.error === 'AI_DISABLED' && typeof b.message === 'string') {
        return { type: 'disabled', message: b.message };
      }
      const serverMsg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : typeof b.error === 'string' && b.error.trim()
            ? b.error.trim()
            : null;
      if (serverMsg) {
        throw new Error(serverMsg);
      }
      throw new Error(`Owe-AI is temporarily unavailable (${status}). Please try again.`);
    }
    throw new Error(error.message);
  }

  const d = data as { reply?: string; error?: string; message?: string; blocked?: boolean } | null;
  if (d?.error && typeof d.message === 'string' && d.blocked) {
    return { type: 'blocked', message: d.message, code: String(d.error) };
  }
  if (d?.error === 'AI_DISABLED' && typeof d.message === 'string') {
    return { type: 'disabled', message: d.message };
  }
  if (typeof d?.reply === 'string' && d.reply.trim()) {
    return { type: 'reply', text: d.reply.trim() };
  }
  if (typeof d?.error === 'string') {
    throw new Error(d.error);
  }
  throw new Error('Unexpected response from Owe-AI.');
}
