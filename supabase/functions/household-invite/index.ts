import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { householdId, email, role } = await req.json();

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const requestedRole = role === 'viewer' ? 'viewer' : role === 'partner' ? 'partner' : null;

    if (!householdId || !normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!requestedRole) {
      return new Response(JSON.stringify({ error: 'Invalid invite role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Server-side role enforcement to prevent privilege escalation:
    // - partners can only invite viewers
    // - no one can invite owners via email flow
    if (member.role === 'partner' && requestedRole !== 'viewer') {
      return new Response(JSON.stringify({ error: 'Partners can only invite viewers' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email is already invited or is a member
    const { data: existingMember } = await supabaseAdmin
      .from('household_members')
      .select('id, status')
      .eq('household_id', householdId)
      .eq('invited_email', normalizedEmail)
      .maybeSingle();

    if (existingMember) {
      return new Response(JSON.stringify({ 
        error: 'This email has already been invited or is a member',
        alreadyExists: true 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create pending invite
    const { error: insertError } = await supabaseAdmin
      .from('household_members')
      .insert({
        household_id: householdId,
        invited_email: normalizedEmail,
        role: requestedRole,
        status: 'pending'
      });

    if (insertError) {
      console.error('Failed to create invite:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send invite email via Supabase Auth
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${appUrl}/accept-invite?household=${householdId}`,
      data: {
        household_id: householdId,
        invited_by: user.id,
        role: requestedRole
      }
    });

    if (emailError) {
      console.warn('Failed to send invite email:', emailError);
      // Don't fail the request - invite is still created in DB
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Invite sent successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Household invite error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
