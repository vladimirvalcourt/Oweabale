import { PLAID_CATEGORY_LABELS } from './plaidCategoryLabels';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  ...PLAID_CATEGORY_LABELS,
};

/** Title-case token handling common Plaid-style segments */
function titleCaseWords(s: string): string {
  const small = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'vs']);
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/**
 * Turn raw Plaid / API category strings into short, human-readable labels.
 * Never returns raw ALL_CAPS_UNDERSCORE for known patterns.
 */
export function formatCategoryLabel(rawCategory: string | null | undefined): string {
  const normalized = (rawCategory ?? '').trim();
  if (!normalized) return 'Uncategorized';

  const direct = CATEGORY_LABEL_MAP[normalized] ?? CATEGORY_LABEL_MAP[normalized.toUpperCase()];
  if (direct) return direct;

  const upper = normalized.toUpperCase();
  if (upper === normalized && normalized.includes('_')) {
    const cleaned = normalized.replace(/_/g, ' ').toLowerCase();
    return titleCaseWords(cleaned);
  }

  return normalized
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
