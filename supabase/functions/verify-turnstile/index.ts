import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const c = corsHeaders(origin, req.headers);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { token } = (await req.json()) as { token?: string };

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'No token provided' }), {
        status: 400,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const secret = Deno.env.get('CF_TURNSTILE_SECRET_KEY');
    if (!secret) {
      return new Response(JSON.stringify({ success: false, error: 'Server misconfiguration' }), {
        status: 500,
        headers: { ...c, 'Content-Type': 'application/json' },
      });
    }

    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = (await cfRes.json()) as { success?: boolean };

    return new Response(JSON.stringify({ success: outcome.success === true }), {
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }
});
