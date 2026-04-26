/**
 * Vercel Cron Job - Expire Trials
 * Runs daily at midnight UTC to downgrade expired trial users
 */

export default async function handler(req: Request) {
  // Vercel Crons send GET; reject everything else
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify Vercel cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const CRON_SECRET = process.env.EXPIRE_TRIALS_CRON_SECRET;
    
    if (!CRON_SECRET) {
      console.error('EXPIRE_TRIALS_CRON_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Supabase Edge Function
    const response = await fetch(
      'https://hjgrslcapdmmgxeppguu.supabase.co/functions/v1/expire-trials',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Expire trials failed:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to expire trials',
          details: data 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Expire trials completed successfully:', data);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cron job error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
