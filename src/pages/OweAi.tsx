import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { invokeOweAi, type OweAiChatMessage } from '../lib/oweAi';
import { cn } from '../lib/utils';

const QUICK_PROMPTS = [
  'What can I safely buy this week?',
  'Explain APR in simple words.',
  'How should I budget based on my spending?',
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

  const useQuickPrompt = useCallback(
    (prompt: string) => {
      if (loading) return;
      setInput(prompt);
      void runSend(prompt);
    },
    [loading, runSend],
  );

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100dvh-12rem)] max-w-3xl mx-auto w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-content-primary">Owe-AI</h1>
            <p className="text-sm text-content-tertiary mt-1 max-w-xl">
              Ask about <strong className="text-content-secondary">your</strong> bills, cash flow, debts, budgets, and
              goals. Replies are based on what you&apos;ve saved in Oweable.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => useQuickPrompt(prompt)}
                  disabled={loading}
                  className="text-xs border border-surface-border bg-surface-raised/70 text-content-secondary px-2.5 py-1.5 rounded-md hover:bg-surface-elevated hover:text-content-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 inline-flex items-center gap-2 text-xs text-content-tertiary hover:text-content-secondary border border-surface-border rounded-md px-3 py-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
            Clear chat
          </button>
        )}
      </div>

      <div
        className="flex-1 min-h-[280px] max-h-[min(56dvh,520px)] overflow-y-auto rounded-xl border border-surface-border bg-surface-raised/40 p-4 space-y-4"
        aria-live="polite"
      >
        {messages.length === 0 && !loading && (
          <p className="text-sm text-content-tertiary text-center py-12 px-4">
            Try: “What can I safely buy this week?”, “Explain APR in simple words,” or “How should I budget based on my
            spending?”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}-${m.content.slice(0, 24)}`}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[92%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-violet-600/25 text-content-primary border border-violet-500/25'
                  : 'bg-surface-base text-content-secondary border border-surface-border',
              )}
            >
              {m.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-strong:text-content-primary">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-tertiary">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="owe-ai-input" className="sr-only">
          Message to Owe-AI
        </label>
        <div className="flex gap-2">
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
            placeholder="Ask about your finances in Oweable…"
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus-app disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 self-end h-10 w-10 inline-flex items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[11px] text-content-muted leading-relaxed">
          Non‑finance topics (weather, code, trivia, etc.) are blocked. Not legal, tax, or investment advice.
        </p>
      </form>
    </div>
  );
}
