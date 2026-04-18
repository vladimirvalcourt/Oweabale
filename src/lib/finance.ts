// finance.ts — Pure financial math utilities
// No React, no Supabase, no side effects. All functions are deterministic.

// ---------------------------------------------------------------------------
// Financial constants
// ---------------------------------------------------------------------------

/** Conservative flat tax reserve for self-employed / freelance income (25%). */
export const TAX_RESERVE_RATE = 0.25;

/** Fraction of monthly surplus routed to the highest-APR debt. */
export const SURPLUS_TO_DEBT_RATIO = 0.5;

/** Fraction of monthly surplus routed to emergency fund. */
export const SURPLUS_TO_EMERGENCY_RATIO = 0.2;

/** Maximum months modelled in amortization schedules (50 years). */
export const MAX_AMORTIZATION_MONTHS = 600;

/** 2025 IRS standard mileage rate for business use (cents per mile → dollars). */
export const IRS_MILEAGE_RATE = 0.70;

// ---------------------------------------------------------------------------
// Input types (mirror store interfaces, with new optional fields)
// ---------------------------------------------------------------------------

export interface DebtInput {
  id: string;
  name: string;
  apr: number;
  remaining: number;
  minPayment: number;
  paid: number;
  originalAmount?: number;
  originationDate?: string;
  termMonths?: number;
}

export interface AssetInput {
  id: string;
  name: string;
  value: number;
  type: string;
  appreciationRate?: number; // annual decimal, e.g. 0.07 = 7%
}

export interface IncomeInput {
  id: string;
  amount: number;
  frequency: string;
  status: string;
  isTaxWithheld: boolean;
}

export interface BillInput {
  id?: string;
  amount: number;
  frequency: string;
  status?: string;
}

export interface SubscriptionInput {
  id?: string;
  amount: number;
  frequency: string;
  status: string;
}

export interface GoalInput {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: string;
}

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface AmortizationRow {
  month: number;    // 1-based month index
  payment: number;  // total payment made
  principal: number;
  interest: number;
  balance: number;  // remaining balance after payment
}

export interface ProjectionRow {
  month: number;    // 0 = current, 1 = next month, etc.
  label: string;    // e.g. "May 2026"
  netWorth: number;
  assets: number;
  debts: number;
  cashflow: number; // monthly surplus at this point in time
}

export interface CashFlowResult {
  monthlyIncome: number;
  taxReserve: number;       // 25% of gross income (Financial Guy Protocol)
  fixedExpenses: number;    // bills + debt min payments
  subscriptions: number;    // active subs normalized to monthly
  surplus: number;          // monthlyIncome - taxReserve - fixedExpenses - subscriptions
  disposableIncome: number; // monthlyIncome - taxReserve
}

