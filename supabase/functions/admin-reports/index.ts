import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// admin-reports Edge Function
// Action: report_text — generates a simple text summary from passed report data.
// Admin-only: validates the caller is a super admin before processing.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is a super admin.
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const primaryAdminEmail = Deno.env.get('ADMIN_ALLOWED_EMAIL')?.trim().toLowerCase() ?? '';
    const callerEmail = user.email?.trim().toLowerCase() ?? '';
    const { data: roleRows, error: roleErr } = await supabase
      .from('admin_user_roles')
      .select('admin_roles(key)')
      .eq('user_id', user.id);
    if (roleErr) throw roleErr;
    const isSuperAdmin = callerEmail === primaryAdminEmail || (roleRows ?? []).some((row) => {
      const role = (row as { admin_roles?: { key?: string } | { key?: string }[] | null }).admin_roles;
      const firstRole = Array.isArray(role) ? role[0] : role;
      return firstRole?.key === 'super_admin';
    });

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: superadmin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      action: string;
      fromDate?: string;
      toDate?: string;
      rows?: Array<{ date: string; signups: number; tickets: number; feedback: number }>;
      totals?: { signups: number; tickets: number; feedback: number };
    };

    if (body.action !== 'report_text') {
      return new Response(JSON.stringify({ error: `Unknown action: ${body.action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fromDate, toDate, rows = [], totals } = body;

    const lines: string[] = [
      'OWEABLE ADMIN REPORT',
      '====================',
      `Period: ${fromDate ?? 'N/A'} to ${toDate ?? 'N/A'}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'SUMMARY',
      '-------',
      `Total Signups:  ${totals?.signups ?? 0}`,
      `Total Tickets:  ${totals?.tickets ?? 0}`,
      `Total Feedback: ${totals?.feedback ?? 0}`,
      '',
      'DAILY BREAKDOWN',
      '---------------',
      'Date        | Signups | Tickets | Feedback',
      ...rows.map(
        (r) =>
          `${r.date} | ${String(r.signups).padStart(7)} | ${String(r.tickets).padStart(7)} | ${String(r.feedback).padStart(8)}`,
      ),
    ];

    const text = lines.join('\n');
    // Encode as base64 — the frontend will decode and prompt a download
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const base64Chunks: string[] = [];
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      base64Chunks.push(String.fromCharCode(...bytes.slice(i, i + chunkSize)));
    }
    const textBase64 = btoa(base64Chunks.join(''));

    return new Response(JSON.stringify({ textBase64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
