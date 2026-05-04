/**
 * Shared date utility functions used across the application.
 * Consolidates inline helpers that were duplicated in multiple page components.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Return a new Date with time set to 00:00:00 in the local timezone. */
export function startOfLocalDay(date = new Date()): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Parse an ISO date string or a plain date string into a local midnight Date.
 * Plain strings (no "T") are treated as midday to avoid timezone edge cases.
 */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return startOfLocalDay(date);
}

/** Add N days to a date. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Compute whole days between today and target (negative = past). */
export function daysUntil(date: Date | null, today: Date): number | null {
  if (!date) return null;
  return Math.round((startOfLocalDay(date).getTime() - today.getTime()) / MS_PER_DAY);
}

/** Format a date as a short readable string (e.g. "Jan 15"). */
export function formatShortDate(date: Date | null): string {
  if (!date) return 'Set a date';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Human-readable relative due label (e.g. "Due in 3 days", "Overdue by 2 days"). */
export function dueLabel(dueInDays: number | null): string {
  if (dueInDays === null) return 'No due date yet';
  if (dueInDays < 0) return `Overdue by ${Math.abs(dueInDays)} day${Math.abs(dueInDays) === 1 ? '' : 's'}`;
  if (dueInDays === 0) return 'Due today';
  if (dueInDays === 1) return 'Due tomorrow';
  return `Due in ${dueInDays} days`;
}
