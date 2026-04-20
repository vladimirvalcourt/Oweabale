export type UiPreferences = {
  currency: string;
  dateFormat: string;
  fiscalYearStart: string;
  defaultDashboardView: string;
  monthlySpendingLimit: string;
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  currency: 'USD ($)',
  dateFormat: 'MM/DD/YYYY',
  fiscalYearStart: 'January',
  defaultDashboardView: 'Cash Flow',
  monthlySpendingLimit: '5000',
};

export function normalizeUiPreferences(raw: unknown): UiPreferences {
  const base = { ...DEFAULT_UI_PREFERENCES };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const str = (k: keyof UiPreferences, fallback: string) =>
    typeof o[k] === 'string' && (o[k] as string).length > 0 ? (o[k] as string) : fallback;
  return {
    currency: str('currency', base.currency),
    dateFormat: str('dateFormat', base.dateFormat),
    fiscalYearStart: str('fiscalYearStart', base.fiscalYearStart),
    defaultDashboardView: str('defaultDashboardView', base.defaultDashboardView),
    monthlySpendingLimit: str('monthlySpendingLimit', base.monthlySpendingLimit),
  };
}
