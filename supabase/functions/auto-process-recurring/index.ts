import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Auto-process recurring obligations:
 * - Marks bills due today or earlier as paid and bumps their next due date.
 * - Marks subscriptions due today or earlier as paid and bumps their next billing date.
 * - Creates a transaction record for each processed item so spending history is preserved.
 *
 * Expected to be triggered by Vercel cron or pg_cron daily.
 */

const FREQUENCY_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  yearly: 365,
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify cron secret for security
  const cronSecret = Deno.env.get('AUTO_PROCESS_CRON_SECRET');
  const authHeader = req.headers.get('Authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const today = new Date().toISOString().split('T')[0];
    const results: Record<string, unknown>[] = [];

    // ── Bills ──
    const billsRes = await supabaseAdmin
      .from('bills')
      .select('id,user_id,biller,amount,due_date,frequency,category')
      .lte('due_date', today)
      .eq('status', 'active');

    if (billsRes.error) throw new Error(`Bills query failed: ${billsRes.error.message}`);

    const bills = billsRes.data ?? [];
    for (const bill of bills) {
      const days = FREQUENCY_DAYS[bill.frequency?.toLowerCase()] ?? 30;
      const nextDue = addDays(bill.due_date, days);

      // Mark bill as paid and bump due date
      const { error: updateErr } = await supabaseAdmin
        .from('bills')
        .update({ status: 'paid', due_date: nextDue, updated_at: new Date().toISOString() })
        .eq('id', bill.id);

      if (updateErr) {
        results.push({ type: 'bill', id: bill.id, success: false, error: updateErr.message });
        continue;
      }

      // Create transaction record
      const { error: txnErr } = await supabaseAdmin.from('transactions').insert({
        user_id: bill.user_id,
        amount: bill.amount,
        description: `Auto-paid: ${bill.biller}`,
        category: bill.category ?? 'bill',
        transaction_date: today,
        source_type: 'bill',
        source_id: bill.id,
      });

      results.push({
        type: 'bill',
        id: bill.id,
        success: true,
        nextDue,
        transactionCreated: !txnErr,
        transactionError: txnErr?.message ?? null,
      });
    }

    // ── Subscriptions ──
    const subsRes = await supabaseAdmin
      .from('subscriptions')
      .select('id,user_id,name,amount,next_billing_date,frequency')
      .lte('next_billing_date', today)
      .eq('status', 'active');

    if (subsRes.error) throw new Error(`Subscriptions query failed: ${subsRes.error.message}`);

    const subs = subsRes.data ?? [];
    for (const sub of subs) {
      const days = FREQUENCY_DAYS[sub.frequency?.toLowerCase()] ?? 30;
      const nextDate = addDays(sub.next_billing_date, days);

      // Bump next billing date
      const { error: updateErr } = await supabaseAdmin
        .from('subscriptions')
        .update({ next_billing_date: nextDate, updated_at: new Date().toISOString() })
        .eq('id', sub.id);

      if (updateErr) {
        results.push({ type: 'subscription', id: sub.id, success: false, error: updateErr.message });
        continue;
      }

      // Create transaction record
      const { error: txnErr } = await supabaseAdmin.from('transactions').insert({
        user_id: sub.user_id,
        amount: sub.amount,
        description: `Auto-paid: ${sub.name}`,
        category: 'subscription',
        transaction_date: today,
        source_type: 'subscription',
        source_id: sub.id,
      });

      results.push({
        type: 'subscription',
        id: sub.id,
        success: true,
        nextDate,
        transactionCreated: !txnErr,
        transactionError: txnErr?.message ?? null,
      });
    }

    const successCount = results.filter((r) => (r as { success: boolean }).success).length;
    const failCount = results.length - successCount;

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successCount,
        failCount,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Auto-process recurring failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
