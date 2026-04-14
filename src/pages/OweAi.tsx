import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { invokeOweAi, type OweAiChatMessage } from '../lib/oweAi';
import { cn } from '../lib/utils';

const QUICK_PROMPTS = [
  'What can I comfortably spend this week?',
  'Walk me through APR like I’m new to this.',
  'Given my numbers, how would you tighten my budget?',
] as const;

export default function OweAi() {
  const [messages, setMessages] = useState<OweAiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  /** Must match `messages` — used so invoke runs with the real thread (setState updaters are not synchronous). */
  const messagesRef = useRef<OweAiChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const runSend = useCallback(async (text: string) => {
    const userMsg: OweAiChatMessage = { role: 'user', content: text };
    const nextThread = [...messagesRef.current, userMsg];
    setMessages(nextThread);
    setInput('');
    setLoading(true);

    try {
      const result = await invokeOweAi(nextThread);
      if (result.type === 'reply') {
        setMessages((m) => [...m, { role: 'assistant', content: result.text }]);
      } else if (result.type === 'blocked') {
        setMessages((m) => [...m, { role: 'assistant', content: result.message }]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              'Owe-AI is not available right now. Please try again later.',
          },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((m) => [...m, { role: 'assistant', content: `Could not reach Owe-AI: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || loading) return;
      void runSend(text);
    },
    [input, loading, runSend],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const sendQuickPrompt = useCallback(
    (prompt: string) => {
      if (loading) return;
      setInput(prompt);
      void runSend(prompt);
    },
    [loading, runSend],
  );

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
          <div
            key={`${m.role}-${i}-${m.content.slice(0, 24)}`}
            className={cn('flex w-full', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[84%] px-4 py-2.5 text-sm shadow-sm',
                m.role === 'user'
                  ? 'rounded-[22px] rounded-br-md bg-brand-cta text-white border border-indigo-300/20'
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
        <div className="rounded-full border border-surface-border bg-surface-raised px-2 py-1.5 flex items-end gap-2">
          <textarea
            id="owe-ai-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = input.trim();
                if (!text || loading) return;
                void runSend(text);
              }
            }}
            placeholder="Type your question like you would to an advisor…"
            disabled={loading}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus-app-field rounded-md disabled:opacity-50 max-h-28"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full bg-brand-cta text-white hover:bg-brand-cta-hover disabled:opacity-40 disabled:pointer-events-none transition-colors mb-1"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-content-muted leading-relaxed">
          Owe-AI stays on your finances. It isn&apos;t legal, tax, or personalized investment advice—think education and
          planning with the data you&apos;ve saved.
        </p>
      </form>
    </div>
  );
}
