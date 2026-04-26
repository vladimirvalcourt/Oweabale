import { corsHeaders } from '../_shared/cors.ts';

/**
 * Trial Warning Email - Day 10
 * Sent 4 days before trial expires
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
    const { email, firstName, daysRemaining } = await req.json();

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
        subject: `${daysRemaining} days left on your Full Suite trial`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">${daysRemaining} days left, ${escapeHtml(firstName)}</h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your Full Suite trial ends in ${daysRemaining} days. After that, you'll automatically move to our free Tracker tier.
            </p>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>What happens next?</strong><br/>
                You'll keep access to recurring bill tracking and ticket/fine alerts for free. To keep your debt planner, income ledger, and tax tools, upgrade to Full Suite.
              </p>
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">Upgrade now to keep everything:</h2>
            
            <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li><strong>$10.99/month</strong> — Cancel anytime</li>
              <li><strong>$92.32/year</strong> — Save 30% (2 months free)</li>
            </ul>

            <div style="margin: 30px 0; text-align: center;">
              <a href="https://www.oweable.com/pricing" 
                 style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Plans & Upgrade →
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              No pressure — the free Tracker tier is genuinely useful for managing bills and fines. But if you want the full financial toolkit, now's the time to upgrade.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              Questions? Reply to this email or visit <a href="https://www.oweable.com/support" style="color: #f59e0b;">our support page</a>.
            </p>
          </div>
        `,
        text: `${daysRemaining} days left on your Full Suite trial\n\nHi ${firstName},\n\nYour Full Suite trial ends in ${daysRemaining} days. After that, you'll move to the free Tracker tier.\n\nUpgrade options:\n- $10.99/month (cancel anytime)\n- $92.32/year (save 30%, 2 months free)\n\nView plans: https://www.oweable.com/pricing\n\nNo pressure — the free Tracker tier is still useful for bills and fines.`,
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
