import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { corsHeaders } from '../_shared/cors.ts';

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
      .select('is_admin')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile?.is_admin) throw new Error('Forbidden');

    const body = (await req.json()) as {
      action?: string;
      fromDate?: string;
      toDate?: string;
      rows?: Array<{ date: string; signups: number; tickets: number; feedback: number }>;
      totals?: { signups: number; tickets: number; feedback: number };
    };
    if (body.action !== 'report_pdf') throw new Error('Unsupported action');
    const rows = body.rows ?? [];
    const totals = body.totals ?? { signups: 0, tickets: 0, feedback: 0 };

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    page.drawText('Admin Report', { x: 48, y: 752, size: 18, font: bold, color: rgb(0, 0, 0) });
    page.drawText(`Range: ${body.fromDate ?? '—'} to ${body.toDate ?? '—'}`, { x: 48, y: 732, size: 10, font });
    page.drawText(`Totals — Signups: ${totals.signups}, Tickets: ${totals.tickets}, Feedback: ${totals.feedback}`, {
      x: 48,
      y: 715,
      size: 10,
      font,
    });

    let y = 690;
    page.drawText('Date', { x: 48, y, size: 10, font: bold });
    page.drawText('Signups', { x: 180, y, size: 10, font: bold });
    page.drawText('Tickets', { x: 260, y, size: 10, font: bold });
    page.drawText('Feedback', { x: 330, y, size: 10, font: bold });
    y -= 16;

    for (const row of rows.slice(0, 35)) {
      page.drawText(row.date, { x: 48, y, size: 9, font });
      page.drawText(String(row.signups), { x: 180, y, size: 9, font });
      page.drawText(String(row.tickets), { x: 260, y, size: 9, font });
      page.drawText(String(row.feedback), { x: 330, y, size: 9, font });
      y -= 14;
      if (y < 72) break;
    }

    const bytes = await pdf.save();
    const base64 = btoa(String.fromCharCode(...bytes));
    return new Response(JSON.stringify({ ok: true, pdfBase64: base64 }), { headers: jsonHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    const safe = /unauthorized|forbidden|missing|unsupported|method not allowed/i.test(msg)
      ? msg
      : 'Request failed';
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
});
