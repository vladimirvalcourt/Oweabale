export type FinancialAlertPrefs = {
  billDueDays: number[];
  overBudget: boolean;
  lowCash: boolean;
  debtDue: boolean;
  invoiceDue: boolean;
};

export const DEFAULT_FINANCIAL_ALERT_PREFS: FinancialAlertPrefs = {
  billDueDays: [1, 3],
  overBudget: true,
  lowCash: true,
  debtDue: true,
  invoiceDue: true,
};

export function normalizeFinancialAlertPrefs(raw: unknown): FinancialAlertPrefs {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const days = o.bill_due_days;
  const billDueDays = Array.isArray(days)
    ? days.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    : DEFAULT_FINANCIAL_ALERT_PREFS.billDueDays;
  return {
    billDueDays: billDueDays.length > 0 ? billDueDays : [],
    overBudget: o.over_budget !== false,
    lowCash: o.low_cash !== false,
    debtDue: o.debt_due !== false,
    invoiceDue: o.invoice_due !== false,
  };
}
