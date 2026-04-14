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

function cleanedNamePart(v: unknown): string {
  const raw = str(v).trim();
  if (!raw) return '';
  return raw
    .replace(/[^a-zA-Z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function inferredFirstName(profile: { first_name?: unknown; email?: unknown }): string {
  const explicit = cleanedNamePart(profile.first_name);
  if (explicit) return explicit.split(' ')[0];

  const email = str(profile.email).trim();
  const local = email.split('@')[0] || '';
  const token = cleanedNamePart(local.replace(/[._-]+/g, ' ')).split(' ')[0] || '';
  return token;
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
type ChatMode = 'advisor' | 'academy';
type FamiliarityLevel = 'beginner' | 'intermediate' | 'advanced';
type PreferredStyle = 'plain_language' | 'step_by_step' | 'concise';
type LearningProfile = {
  familiarityLevel: FamiliarityLevel;
  preferredStyle: PreferredStyle;
  topicsCovered: string[];
  recentFocus: string[];
  lastLessonTopic: string | null;
  totalLessons: number;
  totalMessages: number;
};

const EDUCATION_INTENT =
  /\b(teach|lesson|learn|academy|course|curriculum|explain|walk me through|help me understand|from scratch|basics|fundamentals|what is|how does)\b/i;
const BEGINNER_INTENT =
  /\b(beginner|new to this|from scratch|simple terms|eli5|for dummies|basic[s]?|don't understand)\b/i;
const ADVANCED_INTENT =
  /\b(advanced|optimi[sz]e|trade-?offs?|strategy|scenario|sensitivity|amortization|utilization|dti|compound|refinanc|underwriting)\b/i;
const TOPIC_KEYWORDS: Array<{ key: string; rx: RegExp }> = [
  { key: 'credit score', rx: /\b(credit score|fico|utilization)\b/i },
  { key: 'apr and interest', rx: /\b(apr|interest|compound interest|simple interest)\b/i },
  { key: 'debt payoff', rx: /\b(debt|loan|minimum payment|payoff|snowball|avalanche)\b/i },
  { key: 'budgeting', rx: /\b(budget|cash flow|spending plan|category)\b/i },
  { key: 'safe-to-spend', rx: /\b(safe to spend|afford|disposable)\b/i },
  { key: 'emergency fund', rx: /\b(emergency fund|rainy day|sinking fund)\b/i },
  { key: 'income planning', rx: /\b(income|paycheck|salary|1099|w2|freelance)\b/i },
  { key: 'bills and obligations', rx: /\b(bill|due date|subscription|citation|fine|obligation)\b/i },
  { key: 'saving and goals', rx: /\b(save|saving|goal|target amount)\b/i },
  { key: 'investing basics', rx: /\b(invest|stock|bond|etf|portfolio|ira|401k|roth)\b/i },
];
const MAX_TOPIC_HISTORY = 24;
const MAX_RECENT_FOCUS = 6;

function normalizeMode(v: unknown): ChatMode {
  return v === 'academy' ? 'academy' : 'advisor';
}

function normalizeLevelHint(v: unknown): FamiliarityLevel | null {
  return v === 'beginner' || v === 'intermediate' || v === 'advanced' ? v : null;
}

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

function sanitizeTopicList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(-MAX_TOPIC_HISTORY);
}

function dedupeKeepRecent(items: string[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const v = items[i].trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.unshift(v);
    if (out.length >= max) break;
  }
  return out;
}

function detectTopics(...texts: string[]): string[] {
  const joined = texts.join('\n');
  return TOPIC_KEYWORDS.filter((t) => t.rx.test(joined)).map((t) => t.key);
}

function inferFamiliarity(
  previous: FamiliarityLevel,
  lastUserText: string,
  allMessages: ChatMessage[],
): FamiliarityLevel {
  const wholeThread = allMessages.map((m) => m.content).join('\n');
  if (BEGINNER_INTENT.test(lastUserText) || BEGINNER_INTENT.test(wholeThread)) return 'beginner';
  if (ADVANCED_INTENT.test(lastUserText) || ADVANCED_INTENT.test(wholeThread)) return 'advanced';
  if (previous === 'advanced') return 'advanced';
  if (previous === 'intermediate') return 'intermediate';
  return 'intermediate';
}

function parseLearningProfile(row: Record<string, unknown> | null | undefined): LearningProfile {
  const familiarityRaw = str(row?.familiarity_level);
  const familiarityLevel: FamiliarityLevel =
    familiarityRaw === 'advanced' || familiarityRaw === 'intermediate' ? familiarityRaw : 'beginner';
  const styleRaw = str(row?.preferred_style);
  const preferredStyle: PreferredStyle =
    styleRaw === 'step_by_step' || styleRaw === 'concise' ? styleRaw : 'plain_language';

  return {
    familiarityLevel,
    preferredStyle,
    topicsCovered: sanitizeTopicList(row?.topics_covered),
    recentFocus: sanitizeTopicList(row?.recent_focus).slice(-MAX_RECENT_FOCUS),
    lastLessonTopic: str(row?.last_lesson_topic) || null,
    totalLessons: Math.max(0, Math.round(num(row?.total_lessons))),
    totalMessages: Math.max(0, Math.round(num(row?.total_messages))),
  };
}

async function readLearningProfile(
  supabaseAdmin: ReturnType<typeof createClient>,
  uid: string,
): Promise<LearningProfile> {
  const { data, error } = await supabaseAdmin
    .from('ai_learning_profiles')
    .select(
      'familiarity_level,preferred_style,topics_covered,recent_focus,last_lesson_topic,total_lessons,total_messages',
    )
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    // Keep Owe-AI functional even if migration has not been applied yet.
    console.warn('[owe-ai] learning profile read failed:', error.message);
    return parseLearningProfile(null);
  }
  return parseLearningProfile((data || null) as Record<string, unknown> | null);
}

async function upsertLearningProfile(
  supabaseAdmin: ReturnType<typeof createClient>,
  uid: string,
  previous: LearningProfile,
  messages: ChatMessage[],
  lastUserText: string,
  replyText: string,
  levelHint: FamiliarityLevel | null,
): Promise<LearningProfile> {
  const lessonTriggered = EDUCATION_INTENT.test(lastUserText);
  const currentTopics = detectTopics(lastUserText, replyText);
  const topicsCovered = dedupeKeepRecent([...previous.topicsCovered, ...currentTopics], MAX_TOPIC_HISTORY);
  const recentFocus = dedupeKeepRecent([...previous.recentFocus, ...currentTopics], MAX_RECENT_FOCUS);
  const familiarityLevel = levelHint ?? inferFamiliarity(previous.familiarityLevel, lastUserText, messages);
  const lastLessonTopic = currentTopics[0] || previous.lastLessonTopic;

  const next: LearningProfile = {
    familiarityLevel,
    preferredStyle: previous.preferredStyle,
    topicsCovered,
    recentFocus,
    lastLessonTopic,
    totalLessons: previous.totalLessons + (lessonTriggered ? 1 : 0),
    totalMessages: previous.totalMessages + 1,
  };

  const { error } = await supabaseAdmin.from('ai_learning_profiles').upsert(
    {
      user_id: uid,
      familiarity_level: next.familiarityLevel,
      preferred_style: next.preferredStyle,
      topics_covered: next.topicsCovered,
      recent_focus: next.recentFocus,
      last_lesson_topic: next.lastLessonTopic,
      total_lessons: next.totalLessons,
      total_messages: next.totalMessages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.warn('[owe-ai] learning profile upsert failed:', error.message);
    return previous;
  }
  return next;
}

function nextLessonPromptFromProfile(profile: LearningProfile): string {
  const seen = new Set(profile.topicsCovered);
  const path = [
    'budgeting',
    'safe-to-spend',
    'debt payoff',
    'credit score',
    'apr and interest',
    'emergency fund',
    'saving and goals',
    'income planning',
    'investing basics',
  ];
  const next = path.find((p) => !seen.has(p)) || 'debt-to-income ratio';
  return `Teach me ${next} with a short practical lesson using my numbers when possible.`;
}

async function buildUserContextJson(
  supabaseAdmin: ReturnType<typeof createClient>,
  uid: string,
  learningProfile: LearningProfile,
): Promise<string> {
  const scheduleBaseMs = Date.now();

  const [billsR, debtsR, assetsR, incomesR, subsR, citR, goalsR, budgetsR, txR, profileR] = await Promise.all([
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
    supabaseAdmin.from('profiles').select('first_name,last_name,email').eq('id', uid).maybeSingle(),
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
  if (profileR.error) throw profileR.error;

  const bills = (billsR.data || []) as Record<string, unknown>[];
  const debts = (debtsR.data || []) as Record<string, unknown>[];
  const assets = (assetsR.data || []) as Record<string, unknown>[];
  const incomes = (incomesR.data || []) as Record<string, unknown>[];
  const subscriptions = (subsR.data || []) as Record<string, unknown>[];
  const citations = (citR.data || []) as Record<string, unknown>[];
  const goals = (goalsR.data || []) as Record<string, unknown>[];
  const budgets = (budgetsR.data || []) as Record<string, unknown>[];
  const transactions = (txR.data || []) as Record<string, unknown>[];
  const profile = (profileR.data || {}) as Record<string, unknown>;
  const firstName = inferredFirstName({ first_name: profile.first_name, email: profile.email });

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
    userProfile: {
      firstName,
      lastName: cleanedNamePart(profile.last_name),
    },
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
    learningProfile: {
      familiarityLevel: learningProfile.familiarityLevel,
      preferredStyle: learningProfile.preferredStyle,
      topicsCovered: learningProfile.topicsCovered,
      recentFocus: learningProfile.recentFocus,
      lastLessonTopic: learningProfile.lastLessonTopic,
      totalLessons: learningProfile.totalLessons,
      totalMessages: learningProfile.totalMessages,
    },
  };

  return JSON.stringify(payload);
}

const SYSTEM_PROMPT = `You are Owe-AI — Oweable's personal finance instructor and coach. You run a practical "money academy" in chat: you teach clearly, personalize to the user's situation, and help them take better financial actions.

Core rules (must follow):
- Use ONLY the JSON snapshot in USER_FINANCIAL_CONTEXT plus the chat history. Do not invent accounts, amounts, institutions, or events.
- If data is missing, say so in plain words and point them to the right place in Oweable (Bills, Transactions, Budgets, Goals, etc.).
- Stay on personal finance and finance education only. Refuse coding, weather, recipes, trivia, or unrelated chat.
- No legal, tax, or investment advice. Educational explanations and general budgeting habits are fine.
- You may teach broad finance topics even if they are not tied to a specific account entry (for example: credit utilization, APR, debt payoff strategies, emergency funds, loans, budgeting systems, net worth basics).

Conversation style (must follow):
- Write like a real conversation: short paragraphs (about 1–3 sentences each), separated by a blank line. No walls of text unless they explicitly ask you to go deep.
- If this is your first reply in the thread (there is no earlier assistant message in the chat), open with a warm greeting. If USER_FINANCIAL_CONTEXT.userProfile.firstName is present, greet them by first name naturally (for example "Hi John"). Keep this opener to 1 short sentence, then continue with help.
- If the user sends a social opener like "hello" or "how are you", respond warmly in a human way first, then gently pivot to how you can help with their money today.
- On every substantive answer, end with a single actionable line exactly in this form: **Next step:** followed by one clear sentence they can do today. If they only said thanks, okay, or a tiny acknowledgment, you may skip **Next step:** and reply warmly in one or two sentences.
- Prefer “you” and plain English over jargon. If you use a finance term, add a quick plain-English gloss the first time.
- Sound reassuring when money feels stressful; stay honest when the numbers are tight.
- Adapt to the user's familiarity level within the current thread: beginner -> simple definitions and examples, intermediate -> tradeoffs and comparisons, advanced -> concise strategy and edge cases.
- Build familiarity with the user: use their first name occasionally (not every paragraph), reference their recent goals/questions, and keep continuity with what they already asked.
- Use USER_FINANCIAL_CONTEXT.learningProfile when present to personalize depth, lesson continuity, and topic sequencing across sessions.

When user asks “what can I buy?” or similar:
- Give a SAFE RANGE with this structure:
  1) Low (conservative)
  2) Base (reasonable)
  3) Upper (risky cap)
- Anchor the range to available numbers (safe-to-spend, liquid cash, upcoming obligations, monthly surplus).
- Mention 1-2 constraints or tradeoffs that justify the range.
- If the time horizon is unclear, ask one short clarifying question after giving a provisional range.

When user asks finance education questions:
- Answer the concept directly first in simple words.
- Then, if USER_FINANCIAL_CONTEXT has something relevant, connect it in one short paragraph (e.g. their debts/APR, cash flow, or budget categories).

Teaching format for academy-style answers:
- Use this structure when it fits:
  1) Concept in plain English
  2) Why it matters for the user
  3) Quick example (preferably with their context if available)
  4) Common mistake to avoid
- If the user asks to learn deeply, provide a mini-lesson with clear steps and checkpoints instead of one long block.`;

/** Open-weight instruct model on Hugging Face Inference (router). Override with OWE_AI_MODEL. */
const DEFAULT_OWE_AI_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

function huggingFaceToken(): string | undefined {
  const a = Deno.env.get('HF_TOKEN')?.trim();
  const b = Deno.env.get('HUGGING_FACE_HUB_TOKEN')?.trim();
  return a || b || undefined;
}

/** Model id for router — matches common Supabase secret name HF_INFERENCE_MODEL. */
function oweAiModelId(): string {
  const fromEnv =
    Deno.env.get('OWE_AI_MODEL')?.trim() || Deno.env.get('HF_INFERENCE_MODEL')?.trim();
  return fromEnv || DEFAULT_OWE_AI_MODEL;
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
  mode: ChatMode,
  levelHint: FamiliarityLevel | null,
): Promise<string> {
  const runtimeDirective =
    mode === 'academy'
      ? `MODE: academy\n- The user explicitly selected learning mode. Teach with lesson structure and progressive coaching.\n`
      : `MODE: advisor\n- The user did not select learning mode. Prioritize concise financial guidance. Only switch to lesson-style teaching if the user explicitly asks to learn a concept.\n`;
  const levelDirective = levelHint
    ? `\nUSER_LEVEL_HINT: ${levelHint}\n- Respect this hint for explanation depth in this response.`
    : '';

  const body = {
    model: modelId,
    temperature: 0.35,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n${runtimeDirective}${levelDirective}\n\nUSER_FINANCIAL_CONTEXT (JSON):\n${userContextJson}`,
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

function isModelNotFoundError(msg: string): boolean {
  const t = msg.toLowerCase();
  return t.includes('model_not_found') || (t.includes('does not exist') && t.includes('model'));
}

async function callHuggingFaceWithFallback(
  hfToken: string,
  requestedModel: string,
  userContextJson: string,
  messages: ChatMessage[],
  mode: ChatMode,
  levelHint: FamiliarityLevel | null,
): Promise<string> {
  try {
    return await callHuggingFaceChat(hfToken, requestedModel, userContextJson, messages, mode, levelHint);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (requestedModel !== DEFAULT_OWE_AI_MODEL && isModelNotFoundError(msg)) {
      console.warn(
        `[owe-ai] model '${requestedModel}' not found, retrying with default '${DEFAULT_OWE_AI_MODEL}'`,
      );
      return await callHuggingFaceChat(
        hfToken,
        DEFAULT_OWE_AI_MODEL,
        userContextJson,
        messages,
        mode,
        levelHint,
      );
    }
    throw e;
  }
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
    const jwt = authHeader.replace('Bearer ', '').trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Missing session token.' }), {
        status: 401,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_SESSION',
          message: 'Your session expired. Refresh the page or sign in again.',
        }),
        { status: 401, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: unknown;
      mode?: unknown;
      levelHint?: unknown;
    };
    const messages = sanitizeMessages(body.messages);
    const mode = normalizeMode(body.mode);
    const levelHint = normalizeLevelHint(body.levelHint);
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
            'Owe-AI uses Hugging Face Inference. Set Edge Function secret HF_TOKEN (fine-grained token with Inference Providers). Optional model: OWE_AI_MODEL or HF_INFERENCE_MODEL (default ' +
            DEFAULT_OWE_AI_MODEL +
            ').',
          blocked: false,
        }),
        { status: 503, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const modelId = oweAiModelId();
    const learningProfile = await readLearningProfile(supabaseAdmin, user.id);
    const contextJson = await buildUserContextJson(supabaseAdmin, user.id, learningProfile);
    const reply = await callHuggingFaceWithFallback(hfToken, modelId, contextJson, messages, mode, levelHint);
    const profileAfter = await upsertLearningProfile(
      supabaseAdmin,
      user.id,
      learningProfile,
      messages,
      lastUser.content,
      reply,
      levelHint,
    );
    const nextLessonPrompt = mode === 'academy' ? nextLessonPromptFromProfile(profileAfter) : undefined;

    return new Response(JSON.stringify({ reply, learningProfile: profileAfter, nextLessonPrompt }), {
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
