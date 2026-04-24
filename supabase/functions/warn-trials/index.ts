import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Warn Trials Cron Job
 * Runs daily to email trial users who have ~7 days remaining.
 * Uses a 24-hour window centered on 7 days to ensure each user
 * is emailed exactly once regardless of when they started their trial.
 */

Deno.serve(async (req: Request) => {
  const cronSecret = Deno.env.get('WARN_TRIALS_CRON_SECRET');
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

    // Find users with 6.5–7.5 days remaining so each user is caught once per daily run
    const windowStart = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(Date.now() + 7.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, trial_ends_at')
      .eq('plan', 'trial')
      .eq('trial_expired', false)
      .gte('trial_ends_at', windowStart)
      .lte('trial_ends_at', windowEnd);

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, warnedCount: 0, message: 'No users in 7-day window' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending trial warning emails to ${users.length} users`);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('ADMIN_ALERTS_FROM_EMAIL') ?? 'alerts@oweable.com';

    const results = [];
    for (const user of users) {
      const daysRemaining = Math.ceil(
        (new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const firstName = user.first_name ?? 'there';

      try {
        if (resendApiKey) {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [user.email],
              subject: `${daysRemaining} days left on your Full Suite trial`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">${daysRemaining} days left, ${escapeHtml(firstName)}</h1>
                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                    Your Full Suite trial ends in ${daysRemaining} days. After that, you'll automatically move to our free Tracker tier.
                  </p>
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      <strong>What happens next?</strong><br/>
                      You'll keep bill tracking and due-date alerts for free. To keep your debt planner, income ledger, and tax tools, upgrade to Full Suite.
                    </p>
                  </div>
                  <div style="margin: 30px 0; text-align: center;">
                    <a href="https://www.oweable.com/pricing"
                       style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Plans & Upgrade →
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                    No pressure — the free Tracker tier is useful for managing bills and fines. But if you want the full toolkit, now's the time.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  <p style="color: #9ca3af; font-size: 12px;">
                    Questions? Visit <a href="https://www.oweable.com/support" style="color: #f59e0b;">our support page</a>.
                  </p>
                </div>
              `,
              text: `${daysRemaining} days left on your Full Suite trial\n\nHi ${firstName},\n\nYour Full Suite trial ends in ${daysRemaining} days. After that, you'll move to the free Tracker tier.\n\nUpgrade: https://www.oweable.com/pricing`,
            }),
          });

          if (!res.ok) {
            const body = await res.text();
            throw new Error(`Resend failed: ${body}`);
          }
        }

        console.log(`Sent warning email to ${user.email}`);
        results.push({ userId: user.id, success: true });
      } catch (emailError) {
        console.error(`Failed to email ${user.email}:`, emailError);
        results.push({
          userId: user.id,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ success: true, warnedCount: users.length, successCount, failCount, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Warn-trials cron failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
