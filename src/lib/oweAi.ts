import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type OweAiChatMessage = { role: 'user' | 'assistant'; content: string };
export type OweAiMode = 'advisor' | 'academy';
export type OweAiFamiliarity = 'beginner' | 'intermediate' | 'advanced';
export type OweAiLearningProfile = {
  familiarityLevel: OweAiFamiliarity;
  preferredStyle: 'plain_language' | 'step_by_step' | 'concise';
  topicsCovered: string[];
  recentFocus: string[];
  lastLessonTopic: string | null;
  totalLessons: number;
  totalMessages: number;
};

export type OweAiResult =
  | {
      type: 'reply';
      text: string;
      learningProfile?: OweAiLearningProfile;
      nextLessonPrompt?: string;
    }
  | { type: 'blocked'; message: string; code: string }
  | { type: 'disabled'; message: string };

const EXAMPLE_ALLOWED_PROMPTS =
  'Try: "What can I safely buy this week?" or "Explain APR in simple words."';

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

/** Fresh access token for Edge Functions (gateway often rejects expired JWTs). */
async function authHeadersForFunctions(): Promise<
  { headers: Record<string, string> } | { error: string }
> {
  const refreshAndToken = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    const t = data.session?.access_token;
    if (error || !t) return null;
    return t;
  };

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  let token = sessionData.session?.access_token ?? null;

  if (sessionErr || !token) {
    token = await refreshAndToken();
    if (!token) return { error: 'Sign in to use Owe-AI.' };
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  const exp = sessionData.session?.expires_at;
  const now = Math.floor(Date.now() / 1000);
  if (exp != null && exp - now < 120) {
    const t2 = await refreshAndToken();
    if (t2) token = t2;
  }

  return { headers: { Authorization: `Bearer ${token}` } };
}

function bodyImpliesInvalidSession(b: Record<string, unknown>): boolean {
  const e = typeof b.error === 'string' ? b.error.toLowerCase() : '';
  const m = typeof b.message === 'string' ? b.message.toLowerCase() : '';
  return (
    e.includes('jwt') ||
    m.includes('jwt') ||
    e.includes('unauthorized') ||
    (e.includes('invalid') && e.includes('token'))
  );
}

export async function invokeOweAi(
  messages: OweAiChatMessage[],
  opts?: { mode?: OweAiMode; levelHint?: OweAiFamiliarity },
): Promise<OweAiResult> {
  const payload = { messages, mode: opts?.mode ?? 'advisor', levelHint: opts?.levelHint };

  const invokeOnce = async () => {
    const auth = await authHeadersForFunctions();
    if ('error' in auth) {
      return { data: null, error: new Error(auth.error) } as const;
    }
    return supabase.functions.invoke('owe-ai', { body: payload, headers: auth.headers });
  };

  let { data, error } = await invokeOnce();
  let parsed: { status: number; body: Record<string, unknown> } | null = null;

  if (error) {
    const res = responseFromFunctionsError(error);
    if (res) parsed = await readErrorResponseBody(res);

    const needRefresh =
      parsed &&
      (parsed.status === 401 ||
        parsed.status === 403 ||
        bodyImpliesInvalidSession(parsed.body));

    if (needRefresh) {
      const { error: refErr } = await supabase.auth.refreshSession();
      if (!refErr) {
        ({ data, error } = await invokeOnce());
        parsed = null;
        if (error) {
          const res2 = responseFromFunctionsError(error);
          if (res2) parsed = await readErrorResponseBody(res2);
        }
      }
    }
  }

  if (error) {
    if (!parsed) {
      const res = responseFromFunctionsError(error);
      if (res) parsed = await readErrorResponseBody(res);
    }
    if (parsed) {
      const { status, body: b } = parsed;
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
        if (/jwt|invalid.*token|session/i.test(serverMsg)) {
          throw new Error('Your session expired. Please refresh the page or sign in again.');
        }
        if (/send at least one message|last message must be from the user/i.test(serverMsg)) {
          throw new Error(`Please enter a finance question before sending. ${EXAMPLE_ALLOWED_PROMPTS}`);
        }
        if (/model_not_found|does not exist/i.test(serverMsg)) {
          throw new Error('Owe-AI model setup is being updated. Please try again in a moment.');
        }
        throw new Error(serverMsg);
      }
      if (status >= 500) {
        throw new Error('Owe-AI is temporarily unavailable. Please try again in a moment.');
      }
      throw new Error(`Couldn’t process that request. ${EXAMPLE_ALLOWED_PROMPTS}`);
    }
    if (/jwt/i.test(error.message)) {
      throw new Error('Your session expired. Please refresh the page or sign in again.');
    }
    throw new Error(error.message);
  }

  const d = data as {
    reply?: string;
    error?: string;
    message?: string;
    blocked?: boolean;
    learningProfile?: OweAiLearningProfile;
    nextLessonPrompt?: string;
  } | null;
  if (d?.error && typeof d.message === 'string' && d.blocked) {
    return { type: 'blocked', message: d.message, code: String(d.error) };
  }
  if (d?.error === 'AI_DISABLED' && typeof d.message === 'string') {
    return { type: 'disabled', message: d.message };
  }
  if (typeof d?.reply === 'string' && d.reply.trim()) {
    return {
      type: 'reply',
      text: d.reply.trim(),
      learningProfile: d.learningProfile,
      nextLessonPrompt: typeof d.nextLessonPrompt === 'string' ? d.nextLessonPrompt : undefined,
    };
  }
  if (typeof d?.error === 'string') {
    if (/jwt|invalid.*token/i.test(d.error)) {
      throw new Error('Your session expired. Please refresh the page or sign in again.');
    }
    throw new Error(d.error);
  }
  throw new Error('Unexpected response from Owe-AI.');
}
