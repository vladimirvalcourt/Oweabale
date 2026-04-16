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

    const ALLOWED_ACTIONS = new Set([
      'list', 'health', 'audit_feed', 'billing_stats', 'billing_by_user',
      'plaid_items_list', 'set_admin', 'promote_admin', 'plaid_stats',
      'ban', 'unban', 'delete',
    ]);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON body');
    }
    const { action, targetUserId } = body as { action?: unknown; targetUserId?: unknown };

    if (typeof action !== 'string' || !action) throw new Error('Missing action');
    if (!ALLOWED_ACTIONS.has(action)) throw new Error(`Unknown action: ${action}`);
    if (targetUserId !== undefined && (typeof targetUserId !== 'string' || !UUID_RE.test(targetUserId))) {
      throw new Error('Invalid targetUserId format');
    }

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

    if (action === 'billing_stats') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const [
        { data: subStatuses },
        { data: recentPayments },
        { count: failedCount },
        { data: allPaidPayments },
      ] = await Promise.all([
        supabaseAdmin.from('billing_subscriptions').select('status'),
        supabaseAdmin
          .from('billing_payments')
          .select('id, user_id, amount_total, currency, status, product_key, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabaseAdmin
          .from('billing_payments')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'paid')
          .gte('created_at', thirtyDaysAgo),
        supabaseAdmin
          .from('billing_payments')
          .select('amount_total')
          .eq('status', 'paid'),
      ])

      const statusCounts: Record<string, number> = {}
      for (const s of subStatuses ?? []) {
        statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
      }

      const totalRevenueCents = (allPaidPayments ?? []).reduce(
        (sum: number, p: { amount_total: number }) => sum + (p.amount_total ?? 0), 0
      )
      const revenue30dCents = (recentPayments ?? [])
        .filter((p: { status: string; created_at: string }) => p.status === 'paid' && p.created_at >= thirtyDaysAgo)
        .reduce((sum: number, p: { amount_total: number }) => sum + (p.amount_total ?? 0), 0)

      return new Response(
        JSON.stringify({
          billing_stats: {
            subscription_counts: statusCounts,
            total_revenue_cents: totalRevenueCents,
            revenue_30d_cents: revenue30dCents,
            failed_payments_30d: failedCount ?? 0,
            recent_payments: recentPayments ?? [],
          },
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'billing_by_user') {
      const [{ data: subs }, { data: oneTime }] = await Promise.all([
        supabaseAdmin
          .from('billing_subscriptions')
          .select('user_id, status')
          .not('status', 'eq', 'canceled'),
        supabaseAdmin
          .from('entitlements')
          .select('user_id, source')
          .eq('source', 'one_time')
          .eq('status', 'active')
          .eq('feature_key', 'full_suite'),
      ])

      const map: Record<string, { plan: string; status: string }> = {}
      for (const sub of subs ?? []) {
        if (!map[sub.user_id]) {
          map[sub.user_id] = { plan: 'Pro', status: sub.status }
        }
      }
      for (const ent of oneTime ?? []) {
        map[ent.user_id] = { plan: 'Lifetime', status: 'active' }
      }

      return new Response(JSON.stringify({ billing_by_user: map }), { headers: jsonHeaders })
    }

    if (action === 'plaid_items_list') {
      const { data: items, error } = await supabaseAdmin
        .from('plaid_items')
        .select(
          'id, user_id, institution_name, last_sync_at, last_sync_error, item_login_required, last_webhook_at, created_at',
        )
        .order('last_sync_at', { ascending: true, nullsFirst: true })
        .limit(200)
      if (error) throw error

      const userIds = [...new Set((items ?? []).map((i: { user_id: string }) => i.user_id))]
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      const emailMap = Object.fromEntries((profiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]))
      const enriched = (items ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        userEmail: (emailMap[item.user_id as string] as string) ?? (item.user_id as string).slice(0, 8),
      }))

      return new Response(JSON.stringify({ plaid_items: enriched }), { headers: jsonHeaders })
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
        throw new Error('Forbidden: use promote_admin action instead')
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
        JSON.stringify({ message: 'Admin access removed.' }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'promote_admin') {
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      if (targetUserId === user.id) throw new Error('Cannot modify your own account')
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, is_admin')
        .eq('id', targetUserId)
        .maybeSingle()
      if (targetProfile?.is_admin) throw new Error('User is already an admin')
      await enforceRateLimit(supabaseAdmin, user.id, 'promote_admin')
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', targetUserId)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'promote_admin', {
        targetUserId,
        targetEmail: targetProfile?.email ?? null,
      })
      return new Response(JSON.stringify({ message: 'Admin access granted.' }), { headers: jsonHeaders })
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
