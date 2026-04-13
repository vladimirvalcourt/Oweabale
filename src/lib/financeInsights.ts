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
  /** HF model id used or configured for narration (Router API). Present when Edge Function is updated. */
  narrationModelId?: string;
  message?: string;
}

/** Default HF model if `HF_INFERENCE_MODEL` is unset — keep in sync with `finance-insights` Edge Function. */
export const FINANCE_INSIGHTS_DEFAULT_HF_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct';

export async function invokeFinanceInsights(
  purchaseAmount: number,
  category?: string,
): Promise<FinanceInsightsResponse> {
  const body = { purchaseAmount, category: category?.trim() || undefined };
  const doInvoke = () => supabase.functions.invoke('finance-insights', { body });

  // Invoke first; only refresh + retry on 401/403. Proactive refreshSession() can fail spuriously and
  // block users who still have a valid access token.
  let { data, error } = await doInvoke();

  if (error instanceof FunctionsHttpError) {
    const st = error.context.status;
    if (st === 401 || st === 403) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr) {
        ({ data, error } = await doInvoke());
      }
    }
  }

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
