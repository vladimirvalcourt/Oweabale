import { fetchWithTimeout } from './fetchWithTimeout.ts';

export type ExtractedEmailObligation = {
  biller_name: string;
  amount_due: number | null;
  due_date: string | null;
  account_last4: string | null;
  status: 'upcoming' | 'overdue' | 'final_notice' | 'collections' | 'confirmation' | 'renewal';
  action_required: boolean;
  category: 'bill' | 'debt' | 'subscription' | 'toll_fine' | 'tax' | 'insurance' | 'loan';
  confidence_score: number;
};

const EXTRACTION_PROMPT = `You extract structured financial obligation data from email metadata. Output ONLY valid JSON, no markdown.

Schema:
{
  "biller_name": string,
  "amount_due": number | null,
  "due_date": "YYYY-MM-DD" | null,
  "account_last4": string | null,
  "status": "upcoming" | "overdue" | "final_notice" | "collections" | "confirmation" | "renewal",
  "action_required": boolean,
  "category": "bill" | "debt" | "subscription" | "toll_fine" | "tax" | "insurance" | "loan",
  "confidence_score": number
}

Rules:
- confidence_score between 0 and 1. Use <0.5 if unclear.
- If this is only a payment confirmation with nothing owed, status "confirmation", action_required false, amount_due null unless a balance is stated.
- toll/fine/citation keywords => category toll_fine
- collection/final notice => status collections or final_notice, action_required true
- Never invent amounts; null if unknown.

INPUT:
`;

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function extractObligationFromEmailSnippet(
  hfToken: string,
  modelId: string,
  fromHeader: string,
  subject: string,
  snippet: string,
): Promise<ExtractedEmailObligation | null> {
  const userBlock = `From: ${fromHeader}\nSubject: ${subject}\nSnippet: ${snippet.slice(0, 6000)}`;
  const res = await fetchWithTimeout('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: userBlock },
      ],
    }),
    timeoutMs: 45_000,
    retries: 1,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.warn('[email-extract] HF error', res.status, t.slice(0, 200));
    return null;
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? '';
  const o = parseJsonObject(content);
  if (!o) return null;

  const confidence = num(o.confidence_score);
  if (confidence === null || confidence < 0.7) return null;

  const status = str(o.status);
  const category = str(o.category);
  const allowedStatus = ['upcoming', 'overdue', 'final_notice', 'collections', 'confirmation', 'renewal'];
  const allowedCat = ['bill', 'debt', 'subscription', 'toll_fine', 'tax', 'insurance', 'loan'];
  if (!allowedStatus.includes(status) || !allowedCat.includes(category)) return null;

  let due: string | null = str(o.due_date) || null;
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) due = null;

  return {
    biller_name: str(o.biller_name) || 'Unknown biller',
    amount_due: num(o.amount_due),
    due_date: due,
    account_last4: str(o.account_last4) || null,
    status: status as ExtractedEmailObligation['status'],
    action_required: o.action_required !== false,
    category: category as ExtractedEmailObligation['category'],
    confidence_score: confidence,
  };
}

export function suggestedDestination(
  category: ExtractedEmailObligation['category'],
  status: ExtractedEmailObligation['status'],
): 'bills' | 'debts' | 'subscriptions' | 'citations' | 'taxes' {
  if (category === 'toll_fine') return 'citations';
  if (category === 'tax') return 'taxes';
  if (category === 'subscription' || status === 'renewal') return 'subscriptions';
  if (category === 'debt' || category === 'loan' || status === 'collections') return 'debts';
  return 'bills';
}

export function urgencyFor(
  category: ExtractedEmailObligation['category'],
  status: ExtractedEmailObligation['status'],
): 'normal' | 'high' {
  if (status === 'collections' || status === 'final_notice') return 'high';
  if (category === 'tax' && status !== 'confirmation') return 'high';
  return 'normal';
}
