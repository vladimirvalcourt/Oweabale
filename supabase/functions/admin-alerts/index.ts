import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type AlertPayload = {
  title: string;
  body: string;
  severity?: 'info' | 'warning' | 'critical';
  source?: string;
  sendEmail?: boolean;
};

Deno.serve(async (req: Request) => {
  const c = corsHeaders(req.headers.get('origin'), req.headers);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: c });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }
  const jsonHeaders = { ...c, 'Content-Type': 'application/json' as const };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData.user) throw new Error('Unauthorized');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, email')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile?.is_admin) throw new Error('Forbidden');

    const payload = (await req.json()) as AlertPayload;
    if (!payload.title?.trim() || !payload.body?.trim()) throw new Error('title and body are required');

    const severity = payload.severity ?? 'info';
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('system_notifications')
      .insert({
        title: payload.title.trim(),
        body: payload.body.trim(),
        severity,
        source: payload.source ?? 'admin',
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;

    const shouldSendEmail = payload.sendEmail === true;
    if (shouldSendEmail) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const alertsEmail = Deno.env.get('ADMIN_ALERTS_TO_EMAIL') ?? profile.email ?? null;
      if (!resendApiKey || !alertsEmail) {
        throw new Error('Missing RESEND_API_KEY or ADMIN_ALERTS_TO_EMAIL');
      }
      const fromEmail = Deno.env.get('ADMIN_ALERTS_FROM_EMAIL') ?? 'alerts@oweable.com';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [alertsEmail],
          subject: `[Admin Alert][${severity.toUpperCase()}] ${payload.title.trim()}`,
          text: payload.body.trim(),
        }),
      });
      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend failed: ${errorBody}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), { headers: jsonHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    const safe = /unauthorized|forbidden|required|missing|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(
      JSON.stringify({ error: safe }),
      { status: 400, headers: jsonHeaders },
    );
  }
});
