import { describe, expect, it } from 'vitest';
import {
  buildBillNegotiationSuggestions,
  buildMonthlySavingsTargetSnapshot,
  buildPersonalizedSavingsSuggestions,
  buildSpendingRecap,
} from './finance';

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
