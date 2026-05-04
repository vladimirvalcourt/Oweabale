/**
 * Debt payoff calculation utilities.
 * Extracted from Obligations.tsx to reduce page-level complexity.
 */

type Strategy = 'avalanche' | 'snowball';

interface PayoffDebt {
  remaining: number;
  apr: number;
  minPayment: number;
  name: string;
}

interface PayoffResult {
  months: number;
  totalInterest: number;
  minOnlyInterest: number;
  order: string[];
}

/**
 * Avalanche / Snowball payoff calculator.
 * Simulates monthly payments until all debts are cleared.
 */
export function calcPayoff(
  debts: PayoffDebt[],
  extraMonthly: number,
  strategy: Strategy
): PayoffResult {
  if (!debts.length) return { months: 0, totalInterest: 0, minOnlyInterest: 0, order: [] };

  let remaining = debts.map((d) => ({ ...d }));
  if (strategy === 'avalanche') remaining.sort((a, b) => b.apr - a.apr);
  else remaining.sort((a, b) => a.remaining - b.remaining);

  const order = remaining.map((d) => d.name);
  let months = 0;
  let totalInterest = 0;

  while (remaining.some((d) => d.remaining > 0) && months < 600) {
    months++;
    let extra = extraMonthly;

    remaining.forEach((d) => {
      if (d.remaining <= 0) return;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.remaining * monthlyRate;
      totalInterest += interest;
      d.remaining = Math.max(0, d.remaining + interest - d.minPayment);
    });

    for (const d of remaining) {
      if (d.remaining > 0 && extra > 0) {
        const payment = Math.min(extra, d.remaining);
        d.remaining -= payment;
        extra -= payment;
        break;
      }
    }
  }

  let minOnlyInterest = 0;
  let minRemaining = debts.map((d) => ({ ...d }));
  let minMonths = 0;
  while (minRemaining.some((d) => d.remaining > 0) && minMonths < 600) {
    minMonths++;
    minRemaining.forEach((d) => {
      if (d.remaining <= 0) return;
      const monthlyRate = d.apr / 100 / 12;
      const interest = d.remaining * monthlyRate;
      minOnlyInterest += interest;
      d.remaining = Math.max(0, d.remaining + interest - d.minPayment);
    });
  }

  return { months, totalInterest, minOnlyInterest, order };
}

/** Convert month count to a human-readable future date. */
export function monthsToDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleString('default', { month: 'short', year: 'numeric' });
}
