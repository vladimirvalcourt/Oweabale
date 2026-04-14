# AI scope: Owe-AI vs legacy affordability API

## Current product surface: **Owe-AI** (`/owe-ai`)

- **Who**: Signed-in users; each session only sees **their** aggregated Oweable data.
- **What**: Natural-language Q&amp;A (including “can I afford X?” style questions) with **server-side input guardrails** and a **JSON snapshot** of their finances sent to an **open-weight model** on Hugging Face Inference.
- **Safety**: Model is instructed to use only the snapshot, avoid legal/tax/investment advice, and stay on personal-finance topics tied to their data. See `supabase/functions/_shared/owe_ai_guard.ts` and `supabase/functions/owe-ai/index.ts`.
- **Conversation UX**: Short social openers like “hi” or “how are you?” are allowed; Owe-AI responds warmly, can greet by first name when available, then steers back to the user’s finances.

## Legacy (no Dashboard UI)

- **`supabase/functions/finance-insights`** — rule-based affordability math and narrative (no LLM). The **“Can I afford this?”** Dashboard card and **client-side Gemma / Transformers.js** path were **removed**; use **Owe-AI** for those questions instead. The Edge Function may remain deployed for any external callers until explicitly deprecated.

## Related code

- `src/lib/finance.ts` — `computeSafeToSpend`, `calcMonthlyCashFlow` (Dashboard safe-to-spend card still uses this client-side).
- Dashboard **safe-to-spend** block — deterministic estimate with disclosure; link to **Owe-AI** for purchase-specific questions.
