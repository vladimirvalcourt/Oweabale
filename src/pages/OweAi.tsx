import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, ShieldAlert, Trash2, LogIn, X, KeyRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { invokeOweAi, type OweAiChatMessage } from '../lib/oweAi';
import { cn } from '../lib/utils';

const HF_LOGIN_URL = 'https://huggingface.co/login';
const HF_TOKEN_NEW_URL =
  'https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained';
const HF_MCP_LOGIN_URL = 'https://huggingface.co/mcp?login';
const HF_PROMPT_DISMISS_KEY = 'oweai-hf-login-prompt-dismissed';

export default function OweAi() {
  const [messages, setMessages] = useState<OweAiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [hfSetupDismissed, setHfSetupDismissed] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(HF_PROMPT_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const dismissHfPrompt = useCallback(() => {
    try {
      localStorage.setItem(HF_PROMPT_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setHfSetupDismissed(true);
  }, []);

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
                'Owe-AI is not available right now: the server is missing a Hugging Face token (HF_TOKEN) or the model could not be reached. Your data was not sent to a model.',
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

      {!hfSetupDismissed && (
        <div
          className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 text-sm text-content-secondary"
          role="region"
          aria-label="Hugging Face setup"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-content-primary pr-2">Log in to Hugging Face (setup)</p>
            <button
              type="button"
              onClick={dismissHfPrompt}
              className="shrink-0 p-1 rounded-md text-content-tertiary hover:text-content-secondary hover:bg-white/5"
              aria-label="Dismiss Hugging Face setup notice"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-content-tertiary text-xs leading-relaxed">
            Owe-AI uses Hugging Face Inference on the server. Sign in, create a fine-grained token with Inference
            Providers access, then add it as the Supabase secret <code className="text-violet-300/90">HF_TOKEN</code>.
            Using Cursor MCP? Connect the Hub first.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={HF_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden />
              Log in to Hugging Face
            </a>
            <a
              href={HF_TOKEN_NEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs font-medium text-content-primary hover:bg-surface-raised transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" aria-hidden />
              Create access token
            </a>
            <a
              href={HF_MCP_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-xs font-medium text-content-tertiary hover:text-content-secondary hover:bg-white/5 transition-colors"
            >
              Cursor: HF MCP login
            </a>
          </div>
        </div>
      )}

      {configMessage && (
        <div
          className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90"
          role="status"
        >
          <div className="flex gap-2 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span>{configMessage}</span>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            <a
              href={HF_LOGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-100 underline underline-offset-2 hover:text-white"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden />
              Log in to Hugging Face
            </a>
            <span className="text-amber-200/40" aria-hidden>
              ·
            </span>
            <a
              href={HF_TOKEN_NEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-100 underline underline-offset-2 hover:text-white"
            >
              New token
            </a>
          </div>
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
