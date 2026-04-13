/**
 * Optional client-side narration using Gemma 4 (E2B) ONNX via Transformers.js,
 * matching the model used in https://huggingface.co/spaces/webml-community/Gemma-4-WebGPU
 *
 * Runs entirely in the browser; prefers WebGPU, falls back to WASM if needed.
 * First load downloads model weights (large) — cache via browser Cache API afterward.
 */
import type { FinanceInsightsResponse } from './financeInsights';

/** ONNX build published for Transformers.js (same id as the official Gemma 4 WebGPU Space). */
export const GEMMA4_E2B_ONNX_MODEL = 'onnx-community/gemma-4-E2B-it-ONNX';

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { gpu?: unknown }).gpu);
}

type ProgressCb = (info: { status?: string; file?: string; progress?: number; loaded?: number; total?: number }) => void;

let pipelinePromise: Promise<unknown> | null = null;

async function getTextGenerationPipeline(progress?: ProgressCb): Promise<unknown> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const { pipeline } = await import('@huggingface/transformers');
    const base = {
      dtype: 'q4' as const,
      progress_callback: progress,
    };

    try {
      return await pipeline('text-generation', GEMMA4_E2B_ONNX_MODEL, {
        ...base,
        device: 'webgpu',
      });
    } catch (e) {
      console.warn('[gemma4] WebGPU load failed, retrying without device binding', e);
      return await pipeline('text-generation', GEMMA4_E2B_ONNX_MODEL, base);
    }
  })();

  return pipelinePromise;
}

function extractGeneratedText(out: unknown): string {
  if (!Array.isArray(out) || out.length === 0) return '';
  const first = out[0] as { generated_text?: unknown };
  const g = first?.generated_text;
  if (typeof g === 'string') return g.trim();
  if (Array.isArray(g)) {
    const last = g[g.length - 1] as { content?: unknown } | undefined;
    if (last && typeof last.content === 'string') return last.content.trim();
  }
  return String(g ?? '').trim();
}

export async function generateGemma4AffordabilityNarrative(
  payload: FinanceInsightsResponse,
  progress?: ProgressCb,
): Promise<string> {
  const pipe = (await getTextGenerationPipeline(progress)) as (
    messages: { role: string; content: string }[],
    opts: Record<string, unknown>,
  ) => Promise<unknown>;

  const facts = {
    verdict: payload.verdict,
    reasons: payload.reasons,
    purchaseAmount: payload.purchaseAmount,
    category: payload.category,
    liquidCash: payload.liquidCash,
    cashFlow: payload.cashFlow,
    safeToSpend: payload.safeToSpend,
  };

  const messages = [
    {
      role: 'system',
      content:
        'You are a concise assistant for the app Oweable. The JSON in the user message is authoritative. ' +
        'Do not invent or change any numbers. Explain the verdict in plain language in 2–4 short paragraphs. ' +
        'No investment, tax, or legal advice. Say the summary is informational only.',
    },
    {
      role: 'user',
      content: `FACTS (JSON):\n${JSON.stringify(facts, null, 2)}\n\nExplain for the user.`,
    },
  ];

  const out = await pipe(messages, {
    max_new_tokens: 400,
    do_sample: false,
    temperature: 0.2,
  });

  const text = extractGeneratedText(out);
  if (!text) throw new Error('Gemma returned an empty response.');
  return text;
}
