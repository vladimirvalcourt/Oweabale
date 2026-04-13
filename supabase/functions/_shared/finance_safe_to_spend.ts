/**
 * Deno copy of safe-to-spend + monthly cash flow helpers from `src/lib/finance.ts`.
 * Keep logic aligned when changing formulas.
 */

export const TAX_RESERVE_RATE = 0.25;

export function normalizeToMonthly(amount: number, frequency: string): number {
  const f = (frequency || '').toLowerCase();
  if (f === 'weekly') return (amount || 0) * 4.33;
  if (f === 'bi-weekly' || f === 'biweekly') return (amount || 0) * 2.165;
  if (f === 'yearly' || f === 'annual' || f === 'annually') return (amount || 0) / 12;
  if (f === 'quarterly') return (amount || 0) / 3;
  return amount || 0;
}

export interface IncomeCfRow {
  amount: number;
  frequency: string;
  status: string;
  isTaxWithheld: boolean;
}

export interface BillCfRow {
  amount: number;
  frequency: string;
  status?: string;
}

export interface DebtCfRow {
  remaining: number;
  minPayment: number;
}

export interface SubCfRow {
  amount: number;
  frequency: string;
  status: string;
}

export interface CashFlowResult {
  monthlyIncome: number;
  taxReserve: number;
  fixedExpenses: number;
  subscriptions: number;
  surplus: number;
  disposableIncome: number;
}

export function calcMonthlyCashFlow(
  incomes: IncomeCfRow[],
  bills: BillCfRow[],
  debts: DebtCfRow[],
  subscriptions: SubCfRow[],
): CashFlowResult {
  const monthlyIncome = incomes.reduce((sum, inc) => {
    if (inc.status !== 'active') return sum;
    return sum + normalizeToMonthly(inc.amount, inc.frequency);
  }, 0);

  const taxReserve = incomes.reduce((sum, inc) => {
    if (inc.status !== 'active' || inc.isTaxWithheld) return sum;
    return sum + normalizeToMonthly(inc.amount, inc.frequency) * TAX_RESERVE_RATE;
  }, 0);

  const disposableIncome = monthlyIncome - taxReserve;
  const billsMonthly = bills.reduce((sum, bill) => {
    if (bill.status === 'paid') return sum;
    return sum + normalizeToMonthly(bill.amount, bill.frequency);
  }, 0);

  const debtMinPayments = debts.reduce((sum, d) => {
    if (d.remaining <= 0) return sum;
    return sum + (d.minPayment || 0);
  }, 0);

  const fixedExpenses = billsMonthly + debtMinPayments;

  const subsMonthly = subscriptions.reduce((sum, sub) => {
    if (sub.status !== 'active') return sum;
    return sum + normalizeToMonthly(sub.amount, sub.frequency);
  }, 0);

  const surplus = disposableIncome - fixedExpenses - subsMonthly;

  return {
    monthlyIncome: parseFloat(monthlyIncome.toFixed(2)),
    taxReserve: parseFloat(taxReserve.toFixed(2)),
    fixedExpenses: parseFloat(fixedExpenses.toFixed(2)),
    subscriptions: parseFloat(subsMonthly.toFixed(2)),
    surplus: parseFloat(surplus.toFixed(2)),
    disposableIncome: parseFloat(disposableIncome.toFixed(2)),
  };
}

