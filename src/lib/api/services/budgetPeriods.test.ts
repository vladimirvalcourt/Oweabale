import { describe, expect, it } from 'vitest';
import { shiftBudgetPeriod, startOfBudgetPeriod } from './budgetPeriods';

describe('budget periods', () => {
  it('uses monday start for weekly periods', () => {
    const start = startOfBudgetPeriod(new Date('2026-04-18T12:00:00'), 'Weekly');
    expect(start.toISOString().slice(0, 10)).toBe('2026-04-13');
  });

  it('aligns bi-weekly periods to stable two-week windows', () => {
    const start = startOfBudgetPeriod(new Date('2026-04-18T12:00:00'), 'Bi-weekly');
    expect(start.toISOString().slice(0, 10)).toBe('2026-04-13');
    const prev = shiftBudgetPeriod(start, 'Bi-weekly', -1);
    expect(prev.toISOString().slice(0, 10)).toBe('2026-03-30');
  });

  it('returns quarter boundary for quarterly periods', () => {
    const start = startOfBudgetPeriod(new Date('2026-05-12T12:00:00'), 'Quarterly');
    expect(start.toISOString().slice(0, 10)).toBe('2026-04-01');
  });
});
