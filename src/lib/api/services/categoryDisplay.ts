import { PLAID_CATEGORY_LABELS } from '../plaid/labels';
import { EXPENSE_CATEGORY_LABELS } from './quickEntryCategories';

const CATEGORY_LABEL_MAP: Record<string, string> = {
  ...PLAID_CATEGORY_LABELS,
  ...EXPENSE_CATEGORY_LABELS,
};

const PLAID_PREFIXES = ['personal_finance_category_', 'pfc_'];

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

function stripPlaidNoise(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  const lower = s.toLowerCase();
  for (const p of PLAID_PREFIXES) {
    if (lower.startsWith(p)) {
      s = s.slice(p.length).trim();
      break;
    }
  }
  return s.replace(/_+/g, '_');
}

/** Plaid-style slug: segments of letters/digits separated by underscores */
const SNAKE_SLUG = /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)*$/;

/**
 * Turn raw Plaid / API category strings into short, human-readable labels.
 * Strips common prefixes, maps known Plaid enums, and title-cases underscore slugs.
 */
export function formatCategoryLabel(rawCategory: string | null | undefined): string {
  const stripped = stripPlaidNoise(rawCategory ?? '');
  if (!stripped) return 'Uncategorized';

  const direct = CATEGORY_LABEL_MAP[stripped] ?? CATEGORY_LABEL_MAP[stripped.toUpperCase()];
  if (direct) return direct;

  if (stripped.includes('_') && SNAKE_SLUG.test(stripped)) {
    const cleaned = stripped.replace(/_/g, ' ').toLowerCase();
    return titleCaseWords(cleaned);
  }

  const upper = stripped.toUpperCase();
  if (upper === stripped && stripped.includes('_')) {
    const cleaned = stripped.replace(/_/g, ' ').toLowerCase();
    return titleCaseWords(cleaned);
  }

  return stripped
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
