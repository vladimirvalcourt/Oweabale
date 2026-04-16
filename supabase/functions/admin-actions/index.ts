import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

async function logAdminAction(
  supabaseAdmin: ReturnType<typeof createClient>,
  adminUserId: string,
  actorEmail: string | null,
  requestMeta: { ip: string | null; userAgent: string | null },
  action: string,
  details?: Record<string, unknown>,
) {
  await supabaseAdmin.from('audit_log').insert({
    user_id: adminUserId,
    table_name: 'admin_actions',
    record_id: null,
    action,
    old_data: null,
    new_data: {
      actorEmail,
      requestIp: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      ...(details ?? {}),
    },
  })
}

async function enforceRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  adminUserId: string,
  action: string,
) {
  const windowStart = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await supabaseAdmin
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', adminUserId)
    .eq('table_name', 'admin_actions')
    .eq('action', action)
    .gte('created_at', windowStart)
  if (error) throw error
  if ((count ?? 0) >= 8) {
    throw new Error(`Rate limit exceeded for ${action}. Please wait a minute.`)
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const c = corsHeaders(origin)
  const requestMeta = {
    ip:
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-real-ip') ??
      null,
    userAgent: req.headers.get('user-agent'),
  }
  let callerEmailForAudit: string | null = null

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: c })
  }

  const jsonHeaders = { ...c, 'Content-Type': 'application/json' as const }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!profile?.is_admin) throw new Error('Forbidden: Admin access required')

    const allowedEmail = Deno.env.get('ADMIN_ALLOWED_EMAIL')?.trim().toLowerCase()
    if (!allowedEmail) throw new Error('Server misconfiguration: ADMIN_ALLOWED_EMAIL')
    const callerEmail = user.email?.trim().toLowerCase()
    callerEmailForAudit = callerEmail ?? null
    if (!callerEmail || callerEmail !== allowedEmail) {
      throw new Error('Forbidden: primary admin only')
    }

    const body = await req.json()
    const { action, targetUserId } = body

    if (!action) throw new Error('Missing action')

    // list: return enriched user data with last_sign_in_at
    if (action === 'list') {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 500 })
      if (error) throw error
      const enriched = users.map(u => ({
        id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
        banned_until: (u as any).banned_until ?? null,
      }))
      return new Response(JSON.stringify({ users: enriched }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'health') {
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const [{ count: events24h }, { count: webhookErrors24h }, { count: activeSubs }, { data: latestEvent }] =
        await Promise.all([
          supabaseAdmin.from('stripe_events').select('id', { count: 'exact', head: true }).gte('processed_at', oneDayAgo),
          supabaseAdmin
            .from('audit_log')
            .select('id', { count: 'exact', head: true })
            .eq('table_name', 'admin_actions')
            .eq('action', 'webhook_error')
            .gte('created_at', oneDayAgo),
          supabaseAdmin
            .from('billing_subscriptions')
            .select('id', { count: 'exact', head: true })
            .in('status', ['active', 'trialing']),
          supabaseAdmin
            .from('stripe_events')
            .select('event_type, processed_at')
            .order('processed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

      return new Response(
        JSON.stringify({
          stripe_health: {
            stripe_events_24h: events24h ?? 0,
            webhook_errors_24h: webhookErrors24h ?? 0,
            active_subscriptions: activeSubs ?? 0,
            last_webhook_event_type: latestEvent?.event_type ?? null,
            last_webhook_at: latestEvent?.processed_at ?? null,
          },
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'audit_feed') {
      const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('id, user_id, action, new_data, created_at')
        .eq('table_name', 'admin_actions')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return new Response(JSON.stringify({ audit_feed: data ?? [] }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'set_admin') {
      const isAdminFlag = (body as { isAdmin?: unknown }).isAdmin
      if (!targetUserId || typeof targetUserId !== 'string') {
        throw new Error('Missing targetUserId')
      }
      if (typeof isAdminFlag !== 'boolean') {
        throw new Error('isAdmin must be a boolean')
      }
      if (isAdminFlag === true) {
        throw new Error('Forbidden: granting admin is disabled')
      }
      const { data: targetRow } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', targetUserId)
        .maybeSingle()
      const targetEmail = targetRow?.email?.trim().toLowerCase() ?? ''
      if (targetEmail === allowedEmail) {
        throw new Error('Forbidden: cannot remove primary admin')
      }
      await enforceRateLimit(supabaseAdmin, user.id, 'set_admin')
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', targetUserId)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'set_admin', {
        targetUserId,
        granted: false,
      })
      return new Response(
        JSON.stringify({
          message: 'Admin access removed.',
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'plaid_stats') {
      const { data: items, error } = await supabaseAdmin
        .from('plaid_items')
        .select(
          'user_id, item_id, institution_name, last_sync_at, last_sync_error, last_webhook_at, item_login_required, created_at',
        )
      if (error) throw error
      const rows = items ?? []
      const userIds = new Set(rows.map((r) => r.user_id))
      const withError = rows.filter((r) => r.last_sync_error != null && String(r.last_sync_error).length > 0)
        .length
      const needRelink = rows.filter((r) => r.item_login_required === true).length
      const neverSynced = rows.filter((r) => r.last_sync_at == null).length
      const stale24h = Date.now() - 24 * 3600 * 1000
      const stale = rows.filter((r) => {
        if (!r.last_sync_at) return true
        return new Date(r.last_sync_at).getTime() < stale24h
      }).length

      return new Response(
        JSON.stringify({
          plaid_stats: {
            total_items: rows.length,
            distinct_users: userIds.size,
            items_with_sync_error: withError,
            items_needing_relink: needRelink,
            items_never_synced: neverSynced,
            items_stale_24h: stale,
          },
        }),
        { headers: jsonHeaders },
      )
    }

    // All other actions require a targetUserId
    if (!targetUserId) throw new Error('Missing targetUserId')
    if (targetUserId === user.id) throw new Error('Cannot perform this action on your own account')

    if (action === 'ban') {
      await enforceRateLimit(supabaseAdmin, user.id, 'ban')
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h'
      })
      if (error) throw error
      await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', targetUserId)
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'ban', { targetUserId })
      return new Response(JSON.stringify({ message: 'User banned.' }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'unban') {
      await enforceRateLimit(supabaseAdmin, user.id, 'unban')
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none'
      })
      if (error) throw error
      await supabaseAdmin.from('profiles').update({ is_banned: false }).eq('id', targetUserId)
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'unban', { targetUserId })
      return new Response(JSON.stringify({ message: 'User unbanned.' }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'delete') {
      await enforceRateLimit(supabaseAdmin, user.id, 'delete')
      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'delete', { targetUserId })
      return new Response(JSON.stringify({ message: 'User permanently deleted.' }), {
        headers: jsonHeaders,
      })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (err: any) {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const msg = String(err?.message ?? 'unknown')
      if (/stripe|webhook|signature/i.test(msg)) {
        await supabaseAdmin.from('audit_log').insert({
          table_name: 'admin_actions',
          action: 'webhook_error',
          new_data: {
            message: msg,
            actorEmail: callerEmailForAudit,
            requestIp: requestMeta.ip,
            userAgent: requestMeta.userAgent,
          },
        })
      }
    } catch {
      // best effort logging only
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: jsonHeaders,
    })
  }
})
