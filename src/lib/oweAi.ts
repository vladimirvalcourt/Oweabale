import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OweAiChatMessage = { role: 'user' | 'assistant'; content: string };

export type OweAiResult =
  | { type: 'reply'; text: string }
  | { type: 'blocked'; message: string; code: string }
  | { type: 'disabled'; message: string };

async function parseFunctionsError(err: FunctionsHttpError): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const res = err.context as Response;
  try {
    const clone = res.clone();
    const body = (await clone.json()) as Record<string, unknown>;
    return { status: res.status, body };
  } catch {
    return { status: res.status, body: {} };
  }
}

export async function invokeOweAi(messages: OweAiChatMessage[]): Promise<OweAiResult> {
  const body = { messages };
  const doInvoke = () => supabase.functions.invoke('owe-ai', { body });

  let { data, error } = await doInvoke();

  if (error instanceof FunctionsHttpError) {
    const st = error.context.status;
    if (st === 401 || st === 403) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr) {
        ({ data, error } = await doInvoke());
      }
    }
  }

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const { status, body: b } = await parseFunctionsError(error);
      if (status === 422 && typeof b.message === 'string') {
        return {
          type: 'blocked',
          message: b.message,
          code: typeof b.error === 'string' ? b.error : 'OFF_TOPIC',
        };
      }
      if (status === 503 && b.error === 'AI_DISABLED' && typeof b.message === 'string') {
        return { type: 'disabled', message: b.message };
      }
      const errStr = typeof b.error === 'string' ? b.error : error.message;
      throw new Error(errStr || error.message);
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
