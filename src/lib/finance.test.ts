import { describe, expect, it } from 'vitest';
import { buildSpendingRecap } from './finance';

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
