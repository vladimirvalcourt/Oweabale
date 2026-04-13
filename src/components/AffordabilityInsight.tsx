import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateGemma4AffordabilityNarrative,
  GEMMA4_E2B_ONNX_MODEL,
  isWebGpuAvailable,
} from '../lib/gemma4WebGpuNarrative';
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
  const [gemmaBusy, setGemmaBusy] = useState(false);
  const [gemmaText, setGemmaText] = useState<string | null>(null);
  const [gemmaProgress, setGemmaProgress] = useState<string | null>(null);

  const run = async () => {
    const n = parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error('Enter a positive purchase amount.');
      return;
    }
    setLoading(true);
    setResult(null);
    setGemmaText(null);
    setGemmaProgress(null);
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

  const runGemma4 = async () => {
    if (!result) return;
    setGemmaBusy(true);
    setGemmaText(null);
    setGemmaProgress('Loading Gemma 4…');
    try {
      const text = await generateGemma4AffordabilityNarrative(result, (info) => {
        if (info.status === 'progress' && typeof info.progress === 'number' && info.total) {
          const pct = Math.round((info.progress / info.total) * 100);
          setGemmaProgress(`Downloading model files… ${pct}%`);
        } else if (info.file) {
          setGemmaProgress(`Loading ${info.file}`);
        }
      });
      setGemmaText(text);
      setGemmaProgress(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gemma 4 could not run in this browser.';
      toast.error(msg);
      setGemmaProgress(null);
    } finally {
      setGemmaBusy(false);
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
          </div>
          <ul className="text-xs text-content-secondary list-disc pl-4 space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="text-sm text-content-primary whitespace-pre-wrap leading-relaxed">{result.narrative}</div>

          <div className="rounded-sm border border-white/10 bg-black/20 p-3 space-y-2">
            <p className="text-[10px] text-content-tertiary leading-relaxed">
              Optional: run{' '}
              <span className="font-mono text-content-secondary">{GEMMA4_E2B_ONNX_MODEL}</span> in your browser with
              Transformers.js ({isWebGpuAvailable() ? 'WebGPU detected' : 'WebGPU not available — will use a slower WASM path'}
              ). First run downloads several hundred MB; nothing is sent to Oweable servers.
            </p>
            {gemmaProgress && (
              <p className="text-[10px] font-mono text-amber-200/90">{gemmaProgress}</p>
            )}
            <button
              type="button"
              onClick={() => void runGemma4()}
              disabled={gemmaBusy}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/15 text-indigo-100 text-xs font-sans font-medium px-3 py-2 transition-colors disabled:opacity-60"
            >
              {gemmaBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden /> : null}
              {gemmaBusy ? 'Working…' : 'Generate richer explanation (Gemma 4 · on-device)'}
            </button>
            {gemmaText && (
              <div className="text-sm text-content-primary whitespace-pre-wrap leading-relaxed border-t border-white/10 pt-3 mt-1">
                {gemmaText}
              </div>
            )}
          </div>

          <p className="text-[10px] text-content-muted leading-relaxed">
            Not financial, tax, or legal advice. Numbers come from your Oweable data and the same rules as safe to
            spend.
          </p>
        </div>
      )}
    </div>
  );
}
