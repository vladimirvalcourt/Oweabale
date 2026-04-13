import { supabase } from './supabase';

export type AffordabilityVerdict = 'yes' | 'caution' | 'no';

export interface SafeToSpendPayload {
  dailySafeToSpend: number;
  liquidAfterScheduled: number;
  scheduledOutflowsTotal: number;
  daysInWindow: number;
  windowEndLabel: string;
  windowMode: 'to_next_payday' | 'rest_of_month';
  monthlySurplus: number;
}

export interface FinanceInsightsResponse {
  purchaseAmount: number;
  category: string | null;
  liquidCash: number;
  cashFlow: {
    monthlyIncome: number;
    taxReserve: number;
    fixedExpenses: number;
    subscriptions: number;
    surplus: number;
    disposableIncome: number;
  };
  safeToSpend: SafeToSpendPayload;
  verdict: AffordabilityVerdict;
  reasons: string[];
  narrative: string;
  model: string | null;
  aiEnabled?: boolean;
  message?: string;
}

export async function invokeFinanceInsights(
  purchaseAmount: number,
  category?: string,
): Promise<FinanceInsightsResponse> {
  const { data, error } = await supabase.functions.invoke('finance-insights', {
    body: { purchaseAmount, category: category?.trim() || undefined },
  });

  if (error) {
    throw new Error(error.message);
  }

  const d = data as { error?: string } & Partial<FinanceInsightsResponse>;
  if (d?.error) {
    throw new Error(d.error);
  }

  return d as FinanceInsightsResponse;
}
