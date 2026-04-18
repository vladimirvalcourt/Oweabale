import React, { memo, startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  invokeOweAi,
  type OweAiChatMessage,
  type OweAiFamiliarity,
  type OweAiLearningProfile,
  type OweAiMode,
} from '../lib/oweAi';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../components/FullSuiteGate';
import { AppLoader } from '../components/PageSkeleton';

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

const QUICK_PROMPTS = [
  'What can I comfortably spend this week?',
  'Walk me through APR like I’m new to this.',
  'Given my numbers, how would you tighten my budget?',
] as const;

const MODE_LABEL: Record<OweAiMode, string> = {
  advisor: 'Advisor',
  academy: 'Learn finance',
};

export default function OweAi() {
  const { isLoading: accessLoading, hasFullSuite } = useFullSuiteAccess();
  const [messages, setMessages] = useState<OweAiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<OweAiMode>('advisor');
  const [levelHint, setLevelHint] = useState<OweAiFamiliarity | null>(null);
  const [learningProfile, setLearningProfile] = useState<OweAiLearningProfile | null>(null);
  const [nextLessonPrompt, setNextLessonPrompt] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Must match `messages` — used so invoke runs with the real thread (setState updaters are not synchronous). */
  const messagesRef = useRef<OweAiChatMessage[]>([]);
  /** True while a request is in flight — history load must not overwrite messages mid-send. */
  const sendInFlightRef = useRef(false);
  /** Mirrors `input` state so event handlers can read the current value without capturing it in closures. */
  const inputRef = useRef('');

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load persisted chat history on mount and when mode changes
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setHistoryLoading(false); return; }
      const { data } = await supabase
        .from('chat_messages')
        .select('role,content')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .order('created_at', { ascending: true })
        .limit(40);
      if (cancelled) return;
      if (sendInFlightRef.current) {
        setHistoryLoading(false);
        return;
      }
      if (data && data.length > 0) {
        const loaded: OweAiChatMessage[] = data.map(r => ({
          role: r.role as 'user' | 'assistant',
          content: r.content as string,
        }));
        startTransition(() => setMessages(loaded));
      } else {
        startTransition(() => setMessages([]));
      }
      setHistoryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const runSend = useCallback(async (text: string) => {
    if (historyLoading) return;
    const userMsg: OweAiChatMessage = { role: 'user', content: text };
    const nextThread = [...messagesRef.current, userMsg];

    sendInFlightRef.current = true;
    setInput('');
    inputRef.current = '';
    setLoading(true);
    messagesRef.current = nextThread;
    startTransition(() => {
      setMessages(nextThread);
    });

    try {
      const result = await invokeOweAi(nextThread, {
        mode,
        levelHint: mode === 'academy' ? levelHint ?? undefined : undefined,
      });
      if (result.type === 'reply') {
        if (result.learningProfile) setLearningProfile(result.learningProfile);
        setNextLessonPrompt(result.nextLessonPrompt ?? '');
        startTransition(() => {
          setMessages([...nextThread, { role: 'assistant', content: result.text }]);
        });
      } else if (result.type === 'blocked') {
        startTransition(() => {
          setMessages([...nextThread, { role: 'assistant', content: result.message }]);
        });
      } else {
        startTransition(() => {
          setMessages([
            ...nextThread,
            {
              role: 'assistant',
              content: 'Owe-AI is not available right now. Please try again later.',
            },
          ]);
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      startTransition(() => {
        setMessages([...nextThread, { role: 'assistant', content: `Could not reach Owe-AI: ${msg}` }]);
      });
    } finally {
      sendInFlightRef.current = false;
      setLoading(false);
    }
  }, [historyLoading, levelHint, mode]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    inputRef.current = e.target.value;
    setInput(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = inputRef.current.trim();
        if (!text || loading || historyLoading) return;
        void runSend(text);
      }
    },
    [historyLoading, loading, runSend],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputRef.current.trim();
      if (!text || loading || historyLoading) return;
      void runSend(text);
    },
    [historyLoading, loading, runSend],
  );

  const clearChat = useCallback(() => {
    startTransition(() => setMessages([]));
    setNextLessonPrompt('');
    // Delete persisted history for this mode
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('chat_messages').delete().eq('user_id', user.id).eq('mode', mode);
    })();
  }, [mode]);

  const sendQuickPrompt = useCallback(
    (prompt: string) => {
      if (loading || historyLoading) return;
      void runSend(prompt);
    },
    [historyLoading, loading, runSend],
  );

  const sendNextLesson = useCallback(() => {
    if (!nextLessonPrompt || loading || historyLoading || mode !== 'academy') return;
    void runSend(nextLessonPrompt);
  }, [historyLoading, loading, mode, nextLessonPrompt, runSend]);

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
    <div className="min-h-[calc(100dvh-10rem)] max-w-3xl mx-auto w-full flex flex-col gap-6">
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
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-content-tertiary hover:text-content-secondary border border-surface-border rounded-lg px-3 py-2 transition-colors hover:bg-surface-raised focus-app"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            Clear
          </button>
        )}
      </header>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4 sm:p-5 flex flex-col gap-4 shadow-none">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-content-tertiary">
            Mode · <span className="text-content-secondary">{MODE_LABEL[mode]}</span>
          </p>
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
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {mode === 'academy' && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-surface-border-subtle">
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
              disabled={!nextLessonPrompt || loading}
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
        <div className="shrink-0 border-b border-surface-border px-4 py-3 bg-surface-base/40">
          <p className="section-label">Conversation</p>
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
          {!historyLoading && messages.length === 0 && !loading && (
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
              <OweAiMessageBubble key={`${m.role}-${i}-${m.content.slice(0, 24)}`} message={m} />
            ))}
          {!historyLoading && loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-surface-elevated px-4 py-2.5 text-[13px] text-content-tertiary">
                <Loader2 className="w-4 h-4 animate-spin text-content-secondary" aria-hidden />
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
        </div>
      </div>

      <div>
        <p className="section-label mb-2">Suggestions</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
            onClick={() => sendQuickPrompt(prompt)}
            disabled={loading || historyLoading}
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
            disabled={loading || historyLoading}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-content-primary placeholder:text-content-muted rounded-lg disabled:opacity-50 max-h-28 outline-none focus:outline-none focus-visible:ring-0"
          />
          <button
            type="submit"
            disabled={loading || historyLoading || !input.trim()}
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
  );
}
