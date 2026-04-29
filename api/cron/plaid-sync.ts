/**
 * Vercel Cron Job - Plaid transaction sync
 * Runs periodically to catch stale Plaid items when webhooks are delayed or missed.
 */

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const plaidCronSecret = process.env.PLAID_CRON_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    if (!plaidCronSecret || !supabaseUrl) {
      console.error('Plaid cron environment is not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/plaid-sync`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${plaidCronSecret}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Plaid sync cron failed:', data);
      return new Response(JSON.stringify({ error: 'Failed to sync Plaid items', details: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Plaid sync cron completed:', data);
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Plaid sync cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
