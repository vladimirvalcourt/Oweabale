import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { calcMonthlyCashFlow, computeSafeToSpend } from '../_shared/finance_safe_to_spend.ts';
import { guardOweAiMessage } from '../_shared/owe_ai_guard.ts';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function citationDaysLeft(row: Record<string, unknown>): number {
  const dateStr = row.date as string | null | undefined;
  if (dateStr) {
    const d = new Date(dateStr);
    const t = d.getTime();
    if (!Number.isNaN(t)) {
      return Math.ceil((t - Date.now()) / 86400000);
    }
  }
  return Math.round(num(row.days_left ?? row.daysLeft));
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const role = (m as { role?: string }).role;
    const content = (m as { content?: string }).content;
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string') continue;
    const c = content.trim();
    if (!c) continue;
    out.push({ role, content: c.slice(0, 8000) });
  }
  return out.slice(-20);
}

async function buildUserContextJson(
  supabaseAdmin: ReturnType<typeof createClient>,
  uid: string,
): Promise<string> {
  const scheduleBaseMs = Date.now();

  const [billsR, debtsR, assetsR, incomesR, subsR, citR, goalsR, budgetsR, txR] = await Promise.all([
    supabaseAdmin.from('bills').select('*').eq('user_id', uid),
    supabaseAdmin.from('debts').select('*').eq('user_id', uid),
    supabaseAdmin.from('assets').select('*').eq('user_id', uid),
    supabaseAdmin.from('incomes').select('*').eq('user_id', uid),
    supabaseAdmin.from('subscriptions').select('*').eq('user_id', uid),
    supabaseAdmin.from('citations').select('*').eq('user_id', uid),
    supabaseAdmin.from('goals').select('*').eq('user_id', uid),
    supabaseAdmin.from('budgets').select('*').eq('user_id', uid),
    supabaseAdmin
      .from('transactions')
      .select('name, category, date, amount, type')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(40),
  ]);

  if (billsR.error) throw billsR.error;
  if (debtsR.error) throw debtsR.error;
  if (assetsR.error) throw assetsR.error;
  if (incomesR.error) throw incomesR.error;
  if (subsR.error) throw subsR.error;
  if (citR.error) throw citR.error;
  if (goalsR.error) throw goalsR.error;
  if (budgetsR.error) throw budgetsR.error;
  if (txR.error) throw txR.error;

  const bills = (billsR.data || []) as Record<string, unknown>[];
  const debts = (debtsR.data || []) as Record<string, unknown>[];
  const assets = (assetsR.data || []) as Record<string, unknown>[];
  const incomes = (incomesR.data || []) as Record<string, unknown>[];
  const subscriptions = (subsR.data || []) as Record<string, unknown>[];
  const citations = (citR.data || []) as Record<string, unknown>[];
  const goals = (goalsR.data || []) as Record<string, unknown>[];
  const budgets = (budgetsR.data || []) as Record<string, unknown>[];
  const transactions = (txR.data || []) as Record<string, unknown>[];

  const liquidCash = assets
    .filter((a) => str(a.type).toLowerCase() === 'cash')
    .reduce((s, a) => s + num(a.value), 0);

  const billsCf = bills.map((b) => ({
    amount: num(b.amount),
    frequency: str(b.frequency) || 'Monthly',
    status: str(b.status) || 'upcoming',
  }));

  const debtsCf = debts.map((d) => ({
    remaining: num(d.remaining),
    minPayment: num(d.min_payment ?? d.minPayment),
  }));

  const incomesCf = incomes.map((i) => ({
    amount: num(i.amount),
    frequency: str(i.frequency) || 'Monthly',
    status: str(i.status) || 'active',
    isTaxWithheld: Boolean(i.is_tax_withheld ?? i.isTaxWithheld),
  }));

  const subsCf = subscriptions.map((s) => ({
    amount: num(s.amount),
    frequency: str(s.frequency) || 'Monthly',
    status: str(s.status) || 'active',
  }));

  const cashFlow = calcMonthlyCashFlow(incomesCf, billsCf, debtsCf, subsCf);

  const safe = computeSafeToSpend({
    liquidCash,
    monthlySurplus: cashFlow.surplus,
    bills: bills.map((b) => ({
      dueDate: str(b.due_date ?? b.dueDate),
      amount: num(b.amount),
      status: str(b.status) || 'upcoming',
    })),
    incomes: incomes.map((i) => ({
      nextDate: str(i.next_date ?? i.nextDate),
      status: str(i.status) || 'active',
    })),
    subscriptions: subscriptions.map((s) => ({
      nextBillingDate: str(s.next_billing_date ?? s.nextBillingDate),
      amount: num(s.amount),
      status: str(s.status) || 'active',
    })),
    debts: debts.map((d) => ({
      minPayment: num(d.min_payment ?? d.minPayment),
      remaining: num(d.remaining),
      paymentDueDate: (d.payment_due_date ?? d.paymentDueDate ?? null) as string | null,
    })),
    citations: citations.map((c) => ({
      status: str(c.status) || 'open',
      daysLeft: citationDaysLeft(c),
      amount: num(c.amount),
    })),
    scheduleBaseMs,
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    liquidCash: parseFloat(liquidCash.toFixed(2)),
    monthlyCashFlow: {
      monthlyIncome: cashFlow.monthlyIncome,
      taxReserve: cashFlow.taxReserve,
      fixedExpenses: cashFlow.fixedExpenses,
      subscriptions: cashFlow.subscriptions,
      surplus: cashFlow.surplus,
      disposableIncome: cashFlow.disposableIncome,
    },
    safeToSpendSummary: {
      dailySafeToSpend: parseFloat(safe.dailySafeToSpend.toFixed(2)),
      liquidAfterScheduled: parseFloat(safe.liquidAfterScheduled.toFixed(2)),
      windowEndLabel: safe.windowEndLabel,
      daysInWindow: safe.daysInWindow,
    },
    bills: bills.slice(0, 30).map((b) => ({
      biller: str(b.biller).slice(0, 80),
      amount: num(b.amount),
      dueDate: str(b.due_date ?? b.dueDate),
      frequency: str(b.frequency),
      status: str(b.status),
      category: str(b.category).slice(0, 60),
    })),
    debts: debts.slice(0, 20).map((d) => ({
      name: str(d.name).slice(0, 80),
      remaining: num(d.remaining),
      minPayment: num(d.min_payment ?? d.minPayment),
      apr: num(d.apr),
      paymentDueDate: (d.payment_due_date ?? d.paymentDueDate ?? null) as string | null,
    })),
    subscriptions: subscriptions.slice(0, 25).map((s) => ({
      name: str(s.name).slice(0, 80),
      amount: num(s.amount),
      frequency: str(s.frequency),
      status: str(s.status),
      nextBillingDate: str(s.next_billing_date ?? s.nextBillingDate),
    })),
    incomes: incomes.slice(0, 20).map((i) => ({
      name: str(i.name).slice(0, 80),
      amount: num(i.amount),
      frequency: str(i.frequency),
      status: str(i.status),
      nextDate: str(i.next_date ?? i.nextDate),
      isTaxWithheld: Boolean(i.is_tax_withheld ?? i.isTaxWithheld),
    })),
    goals: goals.slice(0, 20).map((g) => ({
      name: str(g.name).slice(0, 80),
      targetAmount: num(g.target_amount ?? g.targetAmount),
      currentAmount: num(g.current_amount ?? g.currentAmount),
      deadline: str(g.deadline),
      type: str(g.type),
    })),
    budgets: budgets.slice(0, 25).map((b) => ({
      category: str(b.category).slice(0, 60),
      amount: num(b.amount),
      period: str(b.period),
    })),
    citationsOpen: citations.filter((c) => str(c.status) === 'open').length,
    citationsSample: citations
      .filter((c) => str(c.status) === 'open')
      .slice(0, 8)
      .map((c) => ({
        type: str(c.type).slice(0, 40),
        amount: num(c.amount),
        daysLeft: citationDaysLeft(c),
      })),
    nonCashAssets: assets
      .filter((a) => str(a.type).toLowerCase() !== 'cash')
      .slice(0, 15)
      .map((a) => ({
        name: str(a.name).slice(0, 60),
        type: str(a.type).slice(0, 40),
        value: num(a.value),
      })),
    recentTransactions: transactions.map((t) => ({
      name: str(t.name).slice(0, 80),
      category: str(t.category).slice(0, 50),
      date: str(t.date),
      amount: num(t.amount),
      type: str(t.type),
    })),
  };

  return JSON.stringify(payload);
}

const SYSTEM_PROMPT = `You are Owe-AI, a concise assistant inside the Oweable personal finance app.

Rules (must follow):
- Answer ONLY using the JSON snapshot in USER_FINANCIAL_CONTEXT. Do not invent accounts, amounts, institutions, or events that are not in the snapshot.
- If the answer is not in the data, say you do not see that in their Oweable data and suggest which screen to check (e.g. Bills, Transactions).
- Stay on personal finance topics tied to this user’s data. Refuse recipes, coding, weather, trivia, or general chit-chat.
- No legal, tax, or investment advice; you may summarize what the numbers imply in plain language with that caveat.
- Keep replies short (roughly 2–6 sentences) unless the user explicitly asks for detail.`;

/** Open-weight instruct model on Hugging Face Inference (router). Override with OWE_AI_MODEL. */
const DEFAULT_OWE_AI_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

function huggingFaceToken(): string | undefined {
  const a = Deno.env.get('HF_TOKEN')?.trim();
  const b = Deno.env.get('HUGGING_FACE_HUB_TOKEN')?.trim();
  return a || b || undefined;
}

/**
 * Hugging Face Inference Providers — OpenAI-compatible chat completions.
 * @see https://huggingface.co/docs/api-inference/en/tasks/chat-completion
 */
async function callHuggingFaceChat(
  hfToken: string,
  modelId: string,
  userContextJson: string,
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model: modelId,
    temperature: 0.35,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nUSER_FINANCIAL_CONTEXT (JSON):\n${userContextJson}`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Hugging Face inference error ${res.status}: ${t.slice(0, 400)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (json.error?.message) {
    throw new Error(json.error.message.slice(0, 400));
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty model response');
  return text;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const body = (await req.json().catch(() => ({}))) as { messages?: unknown };
    const messages = sanitizeMessages(body.messages);
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Send at least one message.' }), {
        status: 400,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      return new Response(JSON.stringify({ error: 'Last message must be from the user.' }), {
        status: 400,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const prior = messages.slice(0, -1);
    const hasRecentAssistant = prior.some((m) => m.role === 'assistant');

    const guard = guardOweAiMessage(lastUser.content, { hasRecentAssistant });
    if (!guard.ok) {
      return new Response(
        JSON.stringify({
          error: guard.code,
          message: guard.userMessage,
          blocked: true,
        }),
        { status: 422, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const hfToken = huggingFaceToken();
    if (!hfToken) {
      return new Response(
        JSON.stringify({
          error: 'AI_DISABLED',
          message:
            'Owe-AI uses an open-weight model via Hugging Face Inference. Set the Edge Function secret HF_TOKEN (or HUGGING_FACE_HUB_TOKEN) with a token that has Inference Providers access. Optional: OWE_AI_MODEL (default ' +
            DEFAULT_OWE_AI_MODEL +
            ').',
          blocked: false,
        }),
        { status: 503, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const modelId = Deno.env.get('OWE_AI_MODEL')?.trim() || DEFAULT_OWE_AI_MODEL;
    const contextJson = await buildUserContextJson(supabaseAdmin, user.id);
    const reply = await callHuggingFaceChat(hfToken, modelId, contextJson, messages);

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[owe-ai]', e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    const status =
      msg === 'Unauthorized' || msg === 'Missing Authorization header' ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
