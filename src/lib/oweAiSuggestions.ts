import type { Asset, Bill, Debt, FreelanceEntry } from '../store/useStore';
import type { OweAiMode } from './oweAi';

export type OweAiSuggestionContext = {
  overdueBillCount: number;
  hasDebts: boolean;
  taxPromptRelevant: boolean;
  lowRunwayHeuristic: boolean;
  hasFreelanceActivity: boolean;
};

export function buildOweAiSuggestionContext(
  bills: Bill[],
  debts: Debt[],
  assets: Asset[],
  freelanceEntries: FreelanceEntry[],
): OweAiSuggestionContext {
  const overdueBillCount = bills.filter((b) => b.status === 'overdue').length;
  const hasDebts = debts.some((d) => d.remaining > 0.01);
  const m = new Date().getMonth();
  const taxPromptRelevant = m <= 3 || m === 10 || m === 11;
  const cashTotal = assets
    .filter((a) => String(a.type).toLowerCase() === 'cash')
    .reduce((s, a) => s + a.value, 0);
  const unpaidBillTotal = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  const lowRunwayHeuristic =
    (cashTotal > 0 && cashTotal < 2000 && unpaidBillTotal > cashTotal * 0.4) ||
    (overdueBillCount > 0 && cashTotal < unpaidBillTotal);
  const hasFreelanceActivity = freelanceEntries.length > 0;
  return {
    overdueBillCount,
    hasDebts,
    taxPromptRelevant,
    lowRunwayHeuristic,
    hasFreelanceActivity,
  };
}

const ADVISOR_GENERIC = [
  'What can I comfortably spend this week?',
  'Walk me through APR like I’m new to this.',
  'Given my numbers, how would you tighten my budget?',
  'What bills are stressing my cash flow the most?',
  'How should I think about my emergency fund size?',
] as const;

const ACADEMY_GENERIC = [
  'Explain credit utilization in plain English.',
  'Teach me the difference between APR and interest rate.',
  'How do I build a simple budget I’ll actually follow?',
  'What’s the avalanche vs snowball way to pay off debt?',
  'How do quarterly estimated taxes work for freelancers?',
] as const;

/** Deterministic shuffle so the same seed yields stable picks for a short moment. */
function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = Math.max(1, Math.floor(seed)) % 2147483647;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickOweAiSuggestions(mode: OweAiMode, ctx: OweAiSuggestionContext, seed: number): string[] {
  const pool: string[] = [...(mode === 'academy' ? ACADEMY_GENERIC : ADVISOR_GENERIC)];

  if (mode === 'advisor') {
    if (ctx.overdueBillCount > 0) {
      pool.push('What should I pay first this week?', 'I have overdue bills — what’s the least-bad order to catch up?');
    }
    if (ctx.taxPromptRelevant) {
      pool.push('Am I on track with my quarterly taxes?', 'What should I set aside for taxes this quarter?');
    }
    if (ctx.hasDebts) {
      pool.push('Which debt should I attack next?', 'Should I pay extra on debt or build savings first — for my situation?');
    }
    if (ctx.lowRunwayHeuristic) {
      pool.push('How do I stretch my money this month?', 'My cash feels tight — what should I prioritize for the next 30 days?');
    }
    if (ctx.hasFreelanceActivity) {
      pool.push('How much of my freelance income should I treat as “not spendable” after taxes?');
    }
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const p of pool) {
    const k = p.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(p);
  }

  return shuffleWithSeed(unique, seed).slice(0, 3);
}
