import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokeFinanceInsights, type AffordabilityVerdict } from '../lib/financeInsights';

function verdictStyles(v: AffordabilityVerdict): string {
  if (v === 'yes') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
  if (v === 'caution') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
}

function verdictLabel(v: AffordabilityVerdict): string {
  if (v === 'yes') return 'Likely OK';
  if (v === 'caution') return 'Caution';
  return 'Not advised';
}

export function AffordabilityInsight() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof invokeFinanceInsights>> | null>(null);

  const run = async () => {
    const n = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a positive purchase amount.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await invokeFinanceInsights(n, category || undefined);
      setResult(res);
      if (res.message) {
        toast.message(res.message);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-sm border border-indigo-500/25 bg-indigo-500/5 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
        <p className="metric-label normal-case text-indigo-200/90">Can I afford this?</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 min-w-0">
          <label htmlFor="afford-amount" className="block text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-1">
            Purchase amount ($)
          </label>
          <input
            id="afford-amount"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 120"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
          />
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="afford-cat" className="block text-[10px] font-mono uppercase tracking-wider text-content-tertiary mb-1">
            Category (optional)
          </label>
          <input
            id="afford-cat"
            type="text"
            placeholder="e.g. electronics"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-sm border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field-indigo"
          />
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-sans font-semibold px-5 py-2.5 transition-colors disabled:opacity-60 shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden /> : null}
          Check
        </button>
      </div>

      {result && (
        <div className="mt-5 space-y-3 text-left border-t border-indigo-500/20 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-sm border ${verdictStyles(result.verdict)}`}
            >
              {verdictLabel(result.verdict)}
            </span>
            {result.aiEnabled === false && (
              <span className="text-[10px] font-mono text-content-muted">Rule-based only (no HF token)</span>
            )}
            {result.model && (
              <span className="text-[10px] font-mono text-content-muted">Model: {result.model}</span>
            )}
          </div>
          <ul className="text-xs text-content-secondary list-disc pl-4 space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="text-sm text-content-primary whitespace-pre-wrap leading-relaxed">{result.narrative}</div>
          <p className="text-[10px] text-content-muted leading-relaxed">
            Not financial, tax, or legal advice. Numbers come from your Oweable data and app rules; the model only
            narrates when enabled.
          </p>
        </div>
      )}
    </div>
  );
}
