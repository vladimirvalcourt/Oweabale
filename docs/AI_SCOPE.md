# AI scope: affordability check vs open chat

## Recommendation

Ship **one high-trust, read-only feature** before any broad “chat with your finances” surface.

### Preferred first feature: **“Can I afford this?”**

- **Input**: A single purchase amount (and optional category).
- **Logic**: Deterministic + explainable — uses existing aggregates from the store (liquid cash, `computeSafeToSpend`, upcoming bills in window, optional monthly surplus from `calcMonthlyCashFlow`). No brokerage of trades, no executing payments.
- **Output**: Yes / no / caution with **explicit assumptions** (same style as Dashboard safe-to-spend disclosure).
- **Safety**: No open-ended tool calls; affordability copy is rule-based from your stored aggregates only.

### De-prioritize: **Open-ended finance chat**

- Higher risk of hallucinated numbers, wrong dates, or implied advice.
- Requires strong guardrails, citation of numbers back to stored rows, and likely human review for anything tax/legal.

## If you add a model later

- **Read-only**: model never writes to Supabase; app code applies any user-approved changes.
- **Structured prompts**: pass only aggregated fields (totals, counts, next due dates), not raw transaction dumps, unless the user explicitly exports.
- **Logging**: redact PII in analytics.

## Related code

- `src/lib/finance.ts` — `computeSafeToSpend`, `calcMonthlyCashFlow`, `groupOutflowsByHorizon`.
- Dashboard safe-to-spend card — pattern for disclosures.
- **Shipped:** `supabase/functions/finance-insights` loads the user’s rows from Postgres, recomputes the same math (`_shared/finance_safe_to_spend.ts`), classifies yes/caution/no, and returns a fixed rule-based narrative (no server LLM). UI: Dashboard **Can I afford this?** (`src/components/AffordabilityInsight.tsx`).
- **Optional (client-only):** users may run **Gemma 4 E2B** ONNX via Transformers.js in the browser (WebGPU when available); see `src/lib/gemma4WebGpuNarrative.ts`. This downloads weights from Hugging Face and never sends prompts to Oweable’s backend.
