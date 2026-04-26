import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit, rateLimiters } from '../_shared/rateLimiter.ts';

Deno.serve(async (req: Request) => {
  const c = corsHeaders(req.headers.get('origin'), req.headers);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...c, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    const inviteRateLimit = await enforceRateLimit(
      req,
      rateLimiters.householdInvite,
      `household-invite:user:${user.id}`,
      c,
    );
    if (!inviteRateLimit.allowed) {
      return inviteRateLimit.response!;
    }

    const payload = await req.json() as { householdId?: string; email?: string; role?: string };
    const householdId = payload.householdId?.trim();
    const email = payload.email?.trim().toLowerCase();
    const requestedRole = payload.role?.trim().toLowerCase();
    const role = requestedRole === 'viewer' ? 'viewer' : requestedRole === 'partner' ? 'partner' : null;

    if (!householdId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }
    if (!role) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), {
        status: 400,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }
    if (email.length > 320) {
      return new Response(JSON.stringify({ error: 'Email is too long' }), {
        status: 400,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    const householdRateLimit = await enforceRateLimit(
      req,
      rateLimiters.householdInvite,
      `household-invite:household:${householdId}`,
      c,
    );
    if (!householdRateLimit.allowed) {
      return householdRateLimit.response!;
    }

    // Verify inviter has permission (owner or partner)
    const { data: member, error: memberError } = await supabaseAdmin
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member || !['owner', 'partner'].includes(member.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized to invite members' }), {
        status: 403,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    // Check if email is already invited or is a member
    const { data: existingMember } = await supabaseAdmin
      .from('household_members')
      .select('id, status')
      .eq('household_id', householdId)
      .eq('invited_email', email)
      .maybeSingle();

    if (existingMember) {
      return new Response(JSON.stringify({ 
        error: 'This email has already been invited or is a member',
        alreadyExists: true 
      }), {
        status: 409,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    // Create pending invite
    const { data: inviteRow, error: insertError } = await supabaseAdmin
      .from('household_members')
      .insert({
        household_id: householdId,
        invited_email: email,
        role,
        status: 'pending'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to create invite:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
        status: 500,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    // Send invite email via Supabase Auth
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/accept-invite?household=${householdId}`,
      data: {
        household_id: householdId,
        invited_by: user.id,
        role,
      }
    });

    if (emailError) {
      console.warn('Failed to send invite email:', emailError);
      if (inviteRow?.id) {
        const { error: cleanupError } = await supabaseAdmin
          .from('household_members')
          .delete()
          .eq('id', inviteRow.id)
          .eq('household_id', householdId);
        if (cleanupError) {
          console.error('Failed to clean up unsent household invite:', cleanupError);
        }
      }
      return new Response(JSON.stringify({
        error: 'Invite email could not be sent. Check Supabase Auth email/SMTP settings and try again.',
      }), {
        status: 502,
        headers: { ...c, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Invite sent successfully'
    }), {
      headers: { ...c, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Household invite error:', error);
    return new Response(JSON.stringify({ 
      error: 'Request failed',
    }), {
      status: 500,
      headers: { ...c, 'Content-Type': 'application/json' }
    });
  }
});
