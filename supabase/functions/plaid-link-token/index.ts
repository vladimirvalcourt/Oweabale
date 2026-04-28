import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { plaidPost } from '../_shared/plaid_client.ts';
import { hasPaidFullSuiteAccess } from '../_shared/plaidAccess.ts';
import { enforceRateLimit, rateLimiters, createRateLimitHeaders, getClientIp } from '../_shared/rateLimiter.ts';

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

  // Enforce rate limiting (30 requests per minute per IP)
  const rateLimitCheck = await enforceRateLimit(req, rateLimiters.api);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response!;
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
    const hasPaidAccess = await hasPaidFullSuiteAccess(supabaseAdmin, user.id);
    if (!hasPaidAccess) {
      return new Response(JSON.stringify({ error: 'Plaid is available on Full Suite only.' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const { data: platform } = await supabaseAdmin.from('platform_settings').select('plaid_enabled').maybeSingle();
    if (platform && platform.plaid_enabled === false) {
      return new Response(JSON.stringify({ error: 'Bank linking is temporarily disabled.' }), {
        status: 403,
        headers: { ...ch, 'Content-Type': 'application/json' },
      });
    }

    const bodyJson = (await req.json().catch(() => ({}))) as { mode?: string };
    const isUpdate = bodyJson.mode === 'update';
    const clientName = Deno.env.get('PLAID_CLIENT_NAME') ?? 'Oweable';
    const webhookUrl =
      Deno.env.get('PLAID_WEBHOOK_URL') ??
      `${new URL(supabaseUrl).origin}/functions/v1/plaid-webhook`;
    const requestOrigin = origin && /^https?:\/\//.test(origin) ? origin : 'https://oweable.com';
    const redirectUri = Deno.env.get('PLAID_REDIRECT_URI') ?? `${requestOrigin}/plaid/callback`;

    let out: { link_token?: string };

    if (isUpdate) {
      const { data: item, error: itemErr } = await supabaseAdmin
        .from('plaid_items')
        .select('access_token')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (itemErr) throw itemErr;
      if (!item?.access_token) {
        throw new Error('No linked bank to update. Connect a bank first.');
      }

      out = await plaidPost<{ link_token?: string }>('/link/token/create', {
        user: { client_user_id: user.id },
        client_name: clientName,
        access_token: item.access_token,
        country_codes: ['US'],
        language: 'en',
        webhook: webhookUrl,
        redirect_uri: redirectUri,
      });
    } else {
      out = await plaidPost<{ link_token?: string }>('/link/token/create', {
        user: { client_user_id: user.id },
        client_name: clientName,
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
        webhook: webhookUrl,
        redirect_uri: redirectUri,
      });
    }

    if (!out.link_token) throw new Error('No link_token from Plaid');

    return new Response(JSON.stringify({ link_token: out.link_token }), {
      headers: { ...ch, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[plaid-link-token] Error:', msg, e);
    const safe = /unauthorized|missing authorization header|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: { ...corsHeaders(req.headers.get('origin'), req.headers), 'Content-Type': 'application/json' },
    });
  }
});
