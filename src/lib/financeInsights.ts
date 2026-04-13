import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

async function messageFromFunctionsHttpError(err: FunctionsHttpError): Promise<string> {
  const res = err.context as Response;
  try {
    const clone = res.clone();
    const body = (await clone.json()) as { error?: string; message?: string };
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  } catch {
    try {
      const text = (await res.text()).trim();
      if (text) return text.slice(0, 500);
    } catch {
      /* ignore */
    }
  }
  if (res.status === 401 || res.status === 403) {
    return 'Sign in again to use this check (your session may have expired).';
  }
  return err.message;
}

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sign in to use “Can I afford this?”');
  }

  const { data, error } = await supabase.functions.invoke('finance-insights', {
    body: { purchaseAmount, category: category?.trim() || undefined },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      throw new Error(await messageFromFunctionsHttpError(error));
    }
    throw new Error(error.message);
  }

  const d = data as { error?: string } & Partial<FinanceInsightsResponse>;
  if (d?.error) {
    throw new Error(d.error);
  }

  return d as FinanceInsightsResponse;
}
