/**
 * Shared category lists for Quick Entry, Review Inbox, and related UIs.
 * Expense/bill values are lowercase slugs stored on transactions & bills.
 */

export const EXPENSE_BILL_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'housing', label: 'Housing & rent' },
  { value: 'utilities', label: 'Utilities & telecom' },
  { value: 'insurance', label: 'Insurance (auto, home, etc.)' },
  { value: 'life_disability_insurance', label: 'Life & disability insurance' },
  { value: 'subscriptions', label: 'Subscriptions & streaming' },
  { value: 'auto', label: 'Auto, loan & car expenses' },
  { value: 'transport', label: 'Gas, transit, parking & tolls' },
  { value: 'food', label: 'Food & dining' },
  { value: 'shopping', label: 'Shopping & retail' },
  { value: 'health', label: 'Health & medical' },
  { value: 'childcare', label: 'Childcare, babysitting & after-school' },
  { value: 'daycare', label: 'Daycare & preschool' },
  { value: 'child_support', label: 'Child support (paid out)' },
  { value: 'alimony', label: 'Alimony (paid out)' },
  { value: 'education', label: 'Education & student loans' },
  { value: 'pets', label: 'Pets & vet' },
  { value: 'personal', label: 'Personal care, gym & wellness' },
  { value: 'travel', label: 'Travel & vacation' },
  { value: 'entertainment', label: 'Entertainment & hobbies' },
  { value: 'gifts_charity', label: 'Gifts & charitable giving' },
  { value: 'taxes', label: 'Taxes & licensing' },
  { value: 'legal', label: 'Legal & professional fees' },
  { value: 'business', label: 'Business & software' },
  { value: 'debt', label: 'Debt payments & credit' },
  { value: 'cash_misc', label: 'Cash, ATM & miscellaneous' },
  { value: 'other', label: 'Other' },
];

/** Labels for analytics / UI (slug → display) */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EXPENSE_BILL_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

export const INCOME_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Salary', label: 'Salary / W-2 wages' },
  { value: 'Freelance', label: 'Freelance & contract (1099)' },
  { value: 'Self-employed', label: 'Self-employed & gig' },
  { value: 'Bonus', label: 'Bonus & commission' },
  { value: 'Child support received', label: 'Child support (received)' },
  { value: 'Alimony received', label: 'Alimony (received)' },
  { value: 'Government benefits', label: 'Government benefits (SSDI, SSI, SNAP, etc.)' },
  { value: 'Unemployment', label: 'Unemployment benefits' },
  { value: 'Retirement', label: 'Retirement & pension' },
  { value: 'Investment income', label: 'Investment & dividend income' },
  { value: 'Rental income', label: 'Rental & property income' },
  { value: 'Reimbursements', label: 'Employer reimbursements' },
  { value: 'Other', label: 'Other income' },
];