export interface SurplusAllocation {
  toHighestAPR: { debtName: string; amount: number } | null;
  toGoals: { goalName: string; amount: number }[];
  toEmergency: number;
  surplusRemaining: number;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Normalize recurring amount to a monthly equivalent (bills, subscriptions, income). */
export function normalizeToMonthly(amount: number, frequency: string): number {
  const f = (frequency || '').toLowerCase();
  if (f === 'weekly') return (amount || 0) * 4.33;
  if (f === 'bi-weekly' || f === 'biweekly') return (amount || 0) * 2.165;
  if (f === 'yearly' || f === 'annual' || f === 'annually') return (amount || 0) / 12;
  if (f === 'quarterly') return (amount || 0) / 3;
  // Monthly (default)
  return amount || 0;
}

function monthLabel(offsetMonths: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate.getFullYear(), fromDate.getMonth() + offsetMonths, 1);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// generateAmortizationSchedule
// ---------------------------------------------------------------------------

export function generateAmortizationSchedule(
  debt: DebtInput,
  extraMonthly: number = 0
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = debt.remaining || 0;
  const monthlyRate = (debt.apr || 0) / 100 / 12;
  const minPayment = debt.minPayment || 0;

  if (balance <= 0) return rows;

  for (let month = 1; month <= MAX_AMORTIZATION_MONTHS; month++) {
    const interest = balance * monthlyRate;
    const totalPayment = Math.min(balance + interest, minPayment + extraMonthly);
    const principal = totalPayment - interest;
    balance = Math.max(0, balance - principal);

    rows.push({
      month,
      payment: parseFloat(totalPayment.toFixed(2)),
      principal: parseFloat(principal.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
    });

    if (balance <= 0) break;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// calcMonthlyCashFlow
// ---------------------------------------------------------------------------

export function calcMonthlyCashFlow(
  incomes: IncomeInput[],
  bills: BillInput[],
  debts: DebtInput[],
  subscriptions: SubscriptionInput[]
): CashFlowResult {
  const monthlyIncome = incomes.reduce((sum, inc) => {
    if (inc.status !== 'active') return sum;
    return sum + normalizeToMonthly(inc.amount, inc.frequency);
  }, 0);

  const taxReserve = incomes.reduce((sum, inc) => {
    if (inc.status !== 'active' || inc.isTaxWithheld) return sum;
    return sum + (normalizeToMonthly(inc.amount, inc.frequency) * TAX_RESERVE_RATE);
  }, 0);

  const disposableIncome = monthlyIncome - taxReserve;
  const billsMonthly = bills.reduce((sum, bill) => {
    // Only include bills that aren't already paid
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

// ---------------------------------------------------------------------------
// calcSurplusRouting
// ---------------------------------------------------------------------------

export function calcSurplusRouting(
  surplus: number,
  goals: GoalInput[],
  debts: DebtInput[]
): SurplusAllocation {
  if (surplus <= 0) {
    return { toHighestAPR: null, toGoals: [], toEmergency: 0, surplusRemaining: surplus };
  }

  let remaining = surplus;

  // 50% to highest-APR debt
  const activeDebts = debts.filter(d => (d.remaining || 0) > 0);
  let toHighestAPR: SurplusAllocation['toHighestAPR'] = null;
  if (activeDebts.length > 0) {
    const topDebt = [...activeDebts].sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
    const debtAllocation = parseFloat((surplus * SURPLUS_TO_DEBT_RATIO).toFixed(2));
    toHighestAPR = { debtName: topDebt.name, amount: debtAllocation };
    remaining -= debtAllocation;
  }

  // 20% to emergency fund (goals of type 'emergency')
  const emergencyGoals = goals.filter(g => g.type === 'emergency' && g.currentAmount < g.targetAmount);
  let toEmergency = 0;
  if (emergencyGoals.length > 0) {
    toEmergency = parseFloat((surplus * SURPLUS_TO_EMERGENCY_RATIO).toFixed(2));
    remaining -= toEmergency;
  }

  // Remaining 30% to savings goals
  const savingsGoals = goals.filter(
    g => g.type !== 'emergency' && g.currentAmount < g.targetAmount
  );
  const toGoals: SurplusAllocation['toGoals'] = [];
  if (savingsGoals.length > 0 && remaining > 0) {
    const perGoal = parseFloat((remaining / savingsGoals.length).toFixed(2));
    for (const goal of savingsGoals) {
      toGoals.push({ goalName: goal.name, amount: perGoal });
    }
    remaining = 0;
  }

  return {
    toHighestAPR,
    toGoals,
    toEmergency,
    surplusRemaining: parseFloat(remaining.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// Safe to spend (forward-looking, Reddit-aligned “what can I spend today?”)
// ---------------------------------------------------------------------------

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
  /** Rough average per day you could spend after reserving known outflows in the window (not advice). */
  dailySafeToSpend: number;
  /** Liquid cash minus summed scheduled outflows with due dates inside the window. */
  liquidAfterScheduled: number;
  /** Sum of those scheduled outflows. */
  scheduledOutflowsTotal: number;
  /** Days used as denominator (min 1). */
  daysInWindow: number;
  /** Human label for the window end. */
  windowEndLabel: string;
  windowMode: SafeToSpendWindowMode;
  /** Monthly surplus from {@link calcMonthlyCashFlow} (same month, modeled). */
  monthlySurplus: number;
}

/**
 * “Safe to spend / day” heuristic: (liquid cash − bills/subs/citations due before next payday) ÷ days until payday.
 * If no active income with a next date, uses rest-of-calendar-month and bills due by month-end.
 * Does not model investments, irregular gig income, or bank holds — show assumptions in UI.
 */
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
    .map((i) => ({ ms: parseDueMs(i.nextDate), raw: i.nextDate }))
    .filter((x): x is { ms: number; raw: string } => x.ms !== null && x.ms >= todayMs)
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

  const daysInWindow = Math.max(
    1,
    Math.ceil((windowEndMs - todayMs) / 86400000)
  );

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

export type HorizonBucket = '0-30' | '31-60' | '61-90';

export interface HorizonLineItem {
  id: string;
  label: string;
  amount: number;
  dueMs: number;
  kind: 'bill' | 'subscription' | 'debt' | 'citation';
}

/**
 * Group cash outflows with a single known due date into 30 / 60 / 90 day buckets from today (start of day).
 */
export function groupOutflowsByHorizon(args: {
  bills: Array<{ id: string; biller: string; dueDate: string; amount: number; status: string }>;
  subscriptions: Array<{ id: string; name: string; nextBillingDate: string; amount: number; status: string }>;
  debts: Array<{ id: string; name: string; minPayment: number; remaining: number; paymentDueDate?: string | null }>;
  citations: Array<{ id: string; type: string; jurisdiction: string; daysLeft: number; amount: number; status: string }>;
  scheduleBaseMs?: number;
  now?: Date;
}): Record<HorizonBucket, HorizonLineItem[]> {
  const now = args.now ?? new Date();
  const todayMs = startOfDayUtc(now);
  const baseMs = args.scheduleBaseMs ?? Date.now();
  const buckets: Record<HorizonBucket, HorizonLineItem[]> = { '0-30': [], '31-60': [], '61-90': [] };

  const pushBucket = (item: HorizonLineItem) => {
    const rel = item.dueMs - todayMs;
    const day = rel / 86400000;
    if (day < 0 || day > 90) return;
    if (day <= 30) buckets['0-30'].push(item);
    else if (day <= 60) buckets['31-60'].push(item);
    else buckets['61-90'].push(item);
  };

  for (const b of args.bills) {
    if (b.status === 'paid') continue;
    const ms = parseDueMs(b.dueDate);
    if (ms === null) continue;
    pushBucket({
      id: `bill-${b.id}`,
      label: b.biller,
      amount: b.amount || 0,
      dueMs: ms,
      kind: 'bill',
    });
  }

  for (const s of args.subscriptions) {
    if (s.status !== 'active') continue;
    const ms = parseDueMs(s.nextBillingDate);
    if (ms === null) continue;
    pushBucket({
      id: `sub-${s.id}`,
      label: s.name,
      amount: s.amount || 0,
      dueMs: ms,
      kind: 'subscription',
    });
  }

  for (const d of args.debts) {
    if ((d.remaining || 0) <= 0) continue;
    const pdd = d.paymentDueDate?.trim();
    if (!pdd) continue;
    const ms = parseDueMs(pdd);
    if (ms === null) continue;
    pushBucket({
      id: `debt-${d.id}`,
      label: `${d.name} (min)`,
      amount: d.minPayment || 0,
      dueMs: ms,
      kind: 'debt',
    });
  }

  for (const c of args.citations) {
    if (c.status !== 'open') continue;
    const ms = baseMs + c.daysLeft * 86400000;
    pushBucket({
      id: `cit-${c.id}`,
      label: `${c.type} — ${c.jurisdiction}`,
      amount: c.amount || 0,
      dueMs: ms,
      kind: 'citation',
    });
  }

  const sortByDue = (a: HorizonLineItem, b: HorizonLineItem) => a.dueMs - b.dueMs;
  buckets['0-30'].sort(sortByDue);
  buckets['31-60'].sort(sortByDue);
  buckets['61-90'].sort(sortByDue);

  return buckets;
}

// ---------------------------------------------------------------------------
// projectNetWorth
// ---------------------------------------------------------------------------

export function projectNetWorth(
  assets: AssetInput[],
  debts: DebtInput[],
  incomes: IncomeInput[],
  bills: BillInput[],
  subscriptions: SubscriptionInput[],
  months: number = 12,
  extraMonthly: number = 0
): ProjectionRow[] {
  const rows: ProjectionRow[] = [];

  // Working copies (mutable projections)
  let workingAssets = assets.map(a => ({ ...a, value: a.value || 0 }));
  let workingDebts = debts.map(d => ({ ...d, remaining: d.remaining || 0 }));

  for (let m = 0; m <= months; m++) {
    const totalAssets = workingAssets.reduce((s, a) => s + a.value, 0);
    const totalDebts = workingDebts.reduce((s, d) => s + d.remaining, 0);

    const cf = calcMonthlyCashFlow(incomes, bills as BillInput[], workingDebts, subscriptions);

    rows.push({
      month: m,
      label: monthLabel(m),
      netWorth: parseFloat((totalAssets - totalDebts).toFixed(2)),
      assets: parseFloat(totalAssets.toFixed(2)),
      debts: parseFloat(totalDebts.toFixed(2)),
      cashflow: cf.surplus,
    });

    if (m === months) break;

    // Advance one month: appreciate assets
    workingAssets = workingAssets.map(a => {
      const annualRate = a.appreciationRate || 0;
      const monthlyRate = annualRate / 12;
      return { ...a, value: a.value * (1 + monthlyRate) };
    });

    // Advance one month: pay down debts
    // Apply extra payment to highest-APR debt first
    const activeDebts = workingDebts.filter(d => d.remaining > 0);
    let remainingExtra = extraMonthly;

    // Sort debts by APR descending for extra payment allocation
    const sortedIds = [...activeDebts]
      .sort((a, b) => (b.apr || 0) - (a.apr || 0))
      .map(d => d.id);

    workingDebts = workingDebts.map(d => {
      if (d.remaining <= 0) return d;
      const monthlyRate = (d.apr || 0) / 100 / 12;
      const interest = d.remaining * monthlyRate;
      let payment = d.minPayment || 0;

      // Apply extra payment to highest-APR first
      if (remainingExtra > 0 && sortedIds[0] === d.id) {
        payment += remainingExtra;
        remainingExtra = 0;
      }

      const totalPayment = Math.min(d.remaining + interest, payment);
      const principal = totalPayment - interest;
      const newRemaining = Math.max(0, d.remaining - principal);
      return { ...d, remaining: parseFloat(newRemaining.toFixed(2)) };
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// forecast30DayCashFlow
// ---------------------------------------------------------------------------

export interface CashFlowForecastDay {
  date: string;       // ISO date "2026-04-19"
  balance: number;    // projected end-of-day balance
  outflows: number;   // outflows due on this specific day
  label: string;      // "Apr 19"
}

export function forecast30DayCashFlow(args: {
  liquidCash: number;
  bills: Array<{ dueDate: string; amount: number; status?: string }>;
  subscriptions: Array<{ nextBillingDate: string; amount: number; status: string }>;
  debts: Array<{ minPayment: number; remaining: number; paymentDueDate?: string | null }>;
  citations: Array<{ status: string; daysLeft: number; amount: number }>;
  dailySurplus: number;
  now?: Date;
}): CashFlowForecastDay[] {
  const now = args.now ?? new Date();
  const days: CashFlowForecastDay[] = [];
  let balance = args.liquidCash;

  // Build a map of outflows by ISO date string
  const outflowByDate: Record<string, number> = {};

  const addOutflow = (isoDate: string | null | undefined, amount: number) => {
    if (!isoDate) return;
    const raw = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const key = d.toISOString().slice(0, 10);
    outflowByDate[key] = (outflowByDate[key] ?? 0) + amount;
  };

  for (const b of args.bills) {
    if (b.status === 'paid') continue;
    addOutflow(b.dueDate, b.amount);
  }
  for (const s of args.subscriptions) {
    if (s.status !== 'active') continue;
    addOutflow(s.nextBillingDate, s.amount);
  }
  for (const d of args.debts) {
    if ((d.remaining ?? 0) <= 0) continue;
    addOutflow(d.paymentDueDate ?? null, d.minPayment);
  }
  for (const c of args.citations) {
    if (c.status !== 'open') continue;
    const dueDate = new Date(now.getTime() + c.daysLeft * 86400000);
    const key = dueDate.toISOString().slice(0, 10);
    outflowByDate[key] = (outflowByDate[key] ?? 0) + c.amount;
  }

  for (let i = 0; i < 30; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const outflows = outflowByDate[key] ?? 0;
    balance = balance - outflows + args.dailySurplus;
    days.push({
      date: key,
      balance: parseFloat(balance.toFixed(2)),
      outflows: parseFloat(outflows.toFixed(2)),
      label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    });
  }

  return days;
}

// ---------------------------------------------------------------------------
// detectSpendingAnomalies
// ---------------------------------------------------------------------------

export interface SpendingAnomaly {
  category: string;
  currentMonth: number;
  threeMonthAvg: number;
  overagePercent: number;
  overageAmount: number;
}

export interface SpendingRecap {
  periodLabel: string;
  totalSpent: number;
  previousTotalSpent: number;
  changePercent: number;
  topCategory: string | null;
  topCategoryAmount: number;
  topCategoryChangePercent: number;
  isIncrease: boolean;
}

function sumByCategory(
  transactions: Array<{ date: string; category: string; amount: number; type: string }>,
  start: Date,
  end: Date,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const d = new Date(tx.date.includes('T') ? tx.date : `${tx.date}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d < start || d > end) continue;
    out[tx.category] = (out[tx.category] ?? 0) + tx.amount;
  }
  return out;
}

function pctDelta(current: number, prev: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

export function buildSpendingRecap(
  transactions: Array<{ date: string; category: string; amount: number; type: string }>,
  mode: 'monthly' | 'yearly',
  now: Date = new Date(),
): SpendingRecap {
  const year = now.getFullYear();
  const month = now.getMonth();

  const currentStart = mode === 'monthly' ? new Date(year, month, 1) : new Date(year, 0, 1);
  const currentEnd = mode === 'monthly' ? new Date(year, month + 1, 0, 23, 59, 59, 999) : new Date(year, 11, 31, 23, 59, 59, 999);
  const prevStart = mode === 'monthly' ? new Date(year, month - 1, 1) : new Date(year - 1, 0, 1);
  const prevEnd = mode === 'monthly' ? new Date(year, month, 0, 23, 59, 59, 999) : new Date(year - 1, 11, 31, 23, 59, 59, 999);

  const currentByCategory = sumByCategory(transactions, currentStart, currentEnd);
  const prevByCategory = sumByCategory(transactions, prevStart, prevEnd);

  const totalSpent = Object.values(currentByCategory).reduce((s, n) => s + n, 0);
  const previousTotalSpent = Object.values(prevByCategory).reduce((s, n) => s + n, 0);

  const [topCategory, topCategoryAmount] = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  const prevTopCategoryAmount = topCategory ? (prevByCategory[topCategory] ?? 0) : 0;
  const topCategoryChangePercent = pctDelta(topCategoryAmount, prevTopCategoryAmount);

  const periodLabel =
    mode === 'monthly'
      ? now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : `${year}`;

  const changePercent = pctDelta(totalSpent, previousTotalSpent);

  return {
    periodLabel,
    totalSpent: parseFloat(totalSpent.toFixed(2)),
    previousTotalSpent: parseFloat(previousTotalSpent.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(1)),
    topCategory,
    topCategoryAmount: parseFloat(topCategoryAmount.toFixed(2)),
    topCategoryChangePercent: parseFloat(topCategoryChangePercent.toFixed(1)),
    isIncrease: totalSpent >= previousTotalSpent,
  };
}

export function detectSpendingAnomalies(
  transactions: Array<{ date: string; category: string; amount: number; type: string }>,
  thresholdPercent = 25,
): SpendingAnomaly[] {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOf3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  const currentByCategory: Record<string, number> = {};
  const historicalByCategory: Record<string, number[]> = {};

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const d = new Date(tx.date.includes('T') ? tx.date : `${tx.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) continue;

    if (d >= startOfCurrentMonth) {
      currentByCategory[tx.category] = (currentByCategory[tx.category] ?? 0) + tx.amount;
    } else if (d >= startOf3MonthsAgo && d < startOfCurrentMonth) {
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!historicalByCategory[tx.category]) historicalByCategory[tx.category] = [];
      // Accumulate into monthly buckets — simplified: sum all 3 months then divide
      // We track total per category for the 3-month window, then divide by 3
      const existing = historicalByCategory[tx.category];
      // Use index 0 as running total
      existing[0] = (existing[0] ?? 0) + tx.amount;
      void monthKey;
    }
  }

  const anomalies: SpendingAnomaly[] = [];
  for (const [category, currentMonth] of Object.entries(currentByCategory)) {
    const totalHistorical = historicalByCategory[category]?.[0] ?? 0;
    if (totalHistorical === 0) continue;
    const threeMonthAvg = totalHistorical / 3;
    if (threeMonthAvg < 10) continue; // ignore trivially small categories
    const overageAmount = currentMonth - threeMonthAvg;
    if (overageAmount <= 0) continue;
    const overagePercent = (overageAmount / threeMonthAvg) * 100;
    if (overagePercent < thresholdPercent) continue;
    anomalies.push({
      category,
      currentMonth: parseFloat(currentMonth.toFixed(2)),
      threeMonthAvg: parseFloat(threeMonthAvg.toFixed(2)),
      overagePercent: parseFloat(overagePercent.toFixed(1)),
      overageAmount: parseFloat(overageAmount.toFixed(2)),
    });
  }

  return anomalies.sort((a, b) => b.overagePercent - a.overagePercent);
}

// ---------------------------------------------------------------------------
// detectUnusedSubscriptions
// ---------------------------------------------------------------------------

export interface UnusedSubscription {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  monthlyEquivalent: number;
  daysWithoutCharge: number;
  hasPriceHike: boolean;
  previousAmount?: number;
}

export function detectUnusedSubscriptions(
  subscriptions: Array<{
    id: string;
    name: string;
    amount: number;
    frequency: string;
    status: string;
    priceHistory?: { date: string; amount: number }[];
  }>,
  transactions: Array<{ name: string; date: string; amount: number; type: string }>,
  windowDays = 35,
): UnusedSubscription[] {
  const now = Date.now();
  const windowMs = windowDays * 86400000;
  const cutoff = now - windowMs;

  const unused: UnusedSubscription[] = [];

  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue;

    const subNameLower = sub.name.toLowerCase().replace(/\s+/g, '');

    // Check for a matching transaction in the window
    const hasRecentCharge = transactions.some((tx) => {
      if (tx.type !== 'expense') return false;
      const txMs = new Date(tx.date.includes('T') ? tx.date : `${tx.date}T12:00:00`).getTime();
      if (txMs < cutoff) return false;
      const txNameLower = tx.name.toLowerCase().replace(/\s+/g, '');
      return (
        txNameLower.includes(subNameLower) ||
        subNameLower.includes(txNameLower) ||
        (subNameLower.length > 4 && txNameLower.includes(subNameLower.slice(0, 5)))
      );
    });

    if (hasRecentCharge) continue;

    // Detect price hike from priceHistory
    let hasPriceHike = false;
    let previousAmount: number | undefined;
    if (sub.priceHistory && sub.priceHistory.length >= 2) {
      const sorted = [...sub.priceHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sorted[0].amount > sorted[1].amount) {
        hasPriceHike = true;
        previousAmount = sorted[1].amount;
      }
    }

    unused.push({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      frequency: sub.frequency,
      monthlyEquivalent: parseFloat(normalizeToMonthly(sub.amount, sub.frequency).toFixed(2)),
      daysWithoutCharge: windowDays,
      hasPriceHike,
      previousAmount,
    });
  }

  return unused.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}
