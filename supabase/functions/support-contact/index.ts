import { corsHeaders } from '../_shared/cors.ts';

type SupportPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
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
    const payload = (await req.json()) as SupportPayload;

    // Validate required fields
    if (!payload.name?.trim()) throw new Error('Name is required');
    if (!payload.email?.trim()) throw new Error('Email is required');
    if (!payload.message?.trim()) throw new Error('Message is required');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) throw new Error('Invalid email format');

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supportEmail = Deno.env.get('SUPPORT_EMAIL') ?? 'support@oweable.com';

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY');
    }

    const fromEmail = Deno.env.get('ADMIN_ALERTS_FROM_EMAIL') ?? 'alerts@oweable.com';
    const subject = payload.subject?.trim() || 'Oweable support request';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        replyTo: payload.email.trim(),
        subject: `[Support] ${subject}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>Name:</strong> ${escapeHtml(payload.name.trim())}</p>
          <p><strong>Email:</strong> ${escapeHtml(payload.email.trim())}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(payload.message.trim())}</p>
        `,
        text: `New Support Request\n\nName: ${payload.name.trim()}\nEmail: ${payload.email.trim()}\nSubject: ${subject}\n\nMessage:\n${payload.message.trim()}`,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Resend failed: ${errorBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    const safe = /required|invalid|missing|method not allowed/i.test(msg)
      ? msg
      : 'Failed to send message. Please try again or email support directly.';
    return new Response(
      JSON.stringify({ error: safe }),
      { status: 400, headers: jsonHeaders },
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
