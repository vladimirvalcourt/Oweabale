import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { invokeOweAi, type OweAiChatMessage } from '../lib/oweAi';
import { cn } from '../lib/utils';

export default function OweAi() {
  const [messages, setMessages] = useState<OweAiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const runSend = useCallback(async (text: string) => {
    const userMsg: OweAiChatMessage = { role: 'user', content: text };
    let thread: OweAiChatMessage[] = [];
    setMessages((prev) => {
      thread = [...prev, userMsg];
      return thread;
    });
    setInput('');
    setLoading(true);
    setConfigMessage(null);

    try {
      const result = await invokeOweAi(thread);
      if (result.type === 'reply') {
        setMessages((m) => [...m, { role: 'assistant', content: result.text }]);
      } else if (result.type === 'blocked') {
        setMessages((m) => [...m, { role: 'assistant', content: result.message }]);
      } else {
        setConfigMessage(result.message);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              'Owe-AI is not available right now because the assistant is not configured on the server. Your data was not sent to any model.',
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
    setConfigMessage(null);
  }, []);

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
              Ask follow-up questions about <strong className="text-content-secondary">your</strong> bills, cash flow,
              debts, budgets, and goals. Answers use only your Oweable data—not general web knowledge.
            </p>
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

      {configMessage && (
        <div
          className="flex gap-2 items-start rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90"
          role="status"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>{configMessage}</span>
        </div>
      )}

      <div
        className="flex-1 min-h-[280px] max-h-[min(56dvh,520px)] overflow-y-auto rounded-xl border border-surface-border bg-surface-raised/40 p-4 space-y-4"
        aria-live="polite"
      >
        {messages.length === 0 && !loading && (
          <p className="text-sm text-content-tertiary text-center py-12 px-4">
            Example: “What are my biggest fixed costs this month?” or “How does my liquid cash compare to what’s due
            soon?”
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
