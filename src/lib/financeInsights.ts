import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

async function messageFromFunctionsHttpError(err: FunctionsHttpError): Promise<string> {
  const res = err.context as Response;
  try {
    const clone = res.clone();
    const body = (await clone.json()) as { error?: string; message?: string };
    if (typeof body.error === 'string' && body.error.trim()) {
      const e = body.error.trim();
      if (/invalid\s*jwt/i.test(e)) {
        return 'Sign in again to use this check. Your session may have expired.';
      }
      return e;
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      const m = body.message.trim();
      if (/invalid\s*jwt/i.test(m)) {
        return 'Sign in again to use this check. Your session may have expired.';
      }
      return m;
    }
  } catch {
    try {
      const text = (await res.text()).trim();
      if (text) {
        if (/invalid\s*jwt/i.test(text)) {
          return 'Sign in again to use this check. Your session may have expired.';
        }
        return text.slice(0, 500);
      }
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
  // Refresh access JWT before calling Edge Functions (avoids "Invalid JWT" from expired tokens).
  // Do not pass a manual Authorization header — the client fetch layer must attach the same token it
  // gets from getAccessToken() after refresh, or we can race and send a stale Bearer token.
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !refreshed.session?.access_token) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('Sign in again to use this check. Your session may have expired.');
    }
  }

  const { data, error } = await supabase.functions.invoke('finance-insights', {
    body: { purchaseAmount, category: category?.trim() || undefined },
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
