import { describe, expect, it } from 'vitest';
import {
  buildBillNegotiationSuggestions,
  buildMonthlySavingsTargetSnapshot,
  buildPersonalizedSavingsSuggestions,
  buildSpendingRecap,
  calcMonthlyCashFlow,
  normalizeToMonthly,
  computeSafeToSpend,
} from './finance';
import type { IncomeInput, BillInput, DebtInput, SubscriptionInput } from './finance';

describe('buildSpendingRecap', () => {
  it('builds monthly recap with top category deltas', () => {
    const recap = buildSpendingRecap(
      [
        { date: '2026-04-10', category: 'Dining', amount: 130, type: 'expense' },
        { date: '2026-04-14', category: 'Groceries', amount: 70, type: 'expense' },
        { date: '2026-03-05', category: 'Dining', amount: 100, type: 'expense' },
        { date: '2026-03-10', category: 'Groceries', amount: 50, type: 'expense' },
        { date: '2026-04-02', category: 'Salary', amount: 2000, type: 'income' },
      ],
      'monthly',
      new Date('2026-04-18T12:00:00'),
    );

    expect(recap.totalSpent).toBe(200);
    expect(recap.previousTotalSpent).toBe(150);
    expect(recap.changePercent).toBeCloseTo(33.3, 1);
    expect(recap.topCategory).toBe('Dining');
    expect(recap.topCategoryChangePercent).toBeCloseTo(30, 1);
  });

  it('returns sane defaults when prior period has no spend', () => {
    const recap = buildSpendingRecap(
      [{ date: '2026-04-10', category: 'Dining', amount: 80, type: 'expense' }],
      'monthly',
      new Date('2026-04-18T12:00:00'),
    );

    expect(recap.previousTotalSpent).toBe(0);
    expect(recap.changePercent).toBe(100);
    expect(recap.topCategory).toBe('Dining');
    expect(recap.topCategoryChangePercent).toBe(100);
  });
});

describe('buildMonthlySavingsTargetSnapshot', () => {
  it('marks status ahead when net savings beats pace', () => {
    const snapshot = buildMonthlySavingsTargetSnapshot({
      targetMonthlySavings: 400,
      netSavedSoFar: 260,
      now: new Date('2026-04-15T12:00:00'),
    });

    expect(snapshot.status).toBe('ahead');
    expect(snapshot.projectedEndOfMonthSavings).toBeGreaterThan(400);
  });
});

describe('buildPersonalizedSavingsSuggestions', () => {
  it('returns category and subscription suggestions', () => {
    const suggestions = buildPersonalizedSavingsSuggestions({
      transactions: [
        { date: '2026-04-10', category: 'Dining', amount: 220, type: 'expense' },
        { date: '2026-04-11', category: 'Groceries', amount: 80, type: 'expense' },
      ],
      subscriptions: [
        { id: 's1', name: 'Phone Plan', amount: 80, frequency: 'Monthly', status: 'active' },
      ],
      now: new Date('2026-04-18T12:00:00'),
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.headline.includes('Phone Plan'))).toBe(true);
  });
});

describe('buildBillNegotiationSuggestions', () => {
  it('builds negotiation suggestions for recurring bills', () => {
    const suggestions = buildBillNegotiationSuggestions({
      bills: [
        { id: 'b1', biller: 'Comcast', category: 'Internet', amount: 120, frequency: 'Monthly' },
        { id: 'b2', biller: 'Utility', category: 'Utilities', amount: 18, frequency: 'Monthly' },
      ],
    });

    expect(suggestions.length).toBe(1);
    expect(suggestions[0]?.provider).toBe('Comcast');
    expect(suggestions[0]?.estimatedMonthlySavings).toBeGreaterThan(0);
  });
});

describe('normalizeToMonthly', () => {
  it('correctly maps Weekly to monthly', () => {
    expect(normalizeToMonthly(100, 'Weekly')).toBeCloseTo(433, 2);
  });
  
  it('correctly maps Bi-weekly to monthly', () => {
    expect(normalizeToMonthly(100, 'Bi-weekly')).toBeCloseTo(216.5, 2);
  });

  it('correctly maps Yearly to monthly', () => {
    expect(normalizeToMonthly(1200, 'Yearly')).toBeCloseTo(100, 2);
  });

  it('correctly handles Monthly (default)', () => {
    expect(normalizeToMonthly(50, 'Monthly')).toBe(50);
  });
});

describe('calcMonthlyCashFlow', () => {
  it('computes accurate tax reserve and fixed expenses', () => {
    const incomes: IncomeInput[] = [
      { id: '1', amount: 4000, frequency: 'Monthly', status: 'active', isTaxWithheld: true },
      { id: '2', amount: 1000, frequency: 'Monthly', status: 'active', isTaxWithheld: false },
    ];
    const bills: BillInput[] = [
      { id: 'b1', amount: 1500, frequency: 'Monthly', status: 'upcoming' },
      { id: 'b2', amount: 200, frequency: 'Monthly', status: 'paid' },
    ];
    const debts: DebtInput[] = [
      { id: 'd1', name: 'Car Loan', apr: 5, remaining: 10000, minPayment: 300, paid: 0 },
    ];
    const subs: SubscriptionInput[] = [
      { id: 's1', amount: 15, frequency: 'Monthly', status: 'active' },
      { id: 's2', amount: 120, frequency: 'Yearly', status: 'active' },
    ];

    const result = calcMonthlyCashFlow(incomes, bills, debts, subs);

    expect(result.monthlyIncome).toBe(5000);
    expect(result.taxReserve).toBe(250);
    expect(result.disposableIncome).toBe(4750);
    expect(result.fixedExpenses).toBe(1800);
    expect(result.subscriptions).toBe(25);
    expect(result.surplus).toBe(2925);
  });
});

describe('computeSafeToSpend', () => {
  it('calculates daily safe to spend accurately to the end of the window', () => {
    const now = new Date('2026-04-20T10:00:00Z');
    const incomes = [{ nextDate: '2026-04-25T12:00:00Z', status: 'active' }];
    const bills = [
      { dueDate: '2026-04-22T12:00:00Z', amount: 200, status: 'upcoming' },
      { dueDate: '2026-04-28T12:00:00Z', amount: 500, status: 'upcoming' },
    ];
    const subs = [{ nextBillingDate: '2026-04-24T12:00:00Z', amount: 50, status: 'active' }];

    const result = computeSafeToSpend({
      liquidCash: 1000,
      monthlySurplus: 1500,
      bills,
      incomes,
      subscriptions: subs,
      debts: [],
      citations: [],
      now
    });

    expect(result.scheduledOutflowsTotal).toBe(250);
    expect(result.liquidAfterScheduled).toBe(750);
    expect(result.daysInWindow).toBe(5);
    expect(result.dailySafeToSpend).toBe(150);
    expect(result.windowMode).toBe('to_next_payday');
  });
});
