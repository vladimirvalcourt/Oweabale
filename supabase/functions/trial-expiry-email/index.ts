import { corsHeaders } from '../_shared/cors.ts';

/**
 * Trial Expiry Email - Day 14
 * Sent when trial expires and user is downgraded to tracker
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

    const fromEmail = Deno.env.get('ADMIN_ALERTS_FROM_EMAIL') ?? 'alerts@oweable.com';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your Full Suite trial has ended',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Your trial has ended, ${escapeHtml(firstName)}</h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Your 14-day Full Suite trial has ended. You've been moved to our free Tracker tier.
            </p>

            <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 24px 0;">
              <p style="color: #374151; font-size: 14px; margin: 0;">
                <strong>What you still have (free forever):</strong><br/>
                ✓ Recurring bill tracking<br/>
                ✓ Due-date alerts<br/>
                ✓ Ticket & fine management<br/>
                ✓ Account settings
              </p>
            </div>

            <h2 style="color: #1a1a1a; font-size: 20px; margin-top: 30px; margin-bottom: 15px;">What you're missing without Full Suite:</h2>
            
            <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li>Debt Payoff Planner (avalanche & snowball strategies)</li>
              <li>Income & Transaction Ledger</li>
              <li>Tax Estimation & Reserves</li>
              <li>Budgets & Financial Analytics</li>
            </ul>

            <div style="margin: 30px 0; text-align: center;">
              <a href="https://www.oweable.com/pricing" 
                 style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Upgrade to Full Suite — $10.99/mo →
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
              Annual plan available at $92.32/year (save 30%). No credit card was ever required — we believe in earning your trust first.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            
            <p style="color: #9ca3af; font-size: 12px;">
              Questions? Reply to this email or visit <a href="https://www.oweable.com/support" style="color: #f59e0b;">our support page</a>.
            </p>
          </div>
        `,
        text: `Your Full Suite trial has ended\n\nHi ${firstName},\n\nYour 14-day Full Suite trial has ended. You've been moved to our free Tracker tier.\n\nYou still have (free):\n- Recurring bill tracking\n- Due-date alerts\n- Ticket & fine management\n\nUpgrade to get back:\n- Debt Payoff Planner\n- Income & Transaction Ledger\n- Tax Estimation & Reserves\n- Budgets & Analytics\n\nUpgrade: https://www.oweable.com/pricing\n\nMonthly: $10.99 | Annual: $92.32/year (save 30%)`,
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
