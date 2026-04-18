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
import { useFullSuiteAccess } from '../hooks/useFullSuiteAccess';
import { FullSuiteGateCard } from '../components/FullSuiteGate';
import { AppLoader } from '../components/PageSkeleton';

const OweAiMessageBubble = memo(function OweAiMessageBubble({ message }: { message: OweAiChatMessage }) {
  const m = message;
  return (
    <div className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[84%] px-4 py-2.5 text-sm shadow-sm',
          m.role === 'user'
            ? 'rounded-[22px] rounded-br-md bg-white text-black border border-surface-border'
            : 'rounded-[22px] rounded-bl-md bg-surface-elevated/95 text-content-secondary border border-surface-border',
        )}
      >
        {m.role === 'assistant' ? (
          <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-strong:text-content-primary">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{m.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{m.content}</p>
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
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Must match `messages` — used so invoke runs with the real thread (setState updaters are not synchronous). */
  const messagesRef = useRef<OweAiChatMessage[]>([]);
  /** Mirrors `input` state so event handlers can read the current value without capturing it in closures. */
  const inputRef = useRef('');

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const runSend = useCallback(async (text: string) => {
    const userMsg: OweAiChatMessage = { role: 'user', content: text };
    const nextThread = [...messagesRef.current, userMsg];

    setInput('');
    setLoading(true);
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
      setLoading(false);
    }
  }, [levelHint, mode]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    inputRef.current = e.target.value;
    setInput(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = inputRef.current.trim();
        if (!text || loading) return;
        void runSend(text);
      }
    },
    [loading, runSend],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputRef.current.trim();
      if (!text || loading) return;
      void runSend(text);
    },
    [loading, runSend],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setNextLessonPrompt('');
  }, []);

  const sendQuickPrompt = useCallback(
    (prompt: string) => {
      if (loading) return;
      void runSend(prompt);
    },
    [loading, runSend],
  );

  const sendNextLesson = useCallback(() => {
    if (!nextLessonPrompt || loading || mode !== 'academy') return;
    void runSend(nextLessonPrompt);
  }, [loading, mode, nextLessonPrompt, runSend]);

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
    <div className="min-h-[calc(100dvh-12rem)] max-w-3xl mx-auto w-full flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-full bg-violet-500/12 border border-violet-500/30 inline-flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-violet-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-content-primary leading-none">Owe-AI</h1>
            <p className="text-sm text-content-tertiary mt-1.5 max-w-xl">
              Chat the way you would with an advisor at the branch—plain language, short answers, and a clear next step.
              Owe-AI uses <strong className="text-content-secondary">your</strong> bills, income, debts, budgets, and goals
              from Oweable.
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 inline-flex items-center gap-2 text-xs text-content-tertiary hover:text-content-secondary border border-surface-border rounded-full px-3 py-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            Clear chat
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-raised/70 p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-content-tertiary">
            Chat mode: <span className="text-content-secondary font-medium">{MODE_LABEL[mode]}</span>
          </p>
          {learningProfile && mode === 'academy' && (
            <span className="text-[11px] rounded-full border border-violet-400/35 bg-violet-500/10 text-violet-200 px-2.5 py-1">
              Level: {learningProfile.familiarityLevel}
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
                'text-xs rounded-full border px-3 py-1.5 transition-colors',
                mode === m
                  ? 'border-brand-indigo/60 bg-brand-indigo/20 text-content-primary'
                  : 'border-surface-border bg-surface-base text-content-secondary hover:bg-surface-elevated',
              )}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {mode === 'academy' && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { label: 'Teach simpler', value: 'beginner' },
                { label: 'Standard', value: 'intermediate' },
                { label: 'Go deeper', value: 'advanced' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLevelHint(option.value)}
                className={cn(
                  'text-[11px] rounded-full border px-3 py-1 transition-colors',
                  levelHint === option.value
                    ? 'border-violet-400/55 bg-violet-500/15 text-violet-100'
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
                'text-[11px] rounded-full border px-3 py-1 transition-colors',
                levelHint === null
                  ? 'border-content-secondary/50 bg-surface-elevated text-content-secondary'
                  : 'border-surface-border bg-surface-base text-content-tertiary hover:text-content-secondary',
              )}
            >
              Auto level
            </button>
            <button
              type="button"
              onClick={sendNextLesson}
              disabled={!nextLessonPrompt || loading}
              className="text-[11px] rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 px-3 py-1 transition-colors hover:bg-emerald-500/20 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next lesson
            </button>
          </div>
        )}
      </div>

      <div
        className="relative flex-1 min-h-[320px] max-h-[min(58dvh,560px)] overflow-y-auto rounded-3xl border border-surface-border bg-gradient-to-b from-surface-raised/70 to-surface-base/90 px-4 py-5 space-y-3"
        aria-live="polite"
      >
        <div className="sticky top-0 z-10 -mx-4 -mt-5 mb-2 px-4 py-2 bg-gradient-to-b from-surface-base/90 to-transparent">
          <p className="text-[11px] uppercase tracking-[0.14em] text-content-muted">Your conversation</p>
        </div>
        {messages.length === 0 && !loading && (
          <div className="h-full min-h-[220px] flex items-center justify-center px-4">
            <p className="text-sm text-content-tertiary text-center max-w-md leading-relaxed">
              Say hi and ask anything about your money here—what you can afford this week, a bill coming up, or a term you
              want explained without the jargon.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <OweAiMessageBubble key={`${m.role}-${i}-${m.content.slice(0, 24)}`} message={m} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-[18px] rounded-bl-md border border-surface-border bg-surface-elevated/95 px-3 py-2 text-sm text-content-tertiary">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              One moment…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendQuickPrompt(prompt)}
            disabled={loading}
            className="text-xs rounded-full border border-surface-border bg-surface-raised/70 text-content-secondary px-3 py-1.5 hover:bg-surface-elevated hover:text-content-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="owe-ai-input" className="sr-only">
          Message to Owe-AI
        </label>
        <div className="rounded-full border border-surface-border bg-surface-raised px-2 py-1.5 flex items-end gap-2 transition-colors focus-within:border-brand-indigo/35 focus-within:ring-1 focus-within:ring-brand-indigo/25">
          <textarea
            id="owe-ai-input"
            rows={2}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'academy' ? 'Ask for a finance lesson or concept…' : 'Type your question like you would to an advisor…'}
            disabled={loading}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-content-primary placeholder:text-content-muted rounded-md disabled:opacity-50 max-h-28 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
          />
          <button
            type="submit"
            disabled={loading || !input}
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:pointer-events-none transition-colors mb-1"
            aria-label="Send message"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin pointer-events-none" aria-hidden />
            ) : (
              <Send className="w-4 h-4 pointer-events-none" aria-hidden />
            )}
          </button>
        </div>
        <p className="text-[11px] text-content-muted leading-relaxed">
          Owe-AI stays on your finances. Use <span className="text-content-secondary">Learn finance</span> mode when you want guided lessons.
          It isn&apos;t legal, tax, or personalized investment advice.
        </p>
      </form>
    </div>
  );
}
