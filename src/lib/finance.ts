// finance.ts — Pure financial math utilities
// No React, no Supabase, no side effects. All functions are deterministic.

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

function normalizeToMonthly(amount: number, frequency: string): number {
  const f = (frequency || '').toLowerCase();
  if (f === 'weekly') return (amount || 0) * 4.33;
  if (f === 'bi-weekly') return (amount || 0) * 2.165;
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

  for (let month = 1; month <= 600; month++) {
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
    return sum + (normalizeToMonthly(inc.amount, inc.frequency) * 0.25);
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
    const debtAllocation = parseFloat((surplus * 0.5).toFixed(2));
    toHighestAPR = { debtName: topDebt.name, amount: debtAllocation };
    remaining -= debtAllocation;
  }

  // 20% to emergency fund (goals of type 'emergency')
  const emergencyGoals = goals.filter(g => g.type === 'emergency' && g.currentAmount < g.targetAmount);
  let toEmergency = 0;
  if (emergencyGoals.length > 0) {
    toEmergency = parseFloat((surplus * 0.2).toFixed(2));
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
