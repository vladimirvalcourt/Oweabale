import type { Budget } from '../../../store';

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

export function startOfBudgetPeriod(base: Date, period: Budget['period']): Date {
  const d = startOfDay(base);
  if (period === 'Weekly' || period === 'Bi-weekly') {
    const weekStart = new Date(d);
    const day = weekStart.getDay();
    const diff = (day + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diff);
    if (period === 'Bi-weekly') {
      const anchor = new Date(2024, 0, 1);
      const weeksSinceAnchor = Math.floor((weekStart.getTime() - anchor.getTime()) / (7 * 86400000));
      if (weeksSinceAnchor % 2 !== 0) weekStart.setDate(weekStart.getDate() - 7);
    }
    return weekStart;
  }
  if (period === 'Monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (period === 'Quarterly') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  return new Date(d.getFullYear(), 0, 1);
}

export function shiftBudgetPeriod(start: Date, period: Budget['period'], offset: number): Date {
  if (period === 'Weekly') return addDays(start, 7 * offset);
  if (period === 'Bi-weekly') return addDays(start, 14 * offset);
  if (period === 'Monthly') return new Date(start.getFullYear(), start.getMonth() + offset, 1);
  if (period === 'Quarterly') return new Date(start.getFullYear(), start.getMonth() + 3 * offset, 1);
  return new Date(start.getFullYear() + offset, 0, 1);
}
