import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { supabase } from './supabase';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseClient';

/** Client for Owe-AI; the `owe-ai` Edge Function calls Hugging Face Inference only, not OpenAI/Anthropic. */

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

export type OweAiUiErrorKind = 'network' | 'slow' | 'unavailable' | 'session' | 'unknown';

/** After retries exhausted; read `oweAiUi.kind` for which copy to show. */
export type OweAiInvokeError = Error & { oweAiUi?: { kind: OweAiUiErrorKind } };

const EXAMPLE_ALLOWED_PROMPTS =
  'Try: "What can I safely buy this week?" or "Explain APR in simple words."';

const USER_COPY: Record<OweAiUiErrorKind, string> = {
  network:
    "Couldn’t connect to Owe-AI. Check your connection and try again.",
  slow: "Owe-AI is taking longer than usual. Wait a moment and try again.",
  unavailable: "Owe-AI is temporarily unavailable. Try again in a moment.",
  session: 'Your session expired. Refresh the page or sign in again.',
  unknown: "Something went wrong. Try again, or refresh the page if this keeps happening.",
};

export function getOweAiFriendlyErrorMessage(kind: OweAiUiErrorKind): string {
  return USER_COPY[kind];
}

class OweAiRetriableError extends Error {
  readonly name = 'OweAiRetriableError';
  constructor() {
    super('owe_ai_retriable');
  }
}

function asOweAiInvokeError(kind: OweAiUiErrorKind, cause?: unknown): OweAiInvokeError {
  const e = new Error(USER_COPY[kind]) as OweAiInvokeError;
  e.oweAiUi = { kind };
  if (cause !== undefined) e.cause = cause;
  return e;
}

function throwOweAiUi(kind: OweAiUiErrorKind, cause?: unknown): never {
  throw asOweAiInvokeError(kind, cause);
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function transportMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRetriableTransport(
  err: unknown,
  parsed: { status: number; body: Record<string, unknown> } | null,
): boolean {
  const msg = transportMessage(err).toLowerCase();
  if (
    /failed to send a request to the edge function|failed to fetch|networkerror|load failed|econnreset|econnrefused|socket hang up|aborted|timeout|timed out|524|522/.test(
      msg,
    )
  ) {
    return true;
  }
  if (!parsed) return false;
  const s = parsed.status;
  return s === 502 || s === 503 || s === 504 || s === 429;
}

function classifyFinalFailure(
  err: unknown,
  parsed: { status: number; body: Record<string, unknown> } | null,
): OweAiUiErrorKind {
  const msg = transportMessage(err).toLowerCase();
  if (/jwt|invalid.*token|session expired|invalid_session/.test(msg)) return 'session';
  if (
    /failed to send a request to the edge function|failed to fetch|networkerror|econnreset|econnrefused|load failed/.test(
      msg,
    )
  ) {
    return 'network';
  }
  if (/timeout|timed out|524|522|504/.test(msg)) return 'slow';
  if (parsed && (parsed.status >= 500 || parsed.status === 502 || parsed.status === 503)) {
    return 'unavailable';
  }
  return 'unknown';
}

function reportOweAiFailure(
  err: unknown,
  extra: { attempts: number; lastUserPreview: string; mode: OweAiMode },
): void {
  try {
    if (Sentry.getClient() === undefined) return;
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { feature: 'owe-ai-invoke' },
      extra: {
        attempts: extra.attempts,
        userMessagePreview: extra.lastUserPreview,
        mode: extra.mode,
      },
    });
  } catch {
    /* ignore */
  }
}

export type InvokeOweAiOptions = {
  mode?: OweAiMode;
  levelHint?: OweAiFamiliarity;
  sessionId?: string;
  /** Fired before retry attempts 2 and 3 (after the backoff wait). */
  onRetrying?: (attemptIndex: 1 | 2) => void;
};

type StreamPayload = {
  messages: OweAiChatMessage[];
  mode: OweAiMode;
  levelHint?: OweAiFamiliarity;
  sessionId?: string;
  stream: true;
};

