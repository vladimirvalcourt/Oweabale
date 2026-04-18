import React, { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  RefreshCw,
  AlertTriangle,
  Copy,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
  invokeOweAiWithStreaming,
  type OweAiChatMessage,
  type OweAiFamiliarity,
  type OweAiInvokeError,
  type OweAiLearningProfile,
  type OweAiMode,
  type OweAiUiErrorKind,
  getOweAiFriendlyErrorMessage,
} from '../lib/oweAi';
import {
  buildOweAiSuggestionContext,
  pickOweAiSuggestions,
} from '../lib/oweAiSuggestions';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../components/FullSuiteGate';
import { AppLoader } from '../components/PageSkeleton';
import { useStore } from '../store/useStore';

const MODE_HINT_KEY = 'owe-ai-mode-hint-seen';

type SessionSummary = { id: string; preview: string; lastAt: string };

function buildSessionSummaries(
  rows: { session_id: string | null; created_at: string; role: string; content: string }[],
): SessionSummary[] {
  const byId = new Map<string, { lastAt: string; preview: string }>();
  for (const r of rows) {
    const id = r.session_id;
    if (!id) continue;
    const cur = byId.get(id) ?? { lastAt: r.created_at, preview: '' };
    if (r.created_at > cur.lastAt) cur.lastAt = r.created_at;
    byId.set(id, cur);
  }
  for (const r of rows) {
    const id = r.session_id;
    if (!id || r.role !== 'user' || !r.content?.trim()) continue;
    const cur = byId.get(id);
    if (cur && !cur.preview) cur.preview = r.content.trim().slice(0, 80);
  }
  return [...byId.entries()]
    .map(([id, v]) => ({
      id,
      lastAt: v.lastAt,
      preview: v.preview || 'Conversation',
    }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

const OweAiMessageBubble = memo(function OweAiMessageBubble({ message }: { message: OweAiChatMessage }) {
  const m = message;
  return (
    <div className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[min(100%,36rem)] px-4 py-3 text-[13px] leading-relaxed shadow-none',
          m.role === 'user'
            ? 'rounded-xl border border-content-primary/12 bg-content-primary/[0.07] text-content-primary'
            : 'rounded-xl border border-surface-border bg-surface-elevated text-content-secondary',
        )}
      >
        {m.role === 'assistant' ? (
          <div
            className={cn(
              'prose prose-sm max-w-none',
              'prose-p:my-2 prose-p:text-content-secondary prose-p:leading-relaxed',
              'prose-strong:text-content-primary prose-strong:font-semibold',
              'prose-ul:my-2 prose-ol:my-2 prose-li:text-content-secondary',
              'prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-medium prose-headings:text-content-primary',
              'prose-a:text-content-primary prose-a:underline prose-a:decoration-content-primary/30 prose-a:underline-offset-2',
            )}
          >
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{m.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-content-primary">{m.content}</p>
        )}
      </div>
    </div>
  );
});

const TypingDots = memo(function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-content-tertiary animate-pulse"
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: '1s' }}
        />
      ))}
    </div>
  );
});

const MODE_UI_LABEL: Record<OweAiMode, string> = {
  advisor: 'Advisor',
  academy: 'Learn finance',
};