function startOfDayUtc(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseDueMs(iso: string): number | null {
  if (!iso?.trim()) return null;
  const raw = iso.includes('T') ? iso : `${iso}T12:00:00`;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

export type SafeToSpendWindowMode = 'to_next_payday' | 'rest_of_month';

export interface SafeToSpendResult {
  dailySafeToSpend: number;
  liquidAfterScheduled: number;
  scheduledOutflowsTotal: number;
  daysInWindow: number;
  windowEndLabel: string;
  windowMode: SafeToSpendWindowMode;
  monthlySurplus: number;
}

export function computeSafeToSpend(args: {
  liquidCash: number;
  monthlySurplus: number;
  bills: Array<{ dueDate: string; amount: number; status?: string }>;
  incomes: Array<{ nextDate: string; status: string }>;
  subscriptions: Array<{ nextBillingDate: string; amount: number; status: string }>;
  debts: Array<{ minPayment: number; remaining: number; paymentDueDate?: string | null }>;
  citations: Array<{ status: string; daysLeft: number; amount: number }>;
  scheduleBaseMs?: number;
  now?: Date;
}): SafeToSpendResult {
  const now = args.now ?? new Date();
  const todayMs = startOfDayUtc(now);

  const activeIncomes = args.incomes.filter((i) => i.status === 'active' && i.nextDate?.trim());
  const futurePaydays = activeIncomes
    .map((i) => ({ ms: parseDueMs(i.nextDate)!, raw: i.nextDate }))
    .filter((x) => x.ms >= todayMs)
    .sort((a, b) => a.ms - b.ms);

  let windowEndMs: number;
  let windowMode: SafeToSpendWindowMode;
  let windowEndLabel: string;

  if (futurePaydays.length > 0) {
    windowEndMs = futurePaydays[0].ms;
    windowMode = 'to_next_payday';
    windowEndLabel = new Date(windowEndMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    windowEndMs = endOfMonth.getTime();
    windowMode = 'rest_of_month';
    windowEndLabel = endOfMonth.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const daysInWindow = Math.max(1, Math.ceil((windowEndMs - todayMs) / 86400000));

  let scheduled = 0;

  for (const b of args.bills) {
    if (b.status === 'paid') continue;
    const ms = parseDueMs(b.dueDate);
    if (ms === null) continue;
    if (ms >= todayMs && ms <= windowEndMs) {
      scheduled += b.amount || 0;
    }
  }

  for (const s of args.subscriptions) {
    if (s.status !== 'active') continue;
    const ms = parseDueMs(s.nextBillingDate);
    if (ms === null) continue;
    if (ms >= todayMs && ms <= windowEndMs) {
      scheduled += s.amount || 0;
    }
  }

  for (const d of args.debts) {
    if ((d.remaining || 0) <= 0) continue;
    const pdd = d.paymentDueDate?.trim();
    if (!pdd) continue;
    const ms = parseDueMs(pdd);
    if (ms === null) continue;
    if (ms >= todayMs && ms <= windowEndMs) {
      scheduled += d.minPayment || 0;
    }
  }

  const baseMs = args.scheduleBaseMs ?? Date.now();
  for (const c of args.citations) {
    if (c.status !== 'open') continue;
    const ms = baseMs + c.daysLeft * 86400000;
    if (ms >= todayMs && ms <= windowEndMs) {
      scheduled += c.amount || 0;
    }
  }

  const liquidAfter = (args.liquidCash || 0) - scheduled;
  const daily = Math.max(0, liquidAfter) / daysInWindow;

  return {
    dailySafeToSpend: parseFloat(daily.toFixed(2)),
    liquidAfterScheduled: parseFloat(liquidAfter.toFixed(2)),
    scheduledOutflowsTotal: parseFloat(scheduled.toFixed(2)),
    daysInWindow,
    windowEndLabel,
    windowMode,
    monthlySurplus: parseFloat((args.monthlySurplus || 0).toFixed(2)),
  };
}

export type AffordabilityVerdict = 'yes' | 'caution' | 'no';

export function classifyAffordability(
  purchaseAmount: number,
  liquidCash: number,
  safe: SafeToSpendResult,
): { verdict: AffordabilityVerdict; reasons: string[] } {
  const reasons: string[] = [];
  if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
    return { verdict: 'no', reasons: ['Invalid purchase amount.'] };
  }

  if (purchaseAmount > liquidCash) {
    reasons.push('Purchase exceeds total liquid cash on record.');
    return { verdict: 'no', reasons };
  }

  if (safe.liquidAfterScheduled < 0) {
    reasons.push('Liquid cash after scheduled bills in this window is already negative.');
    return { verdict: 'no', reasons };
  }

  if (purchaseAmount > safe.liquidAfterScheduled) {
    reasons.push('Purchase exceeds cash left after bills and minimums due in the current window.');
    return { verdict: 'no', reasons };
  }

  const weekSpend = safe.dailySafeToSpend * 7;
  if (purchaseAmount > weekSpend && weekSpend >= 0) {
    reasons.push('Purchase is larger than about one week of the estimated daily safe-to-spend rate.');
    return { verdict: 'caution', reasons };
  }

  if (safe.monthlySurplus < 0) {
    reasons.push('Modeled monthly surplus is negative; discretionary spending is tight.');
    return { verdict: 'caution', reasons };
  }

  reasons.push('Fits within liquid cash after scheduled outflows for this window.');
  return { verdict: 'yes', reasons };
}