async function parseOweAiSse(
  res: Response,
  onDelta: (chunk: string) => void,
): Promise<{
  text: string;
  learningProfile?: OweAiLearningProfile;
  nextLessonPrompt?: string;
}> {
  const reader = res.body?.getReader();
  if (!reader) throw new OweAiRetriableError();
  const dec = new TextDecoder();
  let buf = '';
  let accumulated = '';
  let learningProfile: OweAiLearningProfile | undefined;
  let nextLessonPrompt: string | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf('\n\n');
        if (sep === -1) break;
        const block = buf.slice(0, sep).trim();
        buf = buf.slice(sep + 2);
        if (!block.startsWith('data:')) continue;
        const raw = block.slice(5).trim();
        let j: Record<string, unknown>;
        try {
          j = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (typeof j.error === 'string') {
          const err = j.error.toLowerCase();
          if (/empty_model|empty/.test(err)) throw new OweAiRetriableError();
          if (/jwt|unauthorized|invalid_session/.test(err)) throwOweAiUi('session', j.error);
          throw asOweAiInvokeError('unavailable', j.error);
        }
        if (typeof j.delta === 'string' && j.delta.length > 0) {
          accumulated += j.delta;
          onDelta(j.delta);
        }
        if (j.done === true) {
          if (j.learningProfile && typeof j.learningProfile === 'object') {
            learningProfile = j.learningProfile as OweAiLearningProfile;
          }
          nextLessonPrompt = typeof j.nextLessonPrompt === 'string' ? j.nextLessonPrompt : undefined;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!accumulated.trim()) throw new OweAiRetriableError();
  return {
    text: accumulated,
    learningProfile,
    nextLessonPrompt,
  };
}

/**
 * Streaming invoke (SSE). Falls back to JSON `invokeOweAi` if no tokens arrive (HF/model without stream).
 */
async function streamOweAiSingleAttempt(
  payload: StreamPayload,
  onDelta: (chunk: string) => void,
): Promise<OweAiResult> {
  const doFetch = async (headers: Record<string, string>) =>
    fetch(`${SUPABASE_URL}/functions/v1/owe-ai`, {
      method: 'POST',
      headers: {
        ...headers,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

  let auth = await authHeadersForFunctions();
  if ('error' in auth) {
    throw new Error(auth.error);
  }
  let res = await doFetch(auth.headers);

  if (res.status === 401) {
    const { error: refErr } = await supabase.auth.refreshSession();
    if (refErr) throwOweAiUi('session');
    auth = await authHeadersForFunctions();
    if ('error' in auth) throwOweAiUi('session');
    res = await doFetch(auth.headers);
  }

  const ct = res.headers.get('content-type') ?? '';

  if (!res.ok) {
    if (ct.includes('application/json')) {
      const b = (await res.json()) as Record<string, unknown>;
      if (res.status === 422 && typeof b.message === 'string' && b.message.trim()) {
        return {
          type: 'blocked',
          message: b.message.trim(),
          code: typeof b.error === 'string' ? b.error : 'OFF_TOPIC',
        };
      }
      if (res.status === 503 && b.error === 'AI_DISABLED') {
        return {
          type: 'disabled',
          message: 'Owe-AI is temporarily unavailable. Please try again in a few minutes.',
        };
      }
      const errCode = typeof b.error === 'string' ? b.error : '';
      const msg = typeof b.message === 'string' ? b.message : errCode;
      // Only treat INVALID_SESSION (auth expiry) as a session error, not SESSION_REQUIRED (bad UUID).
      if (errCode === 'INVALID_SESSION' || /jwt|invalid.*token/i.test(msg)) throwOweAiUi('session');
    }
    if (res.status === 403) throwOweAiUi('unavailable');
    if (res.status >= 500 || res.status === 429) throw new OweAiRetriableError();
    throw new OweAiRetriableError();
  }

  if (!ct.includes('text/event-stream')) {
    throw new OweAiRetriableError();
  }

  const parsed = await parseOweAiSse(res, onDelta);
  return {
    type: 'reply',
    text: parsed.text.trim(),
    learningProfile: parsed.learningProfile,
    nextLessonPrompt: parsed.nextLessonPrompt,
  };
}

export type StreamingOweAiOptions = InvokeOweAiOptions & {
  onDelta: (chunk: string) => void;
};

export async function invokeOweAiWithStreaming(
  messages: OweAiChatMessage[],
  opts: StreamingOweAiOptions,
): Promise<OweAiResult> {
  const mode = opts?.mode ?? 'advisor';
  const payload: StreamPayload = {
    messages,
    mode,
    levelHint: opts?.levelHint,
    sessionId: opts?.sessionId,
    stream: true,
  };

  const jsonFallbackOpts: InvokeOweAiOptions = {
    mode: opts.mode,
    levelHint: opts.levelHint,
    sessionId: opts.sessionId,
    onRetrying: opts.onRetrying,
  };

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastUserPreview = (lastUser?.content ?? '').slice(0, 120);
  let gotDelta = false;
  const onDelta = (c: string) => {
    if (c.length > 0) gotDelta = true;
    opts.onDelta(c);
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      opts?.onRetrying?.(attempt === 1 ? 1 : 2);
      await sleep(attempt === 1 ? 1000 : 3000);
      await supabase.auth.refreshSession().catch(() => {});
    }
    try {
      const r = await streamOweAiSingleAttempt(payload, onDelta);
      if (r.type === 'reply' && !r.text.trim()) throw new OweAiRetriableError();
      return r;
    } catch (e) {
      if (e instanceof OweAiRetriableError && attempt < 2) {
        continue;
      }
      if (e instanceof OweAiRetriableError) {
        reportOweAiFailure(e, { attempts: 3, lastUserPreview, mode });
        if (!gotDelta) {
          return await invokeOweAi(messages, jsonFallbackOpts);
        }
        throw asOweAiInvokeError(classifyFinalFailure(e, null), e);
      }
      throw e;
    }
  }

  if (!gotDelta) {
    return await invokeOweAi(messages, jsonFallbackOpts);
  }
  throw new Error('owe-ai: stream retry exhausted');
}

/**
 * One logical call to the Edge Function (includes a single 401 refresh + re-invoke if applicable).
 * Throws OweAiRetriableError when the outer loop should retry with backoff.
 */
async function invokeOweAiSingleAttempt(
  payload: {
    messages: OweAiChatMessage[];
    mode: OweAiMode;
    levelHint?: OweAiFamiliarity;
    sessionId?: string;
  },
): Promise<OweAiResult> {
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
        return {
          type: 'disabled',
          message:
            'Owe-AI is temporarily unavailable. Please try again in a few minutes.',
        };
      }
      const serverMsg =
        typeof b.message === 'string' && b.message.trim()
          ? b.message.trim()
          : typeof b.error === 'string' && b.error.trim()
            ? b.error.trim()
            : null;
      if (serverMsg) {
        const errCode2 = typeof b.error === 'string' ? b.error : '';
        if (errCode2 === 'INVALID_SESSION' || /jwt|invalid.*token/i.test(serverMsg)) {
          throwOweAiUi('session', error);
        }
        if (/send at least one message|last message must be from the user/i.test(serverMsg)) {
          throw new Error(`Please enter a finance question before sending. ${EXAMPLE_ALLOWED_PROMPTS}`);
        }
        if (/model_not_found|does not exist/i.test(serverMsg)) {
          throwOweAiUi('unavailable', error);
        }
        if (isRetriableTransport(error, parsed)) {
          throw new OweAiRetriableError();
        }
        if (status >= 500) {
          throwOweAiUi('unavailable', error);
        }
        throw new Error(`Couldn’t process that request. ${EXAMPLE_ALLOWED_PROMPTS}`);
      }
      if (status >= 500) {
        if (isRetriableTransport(error, parsed)) throw new OweAiRetriableError();
        throwOweAiUi('unavailable', error);
      }
      if (isRetriableTransport(error, parsed)) throw new OweAiRetriableError();
      throw new Error(`Couldn’t process that request. ${EXAMPLE_ALLOWED_PROMPTS}`);
    }

    if (/jwt/i.test(error.message)) {
      throwOweAiUi('session', error);
    }
    if (isRetriableTransport(error, null)) throw new OweAiRetriableError();
    throw asOweAiInvokeError(classifyFinalFailure(error, null), error);
  }

  if (data == null) {
    throw new OweAiRetriableError();
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
    return {
      type: 'disabled',
      message: 'Owe-AI is temporarily unavailable. Please try again in a few minutes.',
    };
  }
  if (typeof d?.reply === 'string' && d.reply.trim()) {
    return {
      type: 'reply',
      text: d.reply.trim(),
      learningProfile: d.learningProfile,
      nextLessonPrompt: typeof d.nextLessonPrompt === 'string' ? d.nextLessonPrompt : undefined,
    };
  }
  if (typeof d?.reply === 'string' && !d.reply.trim()) {
    throw new OweAiRetriableError();
  }
  if (typeof d?.error === 'string') {
    if (/jwt|invalid.*token/i.test(d.error)) {
      throwOweAiUi('session', d.error);
    }
    throw new OweAiRetriableError();
  }
  throw asOweAiInvokeError('unknown', data);
}

export async function invokeOweAi(
  messages: OweAiChatMessage[],
  opts?: InvokeOweAiOptions,
): Promise<OweAiResult> {
  const mode = opts?.mode ?? 'advisor';
  const payload = {
    messages,
    mode,
    levelHint: opts?.levelHint,
    sessionId: opts?.sessionId,
  };

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const lastUserPreview = (lastUser?.content ?? '').slice(0, 120);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      opts?.onRetrying?.(attempt === 1 ? 1 : 2);
      await sleep(attempt === 1 ? 1000 : 3000);
      await supabase.auth.refreshSession().catch(() => {});
    }

    try {
      return await invokeOweAiSingleAttempt(payload);
    } catch (e) {
      if (e instanceof OweAiRetriableError && attempt < 2) {
        continue;
      }
      if (e instanceof OweAiRetriableError) {
        reportOweAiFailure(e, { attempts: 3, lastUserPreview, mode });
        throw asOweAiInvokeError(classifyFinalFailure(e, null), e);
      }
      throw e;
    }
  }

  throw new Error('owe-ai: exhaustive retry failed');
}
