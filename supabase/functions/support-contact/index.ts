import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, rateLimiters, getClientIp } from '../_shared/rateLimiter.ts';

type SupportPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken?: string;
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
    const ipRateLimit = await enforceRateLimit(req, rateLimiters.contact, getClientIp(req), c);
    if (!ipRateLimit.allowed) {
      return ipRateLimit.response!;
    }

    const payload = (await req.json()) as SupportPayload;
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const subject = payload.subject?.trim() || 'Oweable support request';
    const message = payload.message?.trim();
    const turnstileToken = payload.turnstileToken?.trim();

    // Validate required fields
    if (!name) throw new Error('Name is required');
    if (!email) throw new Error('Email is required');
    if (!message) throw new Error('Message is required');
    // TEMPORARILY DISABLED FOR TESTING - Turnstile token validation
    // if (!turnstileToken) throw new Error('Security verification is required');
    if (name.length > 120) throw new Error('Name is too long');
    if (subject.length > 160) throw new Error('Subject is too long');
    if (message.length > 5000) throw new Error('Message is too long');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new Error('Invalid email format');

    const emailRateLimit = await enforceRateLimit(req, rateLimiters.contact, `support:${email}`, c);
    if (!emailRateLimit.allowed) {
      return emailRateLimit.response!;
    }
    // TEMPORARILY DISABLED FOR TESTING - Turnstile verification
    // await verifyTurnstile(turnstileToken, getClientIp(req));

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supportEmail = Deno.env.get('SUPPORT_EMAIL') ?? 'support@oweable.com';

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY');
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@oweable.com';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        replyTo: email,
        subject: `[Support] ${subject}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
        `,
        text: `New Support Request\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Resend failed: ${errorBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    const safe = /required|invalid|missing|method not allowed|too long|rate limit exceeded|security verification/i.test(msg)
      ? msg
      : 'Failed to send message. Please try again or email support directly.';
    return new Response(
      JSON.stringify({ error: safe }),
      { status: 400, headers: jsonHeaders },
    );
  }
});

async function verifyTurnstile(token: string, remoteIp: string) {
  const secret = Deno.env.get('CF_TURNSTILE_SECRET_KEY');
  if (!secret) {
    throw new Error('Missing CF_TURNSTILE_SECRET_KEY');
  }

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (remoteIp && remoteIp !== 'unknown') {
    formData.append('remoteip', remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Security verification failed');
  }

  const result = (await response.json()) as { success?: boolean };
  if (result.success !== true) {
    throw new Error('Security verification failed');
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
