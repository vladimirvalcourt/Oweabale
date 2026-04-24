/**
 * Vercel Cron Job - Trial Warning Emails
 * Runs daily at 8am UTC to email users with ~7 days left on their trial
 */

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

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
    const WARN_SECRET = process.env.WARN_TRIALS_CRON_SECRET;

    if (!WARN_SECRET) {
      console.error('WARN_TRIALS_CRON_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      'https://hjgrslcapdmmgxeppguu.supabase.co/functions/v1/warn-trials',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WARN_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Trial warning cron failed:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send trial warnings', details: data }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Trial warning emails sent:', data);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Trial warning cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
