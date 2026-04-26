import { corsHeaders } from '../_shared/cors.ts';

/**
 * Trial Welcome Email - Day 0
 * Sent when new user signs up and trial starts
 */

Deno.serve(async (req: Request) => {
  const c = corsHeaders(req.headers.get('origin'), req.headers);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: c });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { email, firstName } = await req.json();

    if (!email || !firstName) {
      throw new Error('Email and firstName are required');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
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
        to: [email],
        subject: 'Your 14-day Full Suite trial has started',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Welcome to Oweable, ${escapeHtml(firstName)}!</h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your 14-day Full Suite trial is now active. No credit card required — you have full access to everything for the next two weeks.
            </p>

            <h2 style="color: #1a1a1a; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Here's what you can do right now:</h2>
            
            <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li><strong>Debt Payoff Planner</strong> — See exactly how to eliminate debt faster using avalanche or snowball strategies</li>
              <li><strong>Income & Transaction Ledger</strong> — Track every dollar in and out with complete visibility</li>
              <li><strong>Tax Estimation & Reserves</strong> — Perfect for variable or 1099 income, set aside what you owe automatically</li>
            </ul>

            <div style="margin: 30px 0; text-align: center;">
              <a href="https://www.oweable.com/dashboard" 
                 style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Go to My Dashboard →
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              After 14 days, you'll automatically move to our free Tracker tier (recurring bills + tickets/fines). Upgrade anytime to keep Full Suite for $10.99/mo.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              Questions? Reply to this email or visit <a href="https://www.oweable.com/support" style="color: #f59e0b;">our support page</a>.
            </p>
          </div>
        `,
        text: `Welcome to Oweable, ${firstName}!\n\nYour 14-day Full Suite trial is now active. No credit card required.\n\nHere's what you can do:\n- Debt Payoff Planner\n- Income & Transaction Ledger\n- Tax Estimation & Reserves\n\nGo to your dashboard: https://www.oweable.com/dashboard\n\nAfter 14 days, you'll move to the free Tracker tier. Upgrade anytime to keep Full Suite for $10.99/mo.`,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Resend failed: ${errorBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...c, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...c, 'Content-Type': 'application/json' } },
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
