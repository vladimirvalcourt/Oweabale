import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  calcMonthlyCashFlow,
  classifyAffordability,
  computeSafeToSpend,
} from '../_shared/finance_safe_to_spend.ts';

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function citationDaysLeft(row: Record<string, unknown>): number {
  const dateStr = row.date as string | null | undefined;
  if (dateStr) {
    const d = new Date(dateStr);
    const t = d.getTime();
    if (!Number.isNaN(t)) {
      return Math.ceil((t - Date.now()) / 86400000);
    }
  }
  return Math.round(num(row.days_left ?? row.daysLeft));
}

function buildNarrative(
  verdict: string,
  purchaseAmount: number,
  reasons: string[],
  safe: ReturnType<typeof computeSafeToSpend>,
  liquidCash: number,
): string {
  const vLabel = verdict === 'yes' ? 'Yes' : verdict === 'caution' ? 'Caution' : 'No';
  return [
    `The app’s rule-based check: ${vLabel} for a $${purchaseAmount.toFixed(2)} purchase.`,
    `Liquid cash: $${liquidCash.toFixed(2)}. After scheduled items through ${safe.windowEndLabel}: $${safe.liquidAfterScheduled.toFixed(2)} left. Estimated safe-to-spend: about $${safe.dailySafeToSpend.toFixed(2)}/day over ${safe.daysInWindow} day(s).`,
    reasons.length ? `Reasons: ${reasons.join(' ')}` : '',
    'This is informational only—not financial, tax, or legal advice.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: ch });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Server misconfiguration');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing Authorization header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const body = (await req.json().catch(() => ({}))) as {
      purchaseAmount?: unknown;
      category?: unknown;
    };
    const purchaseAmount = num(body.purchaseAmount);
    const category = str(body.category).slice(0, 80) || undefined;

    if (purchaseAmount <= 0 || purchaseAmount > 1_000_000_000) {
      return new Response(JSON.stringify({ error: 'purchaseAmount must be between 0 and 1e9.' }), {
        status: 400,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;
    const scheduleBaseMs = Date.now();

    const [billsR, debtsR, assetsR, incomesR, subsR, citR] = await Promise.all([
      supabaseAdmin.from('bills').select('amount,frequency,status,due_date,biller,category').eq('user_id', uid),
      supabaseAdmin.from('debts').select('remaining,min_payment,payment_due_date').eq('user_id', uid),
      supabaseAdmin.from('assets').select('type,value').eq('user_id', uid),
      supabaseAdmin.from('incomes').select('amount,frequency,status,is_tax_withheld,next_date').eq('user_id', uid),
      supabaseAdmin.from('subscriptions').select('amount,frequency,status,next_billing_date').eq('user_id', uid),
      supabaseAdmin.from('citations').select('status,amount,date').eq('user_id', uid),
    ]);

    if (billsR.error) throw billsR.error;
    if (debtsR.error) throw debtsR.error;
    if (assetsR.error) throw assetsR.error;
    if (incomesR.error) throw incomesR.error;
    if (subsR.error) throw subsR.error;
    if (citR.error) throw citR.error;

    const bills = (billsR.data || []) as Record<string, unknown>[];
    const debts = (debtsR.data || []) as Record<string, unknown>[];
    const assets = (assetsR.data || []) as Record<string, unknown>[];
    const incomes = (incomesR.data || []) as Record<string, unknown>[];
    const subscriptions = (subsR.data || []) as Record<string, unknown>[];
    const citations = (citR.data || []) as Record<string, unknown>[];

    const liquidCash = assets
      .filter((a) => str(a.type).toLowerCase() === 'cash')
      .reduce((s, a) => s + num(a.value), 0);

    const billsCf = bills.map((b) => ({
      amount: num(b.amount),
      frequency: str(b.frequency) || 'Monthly',
      status: str(b.status) || 'upcoming',
    }));

    const debtsCf = debts.map((d) => ({
      remaining: num(d.remaining),
      minPayment: num(d.min_payment ?? d.minPayment),
    }));

    const incomesCf = incomes.map((i) => ({
      amount: num(i.amount),
      frequency: str(i.frequency) || 'Monthly',
      status: str(i.status) || 'active',
      isTaxWithheld: Boolean(i.is_tax_withheld ?? i.isTaxWithheld),
    }));

    const subsCf = subscriptions.map((s) => ({
      amount: num(s.amount),
      frequency: str(s.frequency) || 'Monthly',
      status: str(s.status) || 'active',
    }));

    const cashFlow = calcMonthlyCashFlow(incomesCf, billsCf, debtsCf, subsCf);

    const safe = computeSafeToSpend({
      liquidCash,
      monthlySurplus: cashFlow.surplus,
      bills: bills.map((b) => ({
        dueDate: str(b.due_date ?? b.dueDate),
        amount: num(b.amount),
        status: str(b.status) || 'upcoming',
      })),
      incomes: incomes.map((i) => ({
        nextDate: str(i.next_date ?? i.nextDate),
        status: str(i.status) || 'active',
      })),
      subscriptions: subscriptions.map((s) => ({
        nextBillingDate: str(s.next_billing_date ?? s.nextBillingDate),
        amount: num(s.amount),
        status: str(s.status) || 'active',
      })),
      debts: debts.map((d) => ({
        minPayment: num(d.min_payment ?? d.minPayment),
        remaining: num(d.remaining),
        paymentDueDate: (d.payment_due_date ?? d.paymentDueDate ?? null) as string | null,
      })),
      citations: citations.map((c) => ({
        status: str(c.status) || 'open',
        daysLeft: citationDaysLeft(c),
        amount: num(c.amount),
      })),
      scheduleBaseMs,
    });

    const { verdict, reasons } = classifyAffordability(purchaseAmount, liquidCash, safe);

    const facts = {
      purchaseAmount,
      category: category ?? null,
      liquidCash: parseFloat(liquidCash.toFixed(2)),
      cashFlow,
      safeToSpend: safe,
      verdict,
      reasons,
    };

    return new Response(
      JSON.stringify({
        ...facts,
        narrative: buildNarrative(verdict, purchaseAmount, reasons, safe, liquidCash),
      }),
      { status: 200, headers: { ...ch, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[finance-insights]', e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    const status =
      msg === 'Unauthorized' || msg === 'Missing Authorization header' ? 401 : 500;
    const safe = /unauthorized|missing authorization header|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status,
      headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
    });
  }
});
