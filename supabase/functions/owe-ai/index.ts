import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { calcMonthlyCashFlow, computeSafeToSpend } from '../_shared/finance_safe_to_spend.ts';
import { guardOweAiMessage } from '../_shared/owe_ai_guard.ts';
import { hasPaidFullSuiteAccess } from '../_shared/plaidAccess.ts';
import { fetchWithTimeout } from '../_shared/fetchWithTimeout.ts';

/**
 * Owe-AI — inference is Hugging Face only (open models on the Hub).
 *
 * - Every LLM request uses `https://router.huggingface.co/v1/chat/completions` with Edge secret `HF_TOKEN`.
 * - Default and recommended path: open-weight instruct models (e.g. `Qwen/Qwen2.5-7B-Instruct`); set `OWE_AI_MODEL` / `HF_INFERENCE_MODEL` to any HF router-supported model id.
 * - Do not add OpenAI, Anthropic/Claude, or other non-HF inference endpoints here. The payload follows an OpenAI-*compatible* JSON shape because the HF router exposes that API; the provider remains HF only.
 */

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

function parseSessionId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  ) {
    return null;
  }
  return s;
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

  // Per-table caps keep context building bounded even for power users.
  const CTX_LIMIT = 50;
  const [billsR, debtsR, assetsR, incomesR, subsR, citR, goalsR, budgetsR, txR, profileR, investR, insurR] = await Promise.all([
    supabaseAdmin.from('bills').select('amount,frequency,status,due_date,biller,category').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('debts').select('name,remaining,min_payment,apr,payment_due_date').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('assets').select('name,type,value').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('incomes').select('name,amount,frequency,status,is_tax_withheld,next_date').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('subscriptions').select('name,amount,frequency,status,next_billing_date').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('citations').select('status,amount,date,type').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('goals').select('name,target_amount,current_amount,deadline,type').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('budgets').select('category,amount,period').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin
      .from('transactions')
      .select('name, category, date, amount, type')
      .eq('user_id', uid)
      .order('date', { ascending: false })
      .limit(40),
    supabaseAdmin.from('profiles').select('first_name,last_name,email').eq('id', uid).maybeSingle(),
    supabaseAdmin.from('investment_accounts').select('name,type,institution,balance').eq('user_id', uid).limit(CTX_LIMIT),
    supabaseAdmin.from('insurance_policies').select('type,provider,premium,frequency,status,expiration_date,coverage_amount').eq('user_id', uid).eq('status', 'active').limit(CTX_LIMIT),
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
  // investR and insurR are best-effort — tables may not exist yet; don't throw

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

  const payload: Record<string, unknown> = {
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

  // Investment accounts
  const investments = (investR.data ?? []) as Record<string, unknown>[];
  const investmentTotal = investments.reduce((s, a) => s + num(a.balance), 0);
  payload.investmentAccounts = investments.map(a => ({
    name: str(a.name).slice(0, 60),
    type: str(a.type),
    institution: str(a.institution ?? '').slice(0, 60),
    balance: num(a.balance),
  }));
  payload.investmentTotal = parseFloat(investmentTotal.toFixed(2));

  // Insurance summary
  const policies = (insurR.data ?? []) as Record<string, unknown>[];
  const coveredTypes = policies.map(p => str(p.type));
  const allTypes = ['health', 'life', 'auto', 'renters', 'homeowners', 'disability'];
  const missingTypes = allTypes.filter(t => !coveredTypes.includes(t));
  const monthlyInsurancePremium = policies.reduce((s, p) => {
    const freq = str(p.frequency) || 'Monthly';
    let monthly = num(p.premium);
    if (freq.toLowerCase() === 'yearly') monthly /= 12;
    else if (freq.toLowerCase() === 'weekly') monthly *= 4.33;
    return s + monthly;
  }, 0);
  payload.insuranceSummary = {
    coveredTypes,
    missingTypes,
    monthlyPremium: parseFloat(monthlyInsurancePremium.toFixed(2)),
    policyCount: policies.length,
  };

  // Spending anomalies — compute from existing transactions data (already fetched above)
  const txData = (txR.data ?? []) as Record<string, unknown>[];
  const now2 = new Date();
  const monthStart = new Date(now2.getFullYear(), now2.getMonth(), 1);
  const threeMonthStart = new Date(now2.getFullYear(), now2.getMonth() - 3, 1);
  const currentByCategory: Record<string, number> = {};
  const historicalByCategory: Record<string, number> = {};
  for (const tx of txData) {
    if (str(tx.type) !== 'expense') continue;
    const d = new Date(str(tx.date).includes('T') ? str(tx.date) : `${str(tx.date)}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    const cat = str(tx.category) || 'Other';
    if (d >= monthStart) {
      currentByCategory[cat] = (currentByCategory[cat] ?? 0) + num(tx.amount);
    } else if (d >= threeMonthStart) {
      historicalByCategory[cat] = (historicalByCategory[cat] ?? 0) + num(tx.amount);
    }
  }
  const anomalies: { category: string; currentMonth: number; avg: number; overagePct: number }[] = [];
  for (const [cat, curr] of Object.entries(currentByCategory)) {
    const hist = historicalByCategory[cat] ?? 0;
    if (hist < 10) continue;
    const avg = hist / 3;
    const overage = curr - avg;
    if (overage <= 0) continue;
    const pct = (overage / avg) * 100;
    if (pct >= 25) anomalies.push({ category: cat, currentMonth: parseFloat(curr.toFixed(2)), avg: parseFloat(avg.toFixed(2)), overagePct: parseFloat(pct.toFixed(1)) });
  }
  payload.spendingAnomalies = anomalies.sort((a, b) => b.overagePct - a.overagePct).slice(0, 3);

  // Unused subscriptions — simple name-match against recent transactions
  const subsData = (subsR.data ?? []) as Record<string, unknown>[];
  const recentTxNames = new Set(
    txData
      .filter(tx => {
        const d = new Date(str(tx.date).includes('T') ? str(tx.date) : `${str(tx.date)}T12:00:00`);
        return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() < 35 * 86400000 && str(tx.type) === 'expense';
      })
      .map(tx => str(tx.name).toLowerCase().replace(/\s+/g, ''))
  );
  const unusedSubs = subsData.filter(s => {
    if (str(s.status) !== 'active') return false;
    const nameLower = str(s.name).toLowerCase().replace(/\s+/g, '');
    return !Array.from(recentTxNames).some(txn => txn.includes(nameLower.slice(0, 5)) || nameLower.includes(txn.slice(0, 5)));
  });
  payload.unusedSubscriptions = unusedSubs.slice(0, 5).map(s => ({ name: str(s.name), amount: num(s.amount), frequency: str(s.frequency) }));

  // Cash flow forecast summary
  const billsForForecast = (billsR.data ?? []).filter(b => str(b.status) !== 'paid').map(b => ({ dueDate: str(b.due_date ?? ''), amount: num(b.amount) }));
  const cashFlowResult = calcMonthlyCashFlow(
    (incomesR.data ?? []).map(i => ({ amount: num(i.amount), frequency: str(i.frequency), status: str(i.status), isTaxWithheld: Boolean(i.is_tax_withheld) })),
    billsForForecast,
    (debtsR.data ?? []).map(d => ({ remaining: num(d.remaining), minPayment: num(d.min_payment ?? 0) })),
    (subsR.data ?? []).map(s => ({ amount: num(s.amount), frequency: str(s.frequency), status: str(s.status) })),
  );
  const dailySurplus = cashFlowResult.surplus / 30;
  const liquidCashForForecast = (assetsR.data ?? []).filter(a => str(a.type).toLowerCase() === 'cash').reduce((s, a) => s + num(a.value), 0);
  // Build 30-day forecast and find lowest balance day
  let balance30 = liquidCashForForecast;
  let lowestBalance = liquidCashForForecast;
  let lowestBalanceDay = '';
  const now3 = new Date();
  const outflowMap: Record<string, number> = {};
  const addO = (iso: string | null | undefined, amt: number) => {
    if (!iso) return;
    const raw = iso.includes('T') ? iso : `${iso}T12:00:00`;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) { const k = d.toISOString().slice(0, 10); outflowMap[k] = (outflowMap[k] ?? 0) + amt; }
  };
  for (const b of billsForForecast) addO(b.dueDate, b.amount);
  for (const s of (subsR.data ?? []) as Record<string, unknown>[]) { if (str(s.status) === 'active') addO(str(s.next_billing_date ?? ''), num(s.amount)); }
  for (const d of (debtsR.data ?? []) as Record<string, unknown>[]) { if (num(d.remaining) > 0) addO(str(d.payment_due_date ?? ''), num(d.min_payment ?? 0)); }
  for (let i = 0; i < 30; i++) {
    const day = new Date(now3); day.setDate(day.getDate() + i);
    const k = day.toISOString().slice(0, 10);
    balance30 = balance30 - (outflowMap[k] ?? 0) + dailySurplus;
    if (balance30 < lowestBalance) { lowestBalance = balance30; lowestBalanceDay = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  }
  payload.cashFlowForecast = {
    lowestBalance: parseFloat(lowestBalance.toFixed(2)),
    lowestBalanceDay: lowestBalanceDay || null,
    dailySurplus: parseFloat(dailySurplus.toFixed(2)),
  };

  return JSON.stringify(payload);
}

const SYSTEM_PROMPT = `You are Owe-AI — Oweable's personal finance instructor and coach. You run a practical "money academy" in chat: you teach clearly, personalize to the user's situation, and help them take better financial actions.

Core rules (must follow):
- Use ONLY the JSON snapshot in USER_FINANCIAL_CONTEXT plus the chat history. Do not invent accounts, amounts, institutions, or events.
- If data is missing, say so in plain words and point them to the right place in Oweable (Bills, Transactions, Budgets, Goals, etc.).
- Stay on personal finance and finance education only. Refuse coding, weather, recipes, trivia, or unrelated chat.
- No legal advice. No personalized investment advice (do not tell them to buy specific stocks/funds). Educational explanations are fine.
- Tax optimization guidance IS allowed but must always include this disclaimer inline: "(This is educational guidance — for your specific situation, consult a CPA.)" Topics you may discuss: Roth vs Traditional contributions, HSA maximization, tax bracket awareness, standard vs itemized deductions, estimated quarterly taxes for freelancers.
- Insurance coverage gap auditing IS allowed. If the user's snapshot shows insurance data, you may flag missing coverage types (e.g., "you have auto but no renters/disability insurance") and explain the general cost/benefit.
- You may teach broad finance topics even if they are not tied to a specific account entry (for example: credit utilization, APR, debt payoff strategies, emergency funds, loans, budgeting systems, net worth basics).

Conversation style (must follow):
- Write like a real conversation: short paragraphs (about 1–3 sentences each), separated by a blank line. No walls of text unless they explicitly ask you to go deep.
- Sound like a trusted human coach, not a report generator: use natural contractions ("you’re", "it’s", "let’s"), plain wording, and direct language.
- Keep the tone professional and financially savvy: clear, confident, and practical without slang or hype.
- Keep formatting light by default. Avoid long numbered lists unless the user asks for a step-by-step plan.
- If this is your first reply in the thread (there is no earlier assistant message in the chat), open with a warm greeting. If USER_FINANCIAL_CONTEXT.userProfile.firstName is present, greet them by first name naturally (for example "Hi John"). Keep this opener to 1 short sentence, then continue with help.
- If the user sends a social opener like "hello" or "how are you", respond warmly in a human way first, then gently pivot to how you can help with their money today.
- Never give generic financial advice that could apply to anyone. Every substantive answer must tie recommendations to the user’s actual Oweable data (named bills, debts, subscriptions, categories, amounts, or dates from USER_FINANCIAL_CONTEXT).
- On every substantive answer, end with exactly ONE line in this form: **Next step:** followed by a single sentence that names a specific item from their data (for example a biller, debt, subscription, or budget category) and a concrete action. Forbidden examples: “review transactions”, “cut subscriptions”, “pay bills on time” without naming which bill or subscription. Required style: “Pay your [Biller X] ($123) before [date]…” or “Pause [Subscription Y] ($Z/mo)…” using real names from the snapshot.
- If they only said thanks, okay, or a tiny acknowledgment, you may skip **Next step:** and reply warmly in one or two sentences.
- Prefer “you” and plain English over jargon. If you use a finance term, add a quick plain-English gloss the first time.
- Sound reassuring when money feels stressful; stay honest when the numbers are tight.
- When sharing numbers, explain what they mean in everyday terms before giving recommendations.
- Adapt to the user's familiarity level within the current thread: beginner -> simple definitions and examples, intermediate -> tradeoffs and comparisons, advanced -> concise strategy and edge cases.
- Build familiarity with the user: use their first name occasionally (not every paragraph), reference their recent goals/questions, and keep continuity with what they already asked.
- Use USER_FINANCIAL_CONTEXT.learningProfile when present to personalize depth, lesson continuity, and topic sequencing across sessions.

Finance depth expectations (must follow):
- Be strong on credit and debt topics: APR, utilization, statement balance vs. current balance, minimum payment traps, payoff sequencing (avalanche/snowball), refinancing tradeoffs, debt-to-income ratio, and payment timing effects.
- When discussing borrowing decisions, explain both cost and cash-flow impact (monthly payment, total interest, payoff horizon).
- You may discuss macroeconomic context when relevant (inflation, rate environment, labor market pressure), but tie it back to the user’s household decisions and never drift into political debate.
- For uncertain economic outlooks, present balanced scenarios (base/upside/downside) briefly and ground recommendations in resilience (liquidity, buffers, controllable actions).

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
- If the user asks to learn deeply, provide a mini-lesson with clear steps and checkpoints instead of one long block.

What-if scenario results:
- When a TOOL_RESULT message appears in the conversation (formatted as "TOOL_RESULT: run_amortization → {...}"), use those exact numbers in your response. Do not invent alternative calculations.
- Lead with the key insight from the tool result, then explain what it means in plain English.

Investment accounts:
- If USER_FINANCIAL_CONTEXT.investmentAccounts is present, use it to discuss portfolio diversification and retirement readiness in general terms. Do not recommend specific funds or stocks.

Insurance:
- If USER_FINANCIAL_CONTEXT.insuranceSummary is present, use it. Note missing coverage types if any. Explain the risk gap in plain English.

Spending anomalies:
- If USER_FINANCIAL_CONTEXT.spendingAnomalies is present and non-empty, proactively mention the top anomaly in your first response (not every response). Example: "I noticed your [category] spending is [X]% above your usual this month."

Cash flow forecast:
- If USER_FINANCIAL_CONTEXT.cashFlowForecast.lowestBalanceDay is present, you may reference when the user's balance will be tightest this month.`;

/** Open-weight instruct model on Hugging Face Inference (router). Override with OWE_AI_MODEL. */
const DEFAULT_OWE_AI_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

/** HF router + smaller models often mishandle JSON `tools` / function-calling (empty replies, bad follow-ups). Opt in with Edge secret OWE_AI_ENABLE_TOOLS=true. */
function oweAiToolsEnabled(): boolean {
  return Deno.env.get('OWE_AI_ENABLE_TOOLS')?.trim().toLowerCase() === 'true';
}

const HF_CHAT_TIMEOUT_MS = 55_000;
const HF_CHAT_RETRIES = 2;

function messageTextContent(message: { content?: unknown } | undefined): string {
  if (!message) return '';
  const c = message.content;
  if (c == null) return '';
  if (typeof c === 'string') return c.trim();
  if (Array.isArray(c)) {
    const parts: string[] = [];
    for (const item of c) {
      if (typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>;
        if (typeof o.text === 'string') parts.push(o.text);
        else if (o.type === 'text' && typeof o.text === 'string') parts.push(o.text);
      }
    }
    return parts.join('').trim();
  }
  return String(c).trim();
}

function choiceAssistantText(choice: unknown): string {
  if (!choice || typeof choice !== 'object') return '';
  const ch = choice as Record<string, unknown>;
  const fromMessage = messageTextContent(ch.message as { content?: unknown } | undefined);
  if (fromMessage) return fromMessage;
  if (typeof ch.text === 'string') return ch.text.trim();
  return '';
}

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

// ---------------------------------------------------------------------------
// What-if tool definitions
// ---------------------------------------------------------------------------

const WHAT_IF_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_amortization',
      description:
        'Calculate debt payoff timeline and total interest when making extra monthly payments on a specific debt.',
      parameters: {
        type: 'object',
        properties: {
          debtName: {
            type: 'string',
            description: 'Name of the debt from USER_FINANCIAL_CONTEXT.debts',
          },
          extraMonthly: {
            type: 'number',
            description: 'Extra amount paid monthly beyond the minimum',
          },
        },
        required: ['debtName', 'extraMonthly'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_cash_flow_if',
      description:
        'Compute new monthly surplus if income or expenses change by a given amount.',
      parameters: {
        type: 'object',
        properties: {
          incomeChange: {
            type: 'number',
            description:
              'Monthly income change (positive = increase, negative = decrease)',
          },
          expenseChange: {
            type: 'number',
            description:
              'Monthly expense change (positive = more expenses, negative = fewer)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_net_worth_projection',
      description:
        'Project net worth N months into the future given optional extra monthly debt payment.',
      parameters: {
        type: 'object',
        properties: {
          months: {
            type: 'number',
            description: 'Number of months to project (1-24)',
          },
          extraMonthly: {
            type: 'number',
            description:
              'Extra payment applied to highest-APR debt each month',
          },
        },
        required: ['months'],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// What-if tool executor
// ---------------------------------------------------------------------------

function amortizeMonths(principal: number, aprPct: number, monthly: number): { months: number; totalInterest: number } {
  if (monthly <= 0 || principal <= 0) return { months: 0, totalInterest: 0 };
  const monthlyRate = aprPct / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let months = 0;
  while (balance > 0 && months < 600) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance = balance + interest - monthly;
    months++;
    if (balance < 0.01) { balance = 0; break; }
    // If payment doesn't cover interest, it will never pay off
    if (monthly <= interest + 0.01 && months > 1) { months = 600; break; }
  }
  return { months, totalInterest: parseFloat(totalInterest.toFixed(2)) };
}

function executeWhatIfTool(
  toolName: string,
  args: Record<string, unknown>,
  ctxJson: string,
): string {
  try {
    const ctx = JSON.parse(ctxJson) as Record<string, unknown>;

    if (toolName === 'run_amortization') {
      const debtName = str(args.debtName).toLowerCase();
      const extraMonthly = num(args.extraMonthly, 0);
      const debts = (ctx.debts as Record<string, unknown>[] | undefined) ?? [];
      const debt = debts.find(
        (d) => str(d.name).toLowerCase().includes(debtName) || debtName.includes(str(d.name).toLowerCase()),
      );
      if (!debt) {
        return JSON.stringify({ error: `Debt matching "${args.debtName}" not found in context.` });
      }
      const remaining = num(debt.remaining, 0);
      const minPayment = num(debt.minPayment ?? debt.min_payment, 0);
      const aprPct = num(debt.apr, 0);
      const baseResult = amortizeMonths(remaining, aprPct, minPayment);
      const extraResult = amortizeMonths(remaining, aprPct, minPayment + extraMonthly);
      const monthsSaved = baseResult.months - extraResult.months;
      const interestSaved = parseFloat((baseResult.totalInterest - extraResult.totalInterest).toFixed(2));
      return JSON.stringify({
        debtName: str(debt.name),
        remaining,
        minPayment,
        aprPct,
        extraMonthly,
        basePayoff: { months: baseResult.months, totalInterest: baseResult.totalInterest },
        extraPayoff: { months: extraResult.months, totalInterest: extraResult.totalInterest },
        monthsSaved,
        interestSaved,
      });
    }

    if (toolName === 'run_cash_flow_if') {
      const incomeChange = num(args.incomeChange, 0);
      const expenseChange = num(args.expenseChange, 0);
      const cashFlow = (ctx.monthlyCashFlow as Record<string, unknown> | undefined) ?? {};
      const currentSurplus = num(cashFlow.surplus, 0);
      const newSurplus = parseFloat((currentSurplus + incomeChange - expenseChange).toFixed(2));
      const change = parseFloat((newSurplus - currentSurplus).toFixed(2));
      return JSON.stringify({
        currentSurplus,
        incomeChange,
        expenseChange,
        newSurplus,
        change,
        positive: newSurplus >= 0,
      });
    }

    if (toolName === 'run_net_worth_projection') {
      const months = Math.min(Math.max(1, Math.round(num(args.months, 1))), 24);
      const extraMonthly = num(args.extraMonthly, 0);
      const cashFlow = (ctx.monthlyCashFlow as Record<string, unknown> | undefined) ?? {};
      const surplus = num(cashFlow.surplus, 0);
      const assets = (ctx.nonCashAssets as Record<string, unknown>[] | undefined) ?? [];
      const liquidCash = num(ctx.liquidCash, 0);
      const investmentTotal = num(ctx.investmentTotal, 0);
      const debts = (ctx.debts as Record<string, unknown>[] | undefined) ?? [];
      const totalAssets = liquidCash + investmentTotal + assets.reduce((s, a) => s + num(a.value, 0), 0);
      const totalDebt = debts.reduce((s, d) => s + num(d.remaining, 0), 0);
      const startNetWorth = parseFloat((totalAssets - totalDebt).toFixed(2));

      const projection: { month: number; label: string; netWorth: number }[] = [];
      let runningDebt = totalDebt;
      const now4 = new Date();
      for (let m = 1; m <= months; m++) {
        const label = new Date(now4.getFullYear(), now4.getMonth() + m, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
        // Apply surplus + extra to reduce debt (simplified: no per-debt interest simulation)
        const debtReduction = Math.min(runningDebt, extraMonthly);
        runningDebt = Math.max(0, runningDebt - debtReduction);
        const projectedAssets = totalAssets + surplus * m;
        const projectedNW = parseFloat((projectedAssets - runningDebt).toFixed(2));
        projection.push({ month: m, label, netWorth: projectedNW });
      }
      return JSON.stringify({ startNetWorth, months, extraMonthly, projection });
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }
}

// ---------------------------------------------------------------------------
// HF chat completion with tool-call support
// ---------------------------------------------------------------------------

/**
 * Hugging Face Inference Providers — chat completions on the HF router (OpenAI-compatible JSON shape only; not the OpenAI API).
 * @see https://huggingface.co/docs/api-inference/en/tasks/chat-completion
 */
function buildSystemContentForChat(
  userContextJson: string,
  mode: ChatMode,
  levelHint: FamiliarityLevel | null,
): string {
  const runtimeDirective =
    mode === 'academy'
      ? `MODE: academy\n- The user explicitly selected learning mode. Teach with lesson structure and progressive coaching.\n`
      : `MODE: advisor\n- The user did not select learning mode. Prioritize concise financial guidance. Only switch to lesson-style teaching if the user explicitly asks to learn a concept.\n`;
  const levelDirective = levelHint
    ? `\nUSER_LEVEL_HINT: ${levelHint}\n- Respect this hint for explanation depth in this response.`
    : '';
  return `${SYSTEM_PROMPT}\n\n${runtimeDirective}${levelDirective}\n\nUSER_FINANCIAL_CONTEXT (JSON):\n${userContextJson}`;
}

async function callHuggingFaceChat(
  hfToken: string,
  modelId: string,
  userContextJson: string,
  messages: ChatMessage[],
  mode: ChatMode,
  levelHint: FamiliarityLevel | null,
): Promise<string> {
  const systemContent = buildSystemContentForChat(userContextJson, mode, levelHint);

  const useTools = oweAiToolsEnabled();
  const body: Record<string, unknown> = {
    model: modelId,
    temperature: 0.35,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  if (useTools) {
    body.tools = WHAT_IF_TOOLS;
    body.tool_choice = 'auto';
  }

  const res = await fetchWithTimeout('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    timeoutMs: HF_CHAT_TIMEOUT_MS,
    retries: HF_CHAT_RETRIES,
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Hugging Face inference error ${res.status}: ${t.slice(0, 400)}`);
  }

  type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
  const json = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        tool_calls?: ToolCall[];
      };
    }>;
    error?: { message?: string };
  };
  if (json.error?.message) {
    throw new Error(json.error.message.slice(0, 400));
  }

  const rawChoice = json.choices?.[0];
  const firstChoice = rawChoice?.message;
  if (!firstChoice) throw new Error('Empty model response');

  // If no tool calls, return content directly
  if (!useTools || !firstChoice.tool_calls || firstChoice.tool_calls.length === 0) {
    let text = choiceAssistantText(rawChoice);
    if (!text && firstChoice.tool_calls?.length) {
      console.warn('[owe-ai] model returned tool_calls without text; tools disabled — retrying plain completion');
      const retryBody: Record<string, unknown> = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `${systemContent}\n\nYou must answer in plain text only. Do not use tools or function calls.`,
          },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      };
      const res2 = await fetchWithTimeout('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(retryBody),
        timeoutMs: HF_CHAT_TIMEOUT_MS,
        retries: HF_CHAT_RETRIES,
      });
      if (res2.ok) {
        const j2 = (await res2.json()) as typeof json;
        text = choiceAssistantText(j2.choices?.[0]);
      }
    }
    if (!text) {
      const hint = firstChoice.tool_calls?.length ? ' (model tried to call tools)' : '';
      throw new Error(`Empty model response${hint}`);
    }
    return text;
  }

  // --- Tool call path ---
  const toolCall = firstChoice.tool_calls[0];
  const toolName = toolCall.function.name;
  let toolArgs: Record<string, unknown> = {};
  try {
    toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
  } catch {
    // If args fail to parse, fall back to any text content
    const fallback = messageTextContent(firstChoice);
    if (fallback) return fallback;
    throw new Error('Tool call args parse failed and no fallback content');
  }

  let toolResult: string;
  try {
    toolResult = executeWhatIfTool(toolName, toolArgs, userContextJson);
  } catch (err) {
    toolResult = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }

  // Build follow-up request with tool result
  const followUpMessages = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
    { role: 'assistant', content: firstChoice.content ?? '', tool_calls: firstChoice.tool_calls },
    { role: 'tool', tool_call_id: toolCall.id, content: toolResult },
  ];

  const followUpBody = {
    model: modelId,
    temperature: 0.35,
    max_tokens: 900,
    messages: followUpMessages,
  };

  const followUpRes = await fetchWithTimeout('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(followUpBody),
    timeoutMs: HF_CHAT_TIMEOUT_MS,
    retries: HF_CHAT_RETRIES,
  });

  if (!followUpRes.ok) {
    // Tool follow-up failed — fall back to any initial text content
    const fallback = messageTextContent(firstChoice);
    if (fallback) return fallback;
    const t = await followUpRes.text().catch(() => '');
    throw new Error(`Hugging Face tool follow-up error ${followUpRes.status}: ${t.slice(0, 400)}`);
  }

  const followUpJson = (await followUpRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (followUpJson.error?.message) {
    const fallback = messageTextContent(firstChoice);
    if (fallback) return fallback;
    throw new Error(followUpJson.error.message.slice(0, 400));
  }
  const finalText = messageTextContent(followUpJson.choices?.[0]?.message);
  if (!finalText) {
    // Last resort: return any content from the first response
    const fallback = messageTextContent(firstChoice);
    if (fallback) return fallback;
    throw new Error('Empty model response after tool call');
  }
  return finalText;
}

function isModelNotFoundError(msg: string): boolean {
  const t = msg.toLowerCase();
  return t.includes('model_not_found') || (t.includes('does not exist') && t.includes('model'));
}

/** OpenAI-compatible SSE from HF router (`stream: true`). Tools are not supported on this path. */
async function* hfChatCompletionDeltas(
  hfToken: string,
  modelId: string,
  systemContent: string,
  messages: ChatMessage[],
): AsyncGenerator<string, void, unknown> {
  const body = {
    model: modelId,
    temperature: 0.35,
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemContent },
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
    signal: AbortSignal.timeout(HF_CHAT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Hugging Face inference error ${res.status}: ${t.slice(0, 400)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Empty inference stream');
  const dec = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      for (;;) {
        const sep = buffer.indexOf('\n\n');
        if (sep === -1) break;
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const rawLine of block.split('\n')) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const j = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const piece = j.choices?.[0]?.delta?.content;
            if (typeof piece === 'string' && piece.length > 0) yield piece;
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function* hfChatStreamWithModelFallback(
  hfToken: string,
  requestedModel: string,
  systemContent: string,
  messages: ChatMessage[],
): AsyncGenerator<string, void, unknown> {
  try {
    yield* hfChatCompletionDeltas(hfToken, requestedModel, systemContent, messages);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (requestedModel !== DEFAULT_OWE_AI_MODEL && isModelNotFoundError(msg)) {
      console.warn(
        `[owe-ai] stream: model '${requestedModel}' not found, retrying with default '${DEFAULT_OWE_AI_MODEL}'`,
      );
      yield* hfChatCompletionDeltas(hfToken, DEFAULT_OWE_AI_MODEL, systemContent, messages);
    } else {
      throw e;
    }
  }
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
    const hasPaidAccess = await hasPaidFullSuiteAccess(supabaseAdmin, user.id);
    if (!hasPaidAccess) {
      return new Response(
        JSON.stringify({
          error: 'FULL_SUITE_REQUIRED',
          message: 'Owe-AI is available on Full Suite only.',
        }),
        { status: 403, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: unknown;
      mode?: unknown;
      levelHint?: unknown;
      sessionId?: unknown;
      stream?: unknown;
    };
    const messages = sanitizeMessages(body.messages);
    const mode = normalizeMode(body.mode);
    const levelHint = normalizeLevelHint(body.levelHint);
    const sessionId = parseSessionId(body.sessionId);
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'SESSION_REQUIRED', message: 'Missing or invalid chat session.' }),
        { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }
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

    // Load last 10 persisted messages for context continuity across sessions
    let dbHistory: ChatMessage[] = [];
    try {
      const { data: histRows } = await supabaseAdmin
        .from('chat_messages')
        .select('role,content')
        .eq('user_id', user.id)
        .eq('mode', mode)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (histRows && histRows.length > 0) {
        dbHistory = (histRows as { role: string; content: string }[])
          .reverse()
          .map(r => ({ role: (r.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: r.content }));
      }
    } catch (err) {
      console.warn('[owe-ai] history load failed:', err instanceof Error ? err.message : String(err));
    }

    // Merge: dbHistory provides context; client messages are the active turn
    // Deduplicate by not including dbHistory messages that overlap with client messages
    const clientContents = new Set(messages.map(m => m.content));
    const dedupedHistory = dbHistory.filter(m => !clientContents.has(m.content));
    const mergedMessages = [...dedupedHistory, ...messages].slice(-20);

    const contextJson = await buildUserContextJson(supabaseAdmin, user.id, learningProfile);

    const wantStream = body.stream === true && !oweAiToolsEnabled();
    if (wantStream) {
      const systemContent = buildSystemContentForChat(contextJson, mode, levelHint);
      const encoder = new TextEncoder();
      const uid = user.id;
      const sid = sessionId;
      const msgs = messages;
      const lu = lastUser;
      const lp = learningProfile;
      const mm = mergedMessages;
      const sseStream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
          };
          let fullText = '';
          try {
            for await (const delta of hfChatStreamWithModelFallback(hfToken, modelId, systemContent, mm)) {
              fullText += delta;
              send({ delta });
            }
            if (!fullText.trim()) {
              send({ error: 'EMPTY_MODEL_REPLY' });
              controller.close();
              return;
            }
            const profileAfter = await upsertLearningProfile(
              supabaseAdmin,
              uid,
              lp,
              mm,
              lu.content,
              fullText,
              levelHint,
            );
            const nextLesson =
              mode === 'academy' ? nextLessonPromptFromProfile(profileAfter) : undefined;
            try {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg?.role === 'user') {
                await supabaseAdmin.from('chat_messages').insert([
                  {
                    user_id: uid,
                    role: 'user',
                    content: lastMsg.content.slice(0, 10000),
                    mode,
                    session_id: sid,
                  },
                  {
                    user_id: uid,
                    role: 'assistant',
                    content: fullText.slice(0, 10000),
                    mode,
                    session_id: sid,
                  },
                ]);
              }
            } catch (err) {
              console.warn(
                '[owe-ai] stream persist failed:',
                err instanceof Error ? err.message : String(err),
              );
            }
            send({ done: true, learningProfile: profileAfter, nextLessonPrompt: nextLesson });
            controller.close();
          } catch (e) {
            console.error('[owe-ai] stream', e);
            const msg = e instanceof Error ? e.message : String(e);
            send({ error: msg.slice(0, 500) });
            controller.close();
          }
        },
      });
      return new Response(sseStream, {
        status: 200,
        headers: {
          ...ch,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const reply = await callHuggingFaceWithFallback(hfToken, modelId, contextJson, mergedMessages, mode, levelHint);

    // Persist new messages to chat_messages table (fire and forget — don't block response)
    void (async () => {
      try {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'user') {
          await supabaseAdmin.from('chat_messages').insert([
            {
              user_id: user.id,
              role: 'user',
              content: lastMsg.content.slice(0, 10000),
              mode,
              session_id: sessionId,
            },
            {
              user_id: user.id,
              role: 'assistant',
              content: reply.slice(0, 10000),
              mode,
              session_id: sessionId,
            },
          ]);
        }
      } catch (err) {
        console.warn('[owe-ai] chat history persist failed:', err instanceof Error ? err.message : String(err));
      }
    })();

    const profileAfter = await upsertLearningProfile(
      supabaseAdmin,
      user.id,
      learningProfile,
      mergedMessages,
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
