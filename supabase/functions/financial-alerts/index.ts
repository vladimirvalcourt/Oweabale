import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { formatCategoryLabel } from '../_shared/formatCategoryLabel.ts';
import { isWebPushConfigured, sendPushToSubscription } from '../_shared/vapidWebPush.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysUntil(isoDate: string): number | null {
  const raw = isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`;
  const ms = new Date(raw).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.round((ms - Date.now()) / 86400000);
}

function normalizeToMonthly(amount: number, frequency: string): number {
  const f = (frequency ?? '').toLowerCase();
  if (f === 'weekly') return amount * 4.33;
  if (f === 'bi-weekly' || f === 'biweekly') return amount * 2.165;
  if (f === 'yearly' || f === 'annual' || f === 'annually') return amount / 12;
  if (f === 'quarterly') return amount / 3;
  return amount;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertPreferences {
  bill_due_days?: number[];
  over_budget?: boolean;
  low_cash?: boolean;
  debt_due?: boolean;
  invoice_due?: boolean;
}

interface ProcessResult {
  sent: number;
  alerts: string[];
}

function redactId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : 'redacted';
}

// ---------------------------------------------------------------------------
// Core: process one user's financial alerts
// ---------------------------------------------------------------------------

async function processUser(
  supabaseAdmin: ReturnType<typeof createClient>,
  uid: string,
): Promise<ProcessResult> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)
    .toISOString()
    .slice(0, 10);

  // Fetch all data in parallel
  const [
    billsR,
    debtsR,
    budgetsR,
    assetsR,
    txnsR,
    incomesR,
    subsR,
    pushSubsR,
    profileR,
    invoicesR,
  ] = await Promise.all([
    supabaseAdmin
      .from('bills')
      .select('id, biller, amount, due_date, status, frequency')
      .eq('user_id', uid),
    supabaseAdmin
      .from('debts')
      .select('id, name, min_payment, remaining, payment_due_date')
      .eq('user_id', uid),
    supabaseAdmin
      .from('budgets')
      .select('id, category, amount, period')
      .eq('user_id', uid),
    supabaseAdmin
      .from('assets')
      .select('id, type, value')
      .eq('user_id', uid)
      .eq('type', 'Cash'),
    supabaseAdmin
      .from('transactions')
      .select('category, amount, type, date')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .gte('date', sixtyDaysAgo),
    supabaseAdmin
      .from('incomes')
      .select('amount, frequency, status, is_tax_withheld')
      .eq('user_id', uid),
    supabaseAdmin
      .from('subscriptions')
      .select('amount, frequency, status')
      .eq('user_id', uid),
    supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', uid),
    supabaseAdmin
      .from('profiles')
      .select('alert_preferences')
      .eq('id', uid)
      .maybeSingle(),
    supabaseAdmin
      .from('client_invoices')
      .select('id, client_name, amount, due_date, status')
      .eq('user_id', uid),
  ]);

  // Surface data errors loudly in logs but don't crash the whole cron run
  const uidRef = redactId(uid);
  if (billsR.error) console.error(`[financial-alerts] bills fetch failed for user=${uidRef}`);
  if (debtsR.error) console.error(`[financial-alerts] debts fetch failed for user=${uidRef}`);
  if (budgetsR.error) console.error(`[financial-alerts] budgets fetch failed for user=${uidRef}`);
  if (assetsR.error) console.error(`[financial-alerts] assets fetch failed for user=${uidRef}`);
  if (txnsR.error) console.error(`[financial-alerts] transactions fetch failed for user=${uidRef}`);
  if (incomesR.error) console.error(`[financial-alerts] incomes fetch failed for user=${uidRef}`);
  if (subsR.error) console.error(`[financial-alerts] subscriptions fetch failed for user=${uidRef}`);
  if (pushSubsR.error) console.error(`[financial-alerts] push_subscriptions fetch failed for user=${uidRef}`);
  if (profileR.error) console.error(`[financial-alerts] profile fetch failed for user=${uidRef}`);
  if (invoicesR.error) console.error(`[financial-alerts] client_invoices fetch failed for user=${uidRef}`);

  const bills = (billsR.data ?? []) as Record<string, unknown>[];
  const debts = (debtsR.data ?? []) as Record<string, unknown>[];
  const budgets = (budgetsR.data ?? []) as Record<string, unknown>[];
  const assets = (assetsR.data ?? []) as Record<string, unknown>[];
  const txns = (txnsR.data ?? []) as Record<string, unknown>[];
  const incomes = (incomesR.data ?? []) as Record<string, unknown>[];
  const subs = (subsR.data ?? []) as Record<string, unknown>[];
  const pushSubs = (pushSubsR.data ?? []) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  }[];
  const invoices = (invoicesR.data ?? []) as Record<string, unknown>[];

  // No push subscriptions — nothing to do
  if (pushSubs.length === 0) return { sent: 0, alerts: [] };

  // Alert preferences with safe defaults
  const rawPrefs = (profileR.data?.alert_preferences ?? {}) as AlertPreferences;
  const prefs: Required<AlertPreferences> = {
    bill_due_days: Array.isArray(rawPrefs.bill_due_days) ? rawPrefs.bill_due_days : [1, 3],
    over_budget: rawPrefs.over_budget !== false,
    low_cash: rawPrefs.low_cash !== false,
    debt_due: rawPrefs.debt_due !== false,
    invoice_due: rawPrefs.invoice_due !== false,
  };

  // ---------------------------------------------------------------------------
  // Cash flow calculations
  // ---------------------------------------------------------------------------

  const liquidCash = assets.reduce((sum, a) => sum + num(a.value), 0);

  const monthlyIncome = incomes.reduce((sum, inc) => {
    if (str(inc.status) !== 'active') return sum;
    return sum + normalizeToMonthly(num(inc.amount), str(inc.frequency) || 'monthly');
  }, 0);

  const taxReserve = incomes.reduce((sum, inc) => {
    if (str(inc.status) !== 'active') return sum;
    if (Boolean(inc.is_tax_withheld)) return sum;
    return sum + normalizeToMonthly(num(inc.amount), str(inc.frequency) || 'monthly') * 0.25;
  }, 0);

  const fixedExpenses = bills.reduce((sum, b) => {
    if (str(b.status) === 'paid') return sum;
    return sum + normalizeToMonthly(num(b.amount), str(b.frequency) || 'monthly');
  }, 0) + debts.reduce((sum, d) => {
    if (num(d.remaining) <= 0) return sum;
    return sum + num(d.min_payment);
  }, 0);

  const subsMonthly = subs.reduce((sum, s) => {
    if (str(s.status) !== 'active') return sum;
    return sum + normalizeToMonthly(num(s.amount), str(s.frequency) || 'monthly');
  }, 0);

  const surplus = monthlyIncome - taxReserve - fixedExpenses - subsMonthly;
  const dailySurplus = surplus / 30;
  const lowCashThreshold = dailySurplus * 7;

  // ---------------------------------------------------------------------------
  // Current-month spend by category
  // ---------------------------------------------------------------------------

  const spendByCategory: Record<string, number> = {};
  for (const txn of txns) {
    const txnDate = str(txn.date);
    if (txnDate < monthStart) continue; // only this month
    const cat = str(txn.category) || 'Uncategorized';
    spendByCategory[cat] = (spendByCategory[cat] ?? 0) + num(txn.amount);
  }

  // ---------------------------------------------------------------------------
  // Condition checks
  // ---------------------------------------------------------------------------

  const alertMessages: string[] = [];

  // 1. Bills due soon
  if (prefs.bill_due_days.length > 0) {
    for (const bill of bills) {
      if (str(bill.status) === 'paid') continue;
      const dueDate = str(bill.due_date ?? bill.dueDate);
      if (!dueDate) continue;
      const days = daysUntil(dueDate);
      if (days !== null && prefs.bill_due_days.includes(days)) {
        const billerName = str(bill.biller) || 'A bill';
        const amt = num(bill.amount);
        alertMessages.push(
          `${billerName} ($${amt.toFixed(2)}) is due in ${days} day${days === 1 ? '' : 's'}.`,
        );
      }
    }
  }

  // 2. Over budget
  if (prefs.over_budget) {
    for (const budget of budgets) {
      const cat = str(budget.category);
      const budgetAmt = num(budget.amount);
      if (!cat || budgetAmt <= 0) continue;
      const spent = spendByCategory[cat] ?? 0;
      if (spent > budgetAmt) {
        alertMessages.push(
          `You're over budget in ${formatCategoryLabel(cat)}: spent $${spent.toFixed(2)} vs $${budgetAmt.toFixed(2)} limit.`,
        );
      }
    }
  }

  // 3. Low cash
  if (prefs.low_cash && lowCashThreshold > 0 && liquidCash < lowCashThreshold) {
    alertMessages.push(
      `Low cash: $${liquidCash.toFixed(2)} liquid — below your 7-day cushion of $${lowCashThreshold.toFixed(2)}.`,
    );
  }

  // 4. Debt payment due
  if (prefs.debt_due) {
    for (const debt of debts) {
      const pdd = str(debt.payment_due_date ?? debt.paymentDueDate);
      if (!pdd) continue;
      const days = daysUntil(pdd);
      if (days === 2) {
        const debtName = str(debt.name) || 'A debt payment';
        const minPmt = num(debt.min_payment);
        alertMessages.push(
          `${debtName} payment of $${minPmt.toFixed(2)} is due in 2 days.`,
        );
      }
    }
  }

  // 5. Client invoices (AR)
  if (prefs.invoice_due) {
    for (const inv of invoices) {
      const st = str(inv.status);
      if (st === 'paid' || st === 'void') continue;
      const due = str(inv.due_date);
      if (!due) continue;
      const days = daysUntil(due);
      const client = str(inv.client_name) || 'Client';
      const amt = num(inv.amount);
      if (days !== null && days < 0) {
        alertMessages.push(`Invoice for ${client} ($${amt.toFixed(2)}) is overdue.`);
      } else if (days !== null && st === 'sent' && prefs.bill_due_days.includes(days)) {
        alertMessages.push(`Invoice for ${client} ($${amt.toFixed(2)}) is due in ${days} day${days === 1 ? '' : 's'}.`);
      }
    }
  }

  // No alerts triggered — nothing to send
  if (alertMessages.length === 0) return { sent: 0, alerts: [] };

  // ---------------------------------------------------------------------------
  // Send ONE push combining all alerts
  // ---------------------------------------------------------------------------

  const pushTitle = 'Oweable Alert';
  const pushBody = alertMessages.join(' | ');

  let sent = 0;
  for (const sub of pushSubs) {
    try {
      await sendPushToSubscription(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title: pushTitle, body: pushBody },
      );
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[financial-alerts] push send failed for user=${uidRef}`);
      // 410 Gone: subscription is expired — remove it
      if (/410|Gone|not found/i.test(msg)) {
        try {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('user_id', uid)
            .eq('endpoint', sub.endpoint);
          console.info(`[financial-alerts] removed stale subscription for user=${uidRef}`);
        } catch (delErr) {
          console.error(`[financial-alerts] failed to delete stale subscription for user=${uidRef}`);
        }
      }
    }
  }

  return { sent, alerts: alertMessages };
}

// ---------------------------------------------------------------------------
// Deno.serve entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const ch = corsHeaders(origin, req.headers);

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
    if (!isWebPushConfigured()) {
      return new Response(
        JSON.stringify({ error: 'Web Push is not configured (VAPID keys missing).' }),
        { status: 503, headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Server misconfiguration');

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cronSecret = Deno.env.get('FINANCIAL_ALERTS_CRON_SECRET');
    const authHeader = req.headers.get('Authorization') ?? '';

    // ------------------------------------------------------------------
    // CRON MODE — called by scheduler with the shared secret
    // ------------------------------------------------------------------
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      const { data: subRows, error: subErr } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id');

      if (subErr) throw subErr;

      // Deduplicate user IDs (one user may have several subscribed devices)
      const userIds = [...new Set((subRows ?? []).map((r) => r.user_id as string))];

      const results = await Promise.all(
        userIds.map((uid) =>
          processUser(supabaseAdmin, uid).catch((err) => {
            console.error(`[financial-alerts] processUser failed for user=${redactId(uid)}`);
            return { sent: 0, alerts: [] } as ProcessResult;
          }),
        ),
      );

      const totalSent = results.reduce((acc, r) => acc + r.sent, 0);
      return new Response(
        JSON.stringify({ ok: true, processed: userIds.length, sent: totalSent }),
        { headers: { ...ch, 'Content-Type': 'application/json' } },
      );
    }

    // ------------------------------------------------------------------
    // USER MODE — called by authenticated browser client
    // ------------------------------------------------------------------
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const result = await processUser(supabaseAdmin, user.id);

    return new Response(
      JSON.stringify({ ok: true, sent: result.sent, alerts: result.alerts }),
      { headers: { ...ch, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[financial-alerts] unhandled error:', e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : String(e);
    const status = msg === 'Unauthorized' ? 401 : msg === 'Server misconfiguration' ? 503 : 500;
    const safe = /unauthorized|missing or invalid authorization header|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status,
      headers: { ...corsHeaders(req.headers.get('origin'), req.headers), 'Content-Type': 'application/json' },
    });
  }
});