export default function OweAi() {
  const { isLoading: accessLoading, hasFullSuite } = useFullSuiteAccess();
  const { bills, debts, assets, freelanceEntries } = useStore(
    useShallow((s) => ({
      bills: s.bills,
      debts: s.debts,
      assets: s.assets,
      freelanceEntries: s.freelanceEntries,
    })),
  );

  const [messages, setMessages] = useState<OweAiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<OweAiMode>('advisor');
  const [levelHint, setLevelHint] = useState<OweAiFamiliarity | null>(null);
  const [learningProfile, setLearningProfile] = useState<OweAiLearningProfile | null>(null);
  const [nextLessonPrompt, setNextLessonPrompt] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [suggestionSeed, setSuggestionSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [retryingUi, setRetryingUi] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [modeHintPopover, setModeHintPopover] = useState(false);
  const [modeHintAuto, setModeHintAuto] = useState(false);

  type ActiveTurn =
    | null
    | { userText: string; phase: 'loading' | 'retrying' | 'streaming' }
    | { userText: string; phase: 'error'; errorKind: OweAiUiErrorKind };

  const [activeTurn, setActiveTurn] = useState<ActiveTurn>(null);
  /** Partial assistant reply while SSE tokens arrive (empty until first chunk). */
  const [streamBuffer, setStreamBuffer] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<OweAiChatMessage[]>([]);
  const sendInFlightRef = useRef(false);
  const inputRef = useRef('');

  const suggestionCtx = useMemo(
    () => buildOweAiSuggestionContext(bills, debts, assets, freelanceEntries),
    [assets, bills, debts, freelanceEntries],
  );

  const quickPrompts = useMemo(
    () => pickOweAiSuggestions(mode, suggestionCtx, suggestionSeed),
    [mode, suggestionCtx, suggestionSeed],
  );

  const currentSessionMeta = useMemo(
    () => sessions.find((s) => s.id === sessionId),
    [sessionId, sessions],
  );

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setHistoryLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from('chat_messages')
        .select('session_id, created_at, role, content')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('created_at', { ascending: true })
        .limit(2500);
      if (cancelled) return;
      const list = (rows ?? []) as {
        session_id: string | null;
        created_at: string;
        role: string;
        content: string;
      }[];
      const summaries = buildSessionSummaries(list);
      setSessions(summaries);
      const nextId = summaries[0]?.id ?? crypto.randomUUID();
      setSessionId(nextId);

      const { data: thread } = await supabase
        .from('chat_messages')
        .select('role,content')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .eq('session_id', nextId)
        .order('created_at', { ascending: true })
        .limit(80);
      if (cancelled) return;
      if (sendInFlightRef.current) {
        setHistoryLoading(false);
        return;
      }
      if (thread && thread.length > 0) {
        const loaded: OweAiChatMessage[] = thread.map((r) => ({
          role: r.role as 'user' | 'assistant',
          content: r.content as string,
        }));
        startTransition(() => setMessages(loaded));
      } else {
        startTransition(() => setMessages([]));
      }
      setHistoryLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, activeTurn, streamBuffer]);

  /** First visit: brief mode explainer (no saved thread). */
  useEffect(() => {
    if (historyLoading || typeof window === 'undefined') return;
    if (messages.length > 0) return;
    try {
      if (localStorage.getItem(MODE_HINT_KEY)) return;
    } catch {
      return;
    }
    setModeHintAuto(true);
    setModeHintPopover(true);
    const t = window.setTimeout(() => {
      setModeHintAuto(false);
      setModeHintPopover(false);
      try {
        localStorage.setItem(MODE_HINT_KEY, '1');
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => window.clearTimeout(t);
  }, [historyLoading, messages.length]);

  const refreshSessionsForMode = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: rows } = await supabase
      .from('chat_messages')
      .select('session_id, created_at, role, content')
      .eq('user_id', user.id)
      .eq('mode', mode)
      .order('created_at', { ascending: true })
      .limit(2500);
    const list = (rows ?? []) as {
      session_id: string | null;
      created_at: string;
      role: string;
      content: string;
    }[];
    setSessions(buildSessionSummaries(list));
  }, [mode]);

  const runSend = useCallback(
    async (text: string) => {
      if (historyLoading || !sessionId || sendInFlightRef.current) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      sendInFlightRef.current = true;
      setInput('');
      inputRef.current = '';
      setLoading(true);
      setRetryingUi(false);
      setStreamBuffer('');
      setActiveTurn({ userText: trimmed, phase: 'loading' });

      const thread = [...messagesRef.current, { role: 'user' as const, content: trimmed }];

      try {
        const result = await invokeOweAiWithStreaming(thread, {
          mode,
          levelHint: mode === 'academy' ? levelHint ?? undefined : undefined,
          sessionId,
          onRetrying: () => {
            setRetryingUi(true);
            setActiveTurn({ userText: trimmed, phase: 'retrying' });
          },
          onDelta: (chunk) => {
            if (chunk.length > 0) {
              setActiveTurn({ userText: trimmed, phase: 'streaming' });
              setStreamBuffer((prev) => prev + chunk);
            }
          },
        });

        if (result.type === 'reply') {
          if (result.learningProfile) setLearningProfile(result.learningProfile);
          setNextLessonPrompt(result.nextLessonPrompt ?? '');
          startTransition(() => {
            setMessages([...thread, { role: 'assistant', content: result.text }]);
          });
          setSuggestionSeed((s) => s + 1);
          void refreshSessionsForMode();
        } else if (result.type === 'blocked') {
          startTransition(() => {
            setMessages([...thread, { role: 'assistant', content: result.message }]);
          });
        } else {
          startTransition(() => {
            setMessages([
              ...thread,
              {
                role: 'assistant',
                content: result.message,
              },
            ]);
          });
        }
        setActiveTurn(null);
        setStreamBuffer('');
      } catch (err) {
        const e = err as OweAiInvokeError;
        const kind = e.oweAiUi?.kind ?? 'unknown';
        setStreamBuffer('');
        setActiveTurn({ userText: trimmed, phase: 'error', errorKind: kind });
      } finally {
        sendInFlightRef.current = false;
        setLoading(false);
        setRetryingUi(false);
      }
    },
    [historyLoading, levelHint, mode, refreshSessionsForMode, sessionId],
  );

  const retryLastFailed = useCallback(() => {
    if (!activeTurn || activeTurn.phase !== 'error') return;
    void runSend(activeTurn.userText);
  }, [activeTurn, runSend]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    inputRef.current = e.target.value;
    setInput(e.target.value);
  }, []);

  const busy = loading || historyLoading || !sessionId;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const t = inputRef.current.trim();
        if (!t || busy) return;
        void runSend(t);
      }
    },
    [busy, runSend],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = inputRef.current.trim();
      if (!t || busy) return;
      void runSend(t);
    },
    [busy, runSend],
  );

  const startNewChat = useCallback(() => {
    const nid = crypto.randomUUID();
    setSessionId(nid);
    startTransition(() => setMessages([]));
    setActiveTurn(null);
    setStreamBuffer('');
    setNextLessonPrompt('');
    setSessions((prev) => {
      if (prev.some((s) => s.id === nid)) return prev;
      return [{ id: nid, preview: 'New chat', lastAt: new Date().toISOString() }, ...prev];
    });
  }, []);

  const selectSession = useCallback(
    async (id: string) => {
      if (id === sessionId || sendInFlightRef.current) return;
      setHistoryLoading(true);
      setSessionId(id);
      setActiveTurn(null);
      setStreamBuffer('');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHistoryLoading(false);
        return;
      }
      const { data: thread } = await supabase
        .from('chat_messages')
        .select('role,content')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .eq('session_id', id)
        .order('created_at', { ascending: true })
        .limit(80);
      const loaded: OweAiChatMessage[] = (thread ?? []).map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
      }));
      startTransition(() => setMessages(loaded));
      setHistoryLoading(false);
    },
    [mode, sessionId],
  );

  const sendQuickPrompt = useCallback(
    (prompt: string) => {
      if (busy) return;
      void runSend(prompt);
    },
    [busy, runSend],
  );

  const sendNextLesson = useCallback(() => {
    if (!nextLessonPrompt || busy || mode !== 'academy') return;
    void runSend(nextLessonPrompt);
  }, [busy, mode, nextLessonPrompt, runSend]);

  const copyConversation = useCallback(async () => {
    const lines = messages.map((m) => `${m.role === 'user' ? 'You' : 'Owe-AI'}: ${m.content}`);
    const text = lines.join('\n\n');
    try {
      await navigator.clipboard.writeText(text || '(empty)');
      toast.success('Conversation copied');
    } catch {
      toast.error('Could not copy');
    }
  }, [messages]);

  const confirmClearConversation = useCallback(async () => {
    if (!sessionId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('mode', mode)
      .eq('session_id', sessionId);
    startTransition(() => setMessages([]));
    setActiveTurn(null);
    setStreamBuffer('');
    setClearConfirmOpen(false);
    await refreshSessionsForMode();
    toast.success('Conversation cleared');
  }, [mode, refreshSessionsForMode, sessionId]);

  if (accessLoading) return <AppLoader />;
  if (!hasFullSuite) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center px-4">
        <FullSuiteGateCard
          title="Owe-AI is available on Full Suite"
          description="Upgrade to unlock personalized AI coaching based on your Oweable financial data."
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-10rem)] w-full max-w-6xl mx-auto flex flex-col gap-6">
      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owe-ai-clear-title"
        >
          <div className="max-w-md w-full rounded-xl border border-surface-border bg-surface-raised p-5 shadow-xl">
            <h2 id="owe-ai-clear-title" className="text-base font-semibold text-content-primary">
              Clear conversation?
            </h2>
            <p className="mt-2 text-sm text-content-secondary leading-relaxed">
              This removes all messages in this chat from your saved history. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-content-secondary hover:bg-surface-base focus-app"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmClearConversation()}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 focus-app"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-start justify-between gap-4 border-b border-surface-border pb-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="mt-0.5 h-10 w-10 shrink-0 rounded-lg border border-surface-border bg-surface-raised inline-flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Sparkles className="h-4 w-4 text-content-secondary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="section-label mb-2">Assistant</p>
            <h1 className="text-xl font-semibold tracking-tight text-content-primary sm:text-2xl">Owe-AI</h1>
            <p className="text-sm text-content-tertiary mt-2 max-w-xl leading-relaxed">
              Plain-language answers from your real Oweable data—bills, income, debts, budgets, and goals—with a clear next
              step when it matters.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => startNewChat()}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-content-secondary hover:text-content-primary transition-colors hover:bg-surface-elevated focus-app"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          New chat
        </button>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside
          className={cn(
            'lg:w-64 shrink-0 rounded-xl border border-surface-border bg-surface-raised overflow-hidden',
            !sessionsOpen && 'lg:w-12',
          )}
        >
          <button
            type="button"
            onClick={() => setSessionsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 border-b border-surface-border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-content-tertiary hover:bg-surface-base"
          >
            <span className={cn(!sessionsOpen && 'sr-only')}>Recent</span>
            {sessionsOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {sessionsOpen && (
            <ul className="max-h-[min(52dvh,360px)] overflow-y-auto p-2 space-y-1">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => void selectSession(s.id)}
                    className={cn(
                      'w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                      s.id === sessionId
                        ? 'border-content-primary/20 bg-content-primary/[0.06] text-content-primary'
                        : 'border-transparent text-content-secondary hover:bg-surface-base',
                    )}
                  >
                    <span className="line-clamp-2 font-medium">{s.preview}</span>
                    <span className="mt-0.5 block text-[10px] font-mono text-content-muted">
                      {new Date(s.lastAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
              {sessions.length === 0 && (
                <li className="px-2 py-4 text-[11px] text-content-tertiary">No saved conversations yet.</li>
              )}
            </ul>
          )}
        </aside>

        <div className="min-w-0 flex-1 flex flex-col gap-6">
          <div className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5 flex flex-col gap-4 shadow-none relative">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-content-tertiary">
                  Mode · <span className="text-content-secondary">{MODE_UI_LABEL[mode]}</span>
                </p>
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:text-content-secondary hover:bg-surface-base focus-app"
                    aria-label="What do the modes mean?"
                    onMouseEnter={() => {
                      if (!modeHintAuto) setModeHintPopover(true);
                    }}
                    onMouseLeave={() => {
                      if (!modeHintAuto) setModeHintPopover(false);
                    }}
                    onFocus={() => setModeHintPopover(true)}
                    onBlur={() => {
                      if (!modeHintAuto) setModeHintPopover(false);
                    }}
                    onClick={() => setModeHintPopover((v) => !v)}
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {(modeHintPopover || modeHintAuto) && (
                    <div
                      className="absolute left-0 top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-surface-border bg-black/95 p-3 text-[11px] leading-relaxed text-content-secondary shadow-lg sm:left-auto sm:right-0"
                      role="tooltip"
                    >
                      <p className="font-medium text-content-primary">Advisor</p>
                      <p className="mt-1">
                        Ask questions about your real Oweable data — bills, income, debts, and spending.
                      </p>
                      <p className="mt-3 font-medium text-content-primary">Learn finance</p>
                      <p className="mt-1">
                        Structured lessons on budgeting, debt, credit, taxes, and investing. No account data used.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {learningProfile && mode === 'academy' && (
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] rounded-lg border border-surface-border bg-surface-base px-2.5 py-1 text-content-secondary">
                  Level {learningProfile.familiarityLevel}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {(['advisor', 'academy'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.16em] rounded-lg border px-3 py-2 transition-colors focus-app',
                    mode === m
                      ? 'border-content-primary/12 bg-content-primary/[0.08] text-content-primary'
                      : 'border-surface-border bg-transparent text-content-tertiary hover:text-content-primary hover:bg-surface-base',
                  )}
                >
                  {m === 'advisor' ? 'Advisor' : 'Learn finance'}
                </button>
              ))}
            </div>

            {mode === 'academy' && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-surface-border/70">
                {(
                  [
                    { label: 'Simpler', value: 'beginner' },
                    { label: 'Standard', value: 'intermediate' },
                    { label: 'Deeper', value: 'advanced' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLevelHint(option.value)}
                    className={cn(
                      'text-[10px] font-mono uppercase tracking-[0.14em] rounded-lg border px-3 py-1.5 transition-colors focus-app',
                      levelHint === option.value
                        ? 'border-content-primary/12 bg-content-primary/[0.06] text-content-primary'
                        : 'border-surface-border bg-surface-base text-content-tertiary hover:text-content-secondary',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setLevelHint(null)}
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.14em] rounded-lg border px-3 py-1.5 transition-colors focus-app',
                    levelHint === null
                      ? 'border-content-primary/15 bg-surface-elevated text-content-secondary'
                      : 'border-surface-border bg-surface-base text-content-tertiary hover:text-content-secondary',
                  )}
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={sendNextLesson}
                  disabled={!nextLessonPrompt || busy}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-content-primary transition-colors hover:bg-surface-elevated disabled:opacity-40 disabled:pointer-events-none focus-app"
                >
                  Next lesson
                </button>
              </div>
            )}
          </div>

          <div
            className="flex min-h-[360px] flex-1 flex-col rounded-xl border border-surface-border bg-surface-raised shadow-none overflow-hidden"
            aria-live="polite"
          >
            <div className="shrink-0 border-b border-surface-border px-4 py-3 bg-surface-base/40 flex flex-wrap items-center justify-between gap-2">
              <p className="section-label">Conversation</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-surface-border/80 bg-surface-base/60 px-2 py-1 text-[10px] font-mono text-content-tertiary">
                  Saved to your account
                  {currentSessionMeta && (
                    <span className="text-content-muted">
                      · Last:{' '}
                      {new Date(currentSessionMeta.lastAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => void copyConversation()}
                  disabled={messages.length === 0}
                  className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-content-secondary hover:bg-surface-base disabled:opacity-40 focus-app"
                >
                  <Copy className="h-3 w-3" aria-hidden />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(true)}
                  disabled={messages.length === 0 && !activeTurn}
                  className="inline-flex items-center gap-1 rounded-md border border-surface-border px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-content-secondary hover:bg-surface-base disabled:opacity-40 focus-app"
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Clear
                </button>
              </div>
            </div>
            <div className="min-h-[280px] max-h-[min(52dvh,520px)] flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
              {historyLoading && (
                <div className="flex justify-center py-16">
                  <div className="inline-flex items-center gap-2 text-[13px] text-content-tertiary">
                    <Loader2 className="h-4 w-4 animate-spin text-content-secondary" aria-hidden />
                    Loading conversation…
                  </div>
                </div>
              )}
              {!historyLoading && messages.length === 0 && !loading && !activeTurn && (
                <div className="flex min-h-[200px] items-center justify-center px-2 py-6">
                  <div className="max-w-md rounded-xl border border-dashed border-surface-border/80 bg-surface-base/60 px-6 py-8 text-center">
                    <p className="text-sm text-content-secondary leading-relaxed">
                      Ask what you can afford this week, what&apos;s due soon, or have a finance term explained—always grounded in
                      your Oweable data.
                    </p>
                  </div>
                </div>
              )}
              {!historyLoading &&
                messages.map((m, i) => (
                  <OweAiMessageBubble key={`${i}-${m.role}-${m.content.slice(0, 12)}`} message={m} />
                ))}

              {!historyLoading &&
                activeTurn &&
                activeTurn.phase !== 'error' && (
                <>
                  <OweAiMessageBubble message={{ role: 'user', content: activeTurn.userText }} />
                  <div className="flex w-full justify-start">
                    <div className="max-w-[min(100%,36rem)] rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 text-[13px] text-content-secondary">
                      {streamBuffer.length > 0 ? (
                        <div
                          className={cn(
                            'prose prose-sm max-w-none',
                            'prose-p:my-2 prose-p:text-content-secondary prose-p:leading-relaxed',
                            'prose-strong:text-content-primary prose-strong:font-semibold',
                            'prose-ul:my-2 prose-ol:my-2 prose-li:text-content-secondary',
                            'prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:text-sm prose-headings:font-medium prose-headings:text-content-primary',
                            'prose-a:text-content-primary prose-a:underline prose-a:decoration-content-primary/30 prose-a:underline-offset-2',
                          )}
                        >
                          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{streamBuffer}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-content-tertiary">
                          <TypingDots />
                          <span>
                            {retryingUi || activeTurn.phase === 'retrying'
                              ? 'Owe-AI is taking longer than usual — retrying…'
                              : 'Owe-AI is thinking…'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!historyLoading && activeTurn && activeTurn.phase === 'error' && (
                <>
                  <OweAiMessageBubble message={{ role: 'user', content: activeTurn.userText }} />
                  <div className="flex w-full justify-start">
                    <div
                      className="max-w-[min(100%,36rem)] rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[13px] text-content-secondary"
                      role="alert"
                    >
                      <div className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden />
                        <div className="min-w-0 space-y-3">
                          <p>{getOweAiFriendlyErrorMessage(activeTurn.errorKind)}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => retryLastFailed()}
                              className="rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-medium text-content-primary hover:bg-surface-elevated focus-app"
                            >
                              Try again
                            </button>
                            <button
                              type="button"
                              onClick={() => window.location.reload()}
                              className="rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-content-tertiary hover:text-content-secondary underline-offset-2 hover:underline focus-app"
                            >
                              Refresh page
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="section-label">Suggestions</p>
              <button
                type="button"
                onClick={() => setSuggestionSeed((s) => s + 997)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border text-content-tertiary hover:text-content-secondary hover:bg-surface-base focus-app"
                title="New suggestions"
                aria-label="Refresh suggestions"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuickPrompt(prompt)}
                  disabled={busy}
                  className="text-left text-[11px] sm:text-xs leading-snug rounded-lg border border-surface-border bg-surface-base text-content-secondary px-3 py-2 hover:bg-surface-elevated hover:text-content-primary transition-colors disabled:opacity-40 disabled:pointer-events-none focus-app max-w-[20rem]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="owe-ai-input" className="sr-only">
              Message to Owe-AI
            </label>
            <div className="rounded-xl border border-surface-border bg-surface-raised px-3 py-2 flex items-end gap-2 transition-colors focus-within:border-content-primary/20 focus-within:ring-1 focus-within:ring-content-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <textarea
                id="owe-ai-input"
                rows={2}
                value={input}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={mode === 'academy' ? 'Ask for a lesson or concept…' : 'Ask about your money…'}
                disabled={busy}
                className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-content-primary placeholder:text-content-muted rounded-lg disabled:opacity-50 max-h-28 outline-none focus:outline-none focus-visible:ring-0"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="btn-tactile shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg bg-content-primary text-surface-base hover:bg-brand-cta-hover disabled:opacity-40 disabled:pointer-events-none mb-0.5 focus-app"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin pointer-events-none" aria-hidden />
                ) : (
                  <Send className="w-4 h-4 pointer-events-none" aria-hidden />
                )}
              </button>
            </div>
            <p className="text-[11px] text-content-muted leading-relaxed max-w-2xl">
              Finance topics only. Not legal, tax, or personalized investment advice.{' '}
              <span className="text-content-tertiary">Learn finance</span> mode is for structured lessons.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
