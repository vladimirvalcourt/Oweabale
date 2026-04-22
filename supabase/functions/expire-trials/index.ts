import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Expire Trials Cron Job
 * Runs daily to downgrade expired trial users to tracker tier
 * Triggered by Vercel cron or pg_cron
 */

Deno.serve(async (req: Request) => {
  // Verify cron secret for security
  const cronSecret = Deno.env.get('EXPIRE_TRIALS_CRON_SECRET');
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

    // Find all expired trials that haven't been processed yet
    const { data: expiredTrials, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name')
      .eq('plan', 'trial')
      .lt('trial_ends_at', new Date().toISOString())
      .eq('trial_expired', false);

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ success: true, expiredCount: 0, message: 'No expired trials found' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredTrials.length} expired trials to process`);

    // Downgrade each expired trial to tracker
    const results = [];
    for (const user of expiredTrials) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'tracker',
          trial_expired: true
        })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Failed to downgrade user ${user.id}:`, updateError);
        results.push({ userId: user.id, success: false, error: updateError.message });
      } else {
        console.log(`Downgraded user ${user.id} (${user.email}) to tracker`);
        results.push({ userId: user.id, success: true });

        // TODO: Send Day 14 expiry email here (Section 5 - Email 3)
        // await sendTrialExpiredEmail(user.email, user.first_name);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        expiredCount: expiredTrials.length,
        successCount,
        failCount,
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Expire trials cron failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
