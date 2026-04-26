import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Expire Trials Cron Job
 * Runs daily to downgrade expired trial users to tracker tier
 * Triggered by Vercel cron or pg_cron
 */

type ExpiredTrialUser = {
  id: string;
  email: string;
  first_name: string | null;
};

async function fetchExpiredTrials(supabaseAdmin: ReturnType<typeof createClient>): Promise<ExpiredTrialUser[]> {
  const nowIso = new Date().toISOString();

  // Newer reverse-trial schema.
  const reverseTrialQuery = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name')
    .eq('plan', 'trial')
    .lt('trial_ends_at', nowIso)
    .eq('trial_expired', false);

  if (!reverseTrialQuery.error) {
    return (reverseTrialQuery.data ?? []) as ExpiredTrialUser[];
  }

  const message = reverseTrialQuery.error.message.toLowerCase();
  const missingReverseTrialColumns =
    message.includes('column profiles.plan does not exist') ||
    message.includes('column profiles.trial_ends_at does not exist') ||
    message.includes('column profiles.trial_expired does not exist');

  if (!missingReverseTrialColumns) {
    throw new Error(`Query failed: ${reverseTrialQuery.error.message}`);
  }

  // Legacy live schema fallback: derive trial expiry from created_at and subscription_tier.
  const legacyCutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const legacyQuery = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name')
    .eq('subscription_tier', 'trial')
    .lt('created_at', legacyCutoffIso);

  if (legacyQuery.error) {
    throw new Error(`Query failed: ${legacyQuery.error.message}`);
  }

  return (legacyQuery.data ?? []) as ExpiredTrialUser[];
}

async function downgradeExpiredTrial(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const reverseTrialUpdate = await supabaseAdmin
    .from('profiles')
    .update({
      plan: 'tracker',
      trial_expired: true,
    })
    .eq('id', userId);

  if (!reverseTrialUpdate.error) return;

  const message = reverseTrialUpdate.error.message.toLowerCase();
  const missingReverseTrialColumns =
    message.includes('column "plan" of relation "profiles" does not exist') ||
    message.includes('column "trial_expired" of relation "profiles" does not exist');

  if (!missingReverseTrialColumns) {
    throw new Error(reverseTrialUpdate.error.message);
  }

  const legacyUpdate = await supabaseAdmin
    .from('profiles')
    .update({ subscription_tier: 'tracker' })
    .eq('id', userId);

  if (legacyUpdate.error) {
    throw new Error(legacyUpdate.error.message);
  }
}

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
    const expiredTrials = await fetchExpiredTrials(supabaseAdmin);

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
      try {
        await downgradeExpiredTrial(supabaseAdmin, user.id);
        console.log(`Downgraded user ${user.id} (${user.email}) to tracker`);
        results.push({ userId: user.id, success: true });
        
        // Send Day 14 expiry email
        try {
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (resendApiKey) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@oweable.com',
                to: [user.email],
                subject: 'Your Full Suite trial has ended',
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1>Your trial has ended${user.first_name ? `, ${escapeHtml(user.first_name)}` : ''}</h1><p>Your 14-day Full Suite trial has ended. You've been moved to our free Tracker tier.</p><p><a href="https://www.oweable.com/pricing" style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px;">Upgrade to Full Suite — $10.99/mo</a></p></div>`,
              }),
            });
          }
        } catch (emailError) {
          console.error(`Failed to send expiry email to ${user.email}:`, emailError);
        }

        // TODO: Send Day 14 expiry email here (Section 5 - Email 3)
        // await sendTrialExpiredEmail(user.email, user.first_name);
      } catch (updateError) {
        console.error(`Failed to downgrade user ${user.id}:`, updateError);
        results.push({
          userId: user.id,
          success: false,
          error: updateError instanceof Error ? updateError.message : 'Unknown update error',
        });
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
