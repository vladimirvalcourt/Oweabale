const CATEGORY_LABEL_MAP: Record<string, string> = {
  RENT_AND_UTILITIES_TELEPHONE: 'Phone & Utilities',
  RENT_AND_UTILITIES: 'Rent & Utilities',
  FOOD_AND_DRINK: 'Food & Dining',
  FOOD_AND_DRINK_RESTAURANTS: 'Restaurants',
  TRANSPORTATION: 'Transportation',
  TRANSPORTATION_GAS: 'Gas',
  SHOPPING: 'Shopping',
  SHOPPING_GENERAL: 'General Shopping',
  ENTERTAINMENT: 'Entertainment',
  HEALTHCARE: 'Healthcare',
  PERSONAL_CARE: 'Personal Care',
  TRAVEL: 'Travel',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
  PAYMENT: 'Payment',
};

export function formatCategoryLabel(rawCategory: string | null | undefined): string {
  const normalized = (rawCategory ?? '').trim();
  if (!normalized) return 'Uncategorized';
  const mapped = CATEGORY_LABEL_MAP[normalized];
  if (mapped) return mapped;
  return normalized
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

