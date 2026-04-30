import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

// Validation schemas for admin actions
const SupportNoteSchema = z.object({
  ticketId: z.string().regex(UUID_RE, 'Invalid ticket ID format'),
  note: z.string().min(1, 'Note cannot be empty').max(5000, 'Note exceeds 5000 character limit'),
});

const TicketUpdateSchema = z.object({
  ticketId: z.string().regex(UUID_RE, 'Invalid ticket ID format'),
  status: z.enum(['Open', 'In Progress', 'Resolved']).optional(),
  priority: z.enum(['Low', 'Normal', 'Urgent']).optional(),
  assignedAdminId: z.string().regex(UUID_RE, 'Invalid admin ID format').optional().nullable(),
});

const TrialExtensionSchema = z.object({
  target: z.string(),
  additionalDays: z.number().int().min(1).max(90, 'Maximum 90 days extension'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
});

const UserBanSchema = z.object({
  targetUserId: z.string().regex(UUID_RE, 'Invalid user ID format'),
  reasonCode: z.string().min(1).max(50),
  reason: z.string().min(10).max(500),
});

async function stripePost(path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  const params = new URLSearchParams(body)
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok) throw new Error((json.error as any)?.message ?? `Stripe error ${res.status}`)
  return json
}

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

type AdminContext = {
  isAdmin: boolean
  isSuperAdmin: boolean
  roleKeys: Set<string>
  permissionKeys: Set<string>
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function buildAdminContext(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  callerEmail: string | null,
): Promise<AdminContext> {
  const [{ data: profile }, { data: roleRows }, { data: rolePermRows }] = await Promise.all([
    supabaseAdmin.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    supabaseAdmin
      .from('admin_user_roles')
      .select('admin_roles(key)')
      .eq('user_id', userId),
    supabaseAdmin
      .from('admin_user_roles')
      .select('admin_roles(admin_role_permissions(admin_permissions(key)))')
      .eq('user_id', userId),
  ])

  const roleKeys = new Set<string>()
  for (const row of roleRows ?? []) {
    const key = (row as { admin_roles?: { key?: string } | null }).admin_roles?.key
    if (typeof key === 'string' && key.length > 0) roleKeys.add(key)
  }

  const permissionKeys = new Set<string>()
  for (const row of rolePermRows ?? []) {
    const role = (row as {
      admin_roles?: {
        admin_role_permissions?: Array<{ admin_permissions?: { key?: string } | null }> | null
      } | null
    }).admin_roles
    for (const rp of role?.admin_role_permissions ?? []) {
      const key = rp.admin_permissions?.key
      if (typeof key === 'string' && key.length > 0) permissionKeys.add(key)
    }
  }

  const primaryAdminEmail = Deno.env.get('ADMIN_ALLOWED_EMAIL')?.trim().toLowerCase() ?? null
  const isPrimaryAdmin = !!callerEmail && !!primaryAdminEmail && callerEmail === primaryAdminEmail
  // Legacy: profiles.is_admin was the only gate before RBAC rows existed. Keep parity so
  // bulk_action / platform controls keep working until admin_user_roles is fully backfilled.
  const legacyProfileSuper = profile?.is_admin === true
  const isAdmin =
    legacyProfileSuper || permissionKeys.size > 0 || roleKeys.has('super_admin') || isPrimaryAdmin
  const isSuperAdmin = roleKeys.has('super_admin') || isPrimaryAdmin || legacyProfileSuper

  return { isAdmin, isSuperAdmin, roleKeys, permissionKeys }
}

function requirePermission(ctx: AdminContext, permission: string) {
  if (ctx.isSuperAdmin) return
  if (!ctx.permissionKeys.has(permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`)
  }
}

function requireSuperAdmin(ctx: AdminContext) {
  if (!ctx.isSuperAdmin) throw new Error('Forbidden: super admin required')
}

type AdminSupabase = ReturnType<typeof createClient>

function readText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function requireText(value: unknown, label: string, minLength = 1): string {
  const text = readText(value)
  if (text.length < minLength) throw new Error(`${label} is required`)
  return text
}

function requireReason(value: unknown, label = 'reason'): string {
  return requireText(value, label, 8)
}

async function resolveUserId(
  supabaseAdmin: AdminSupabase,
  value: unknown,
  label = 'targetUserId',
): Promise<string> {
  const raw = readText(value)
  if (!raw) throw new Error(`${label} is required`)
  if (UUID_RE.test(raw)) return raw
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.toLowerCase())) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', raw.toLowerCase())
      .maybeSingle()
    if (error) throw error
    if (!data?.id) throw new Error('User not found')
    return data.id
  }
  throw new Error(`${label} must be a user UUID or email`)
}

async function countRows(
  supabaseAdmin: AdminSupabase,
  table: string,
  apply?: (query: any) => any,
): Promise<number> {
  const base = supabaseAdmin.from(table).select('id', { count: 'exact', head: true })
  const { count, error } = await (apply ? apply(base) : base)
  if (error) throw error
  return count ?? 0
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** PostgREST upsert requires a UNIQUE on (user_id, feature_key); we keep one logical row via update-or-insert. */
async function upsertEntitlementRow(
  supabaseAdmin: AdminSupabase,
  userId: string,
  featureKey: string,
  fields: { source: string; status: string; ends_at?: string | null },
) {
  const now = new Date().toISOString()
  const updatePayload: Record<string, unknown> = {
    source: fields.source,
    status: fields.status,
    updated_at: now,
  }
  if ('ends_at' in fields) {
    updatePayload.ends_at = fields.ends_at
  }
  const { data: updatedRows, error: upErr } = await supabaseAdmin
    .from('entitlements')
    .update(updatePayload)
    .eq('user_id', userId)
    .eq('feature_key', featureKey)
    .select('id')
  if (upErr) throw upErr
  if (updatedRows && updatedRows.length > 0) return

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    feature_key: featureKey,
    source: fields.source,
    status: fields.status,
    updated_at: now,
  }
  if ('ends_at' in fields) {
    insertPayload.ends_at = fields.ends_at
  }
  const { error: insErr } = await supabaseAdmin.from('entitlements').insert(insertPayload)
  if (insErr) throw insErr
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const c = corsHeaders(origin, req.headers)
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

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...c, 'Content-Type': 'application/json' },
    })
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

    const callerEmail = user.email?.trim().toLowerCase()
    callerEmailForAudit = callerEmail ?? null
    const adminCtx = await buildAdminContext(supabaseAdmin, user.id, callerEmailForAudit)
    if (!adminCtx.isAdmin) throw new Error('Forbidden: Admin access required')

    // CRITICAL: CSRF Protection - validate CSRF token for state-changing operations
    const csrfToken = req.headers.get('x-csrf-token')
    const isReadOperation = ['list', 'health', 'audit_feed', 'billing_stats', 'billing_by_user', 
      'plaid_items_list', 'plaid_stats', 'revenue_chart', 'growth_chart', 'churn_stats', 
      'webhook_list', 'user_detail', 'rbac_context', 'users_query', 'user_timeline', 
      'compliance_overview', 'telemetry_overview', 'support_queue', 'support_reply_history',
      'billing_user_lookup', 'billing_entitlement_timeline', 'governance_snapshot',
      'platform_controls_get', 'comms_templates_list', 'comms_recipient_estimate'].includes(action)
    
    if (!isReadOperation && !csrfToken) {
      throw new Error('CSRF token missing. Include x-csrf-token header with your request.')
    }
    
    // TODO: In production, verify CSRF token against session store
    // For now, just ensure the header is present (better than nothing)
    // Future enhancement: Store CSRF tokens in Redis/Supabase and validate here

    const ALLOWED_ACTIONS = new Set([
      'list', 'health', 'audit_feed', 'billing_stats', 'billing_by_user',
      'plaid_items_list', 'set_admin', 'promote_admin', 'plaid_stats',
      'ban', 'unban', 'delete',
      'grant_entitlement', 'revoke_entitlement', 'user_detail', 'impersonate', 'bulk_action',
      'revenue_chart', 'growth_chart', 'churn_stats', 'webhook_list', 'extend_trial', 'set_feature_flag',
      'grant_entitlement_by_email', 'extend_trial_by_email',
      'admin_roles_permissions', 'revoke_sessions',
      'rbac_context', 'users_query', 'user_timeline', 'compliance_overview', 'compliance_update_status',
      'compliance_force_refresh_plaid', 'telemetry_overview', 'update_platform_controls', 'update_moderation_status',
      'support_queue', 'support_update_ticket', 'support_add_note', 'support_reply_history',
      'billing_user_lookup', 'billing_open_portal_link', 'billing_extend_trial', 'billing_entitlement_timeline',
      'billing_refund_payment',
      'user_risk_note_add', 'user_ban_with_reason', 'user_unban_with_reason', 'deletion_review_create',
      'deletion_review_cancel',
      'governance_snapshot', 'admin_invite_create', 'admin_role_assign', 'admin_role_remove',
      'platform_controls_get', 'platform_controls_update', 'webhook_replay_enqueue',
      'comms_templates_list', 'comms_template_upsert', 'comms_recipient_estimate', 'comms_test_send',
      'comms_queue_campaign', 'comms_suppress_email',
    ]);

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
    const primaryAdminEmail = Deno.env.get('ADMIN_ALLOWED_EMAIL')?.trim().toLowerCase() ?? ''

    const SUPER_ADMIN_ONLY_ACTIONS = new Set([
      'set_admin',
      'promote_admin',
      'ban',
      'unban',
      'delete',
      'revoke_sessions',
      'impersonate',
      'user_ban_with_reason',
      'user_unban_with_reason',
      'deletion_review_create',
      'deletion_review_cancel',
      'admin_invite_create',
      'admin_role_assign',
      'admin_role_remove',
    ])
    if (SUPER_ADMIN_ONLY_ACTIONS.has(action)) requireSuperAdmin(adminCtx)

    if (action === 'rbac_context') {
      return new Response(
        JSON.stringify({
          is_admin: adminCtx.isAdmin,
          is_super_admin: adminCtx.isSuperAdmin,
          roles: [...adminCtx.roleKeys],
          permissions: [...adminCtx.permissionKeys],
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'users_query') {
      requirePermission(adminCtx, 'users.read')
      const {
        page = 1,
        pageSize = 25,
        search = '',
        plan = 'any',
        plaidStatus = 'any',
      } = body as {
        page?: number
        pageSize?: number
        search?: string
        plan?: 'any' | 'free' | 'pro' | 'lifetime'
        plaidStatus?: 'any' | 'healthy' | 'error' | 'relink'
      }

      const safePage = Math.max(1, Math.floor(Number(page) || 1))
      const safePageSize = Math.min(100, Math.max(10, Math.floor(Number(pageSize) || 25)))
      const from = (safePage - 1) * safePageSize
      const to = from + safePageSize - 1

      let q = supabaseAdmin
        .from('profiles')
        .select('id,email,is_admin,is_banned,has_completed_onboarding,created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      const searchText = String(search ?? '').trim()
      if (searchText) q = q.ilike('email', `%${searchText}%`)

      const { data: rows, count, error } = await q
      if (error) throw error

      const userIds = [...new Set((rows ?? []).map((r: { id: string }) => r.id))]
      const [{ data: entRows }, { data: subRows }, { data: plaidRows }, authUsersRes] = await Promise.all([
        supabaseAdmin
          .from('entitlements')
          .select('user_id, source, status')
          .in('user_id', userIds)
          .eq('feature_key', 'full_suite')
          .eq('status', 'active'),
        supabaseAdmin
          .from('billing_subscriptions')
          .select('user_id, status')
          .in('user_id', userIds),
        supabaseAdmin
          .from('plaid_items')
          .select('user_id, item_login_required, last_sync_error')
          .in('user_id', userIds),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])

      const authMap = new Map(((authUsersRes.data?.users ?? []) as Array<{ id: string; last_sign_in_at: string | null }>).map((u) => [u.id, u]))
      const planMap = new Map<string, 'free' | 'pro' | 'lifetime'>()
      for (const row of subRows ?? []) {
        if (row.status === 'active' || row.status === 'trialing') planMap.set(row.user_id, 'pro')
      }
      for (const row of entRows ?? []) {
        if (row.source === 'one_time') planMap.set(row.user_id, 'lifetime')
        else if (!planMap.has(row.user_id)) planMap.set(row.user_id, 'pro')
      }
      for (const id of userIds) if (!planMap.has(id)) planMap.set(id, 'free')

      const plaidMap = new Map<string, { hasError: boolean; needsRelink: boolean }>()
      for (const row of plaidRows ?? []) {
        const prev = plaidMap.get(row.user_id) ?? { hasError: false, needsRelink: false }
        plaidMap.set(row.user_id, {
          hasError: prev.hasError || !!row.last_sync_error,
          needsRelink: prev.needsRelink || row.item_login_required === true,
        })
      }

      const filtered = (rows ?? []).filter((row: { id: string }) => {
        const p = planMap.get(row.id) ?? 'free'
        const ps = plaidMap.get(row.id) ?? { hasError: false, needsRelink: false }
        if (plan !== 'any' && p !== plan) return false
        if (plaidStatus === 'error' && !ps.hasError) return false
        if (plaidStatus === 'relink' && !ps.needsRelink) return false
        if (plaidStatus === 'healthy' && (ps.hasError || ps.needsRelink)) return false
        return true
      }).map((row: { id: string; email: string | null; is_admin: boolean; is_banned: boolean; has_completed_onboarding: boolean; created_at: string | null }) => ({
        ...row,
        plan: planMap.get(row.id) ?? 'free',
        plaid_health: plaidMap.get(row.id) ?? { hasError: false, needsRelink: false },
        last_sign_in_at: authMap.get(row.id)?.last_sign_in_at ?? null,
      }))

      return new Response(
        JSON.stringify({
          page: safePage,
          pageSize: safePageSize,
          total: count ?? 0,
          rows: filtered,
        }),
        { headers: jsonHeaders },
      )
    }

    // list: return enriched user data with last_sign_in_at
    if (action === 'list') {
      requirePermission(adminCtx, 'users.read')
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
      requirePermission(adminCtx, 'telemetry.read')
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
      requirePermission(adminCtx, 'audit.read')
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
      requirePermission(adminCtx, 'dashboard.view')
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const [
        { data: subStatuses },
        { data: recentPayments },
        { count: failedCount },
        { data: allPaidPayments },
        { data: paid30dRows },
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
        supabaseAdmin
          .from('billing_payments')
          .select('amount_total')
          .eq('status', 'paid')
          .gte('created_at', thirtyDaysAgo),
      ])

      const statusCounts: Record<string, number> = {}
      for (const s of subStatuses ?? []) {
        statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
      }

      const totalRevenueCents = (allPaidPayments ?? []).reduce(
        (sum: number, p: { amount_total: number }) => sum + (p.amount_total ?? 0), 0
      )
      const revenue30dCents = (paid30dRows ?? []).reduce(
        (sum: number, p: { amount_total: number }) => sum + (p.amount_total ?? 0),
        0,
      )

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
      requirePermission(adminCtx, 'users.read')
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
      requirePermission(adminCtx, 'telemetry.read')
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
      if (targetEmail === primaryAdminEmail) {
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
      requirePermission(adminCtx, 'telemetry.read')
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

    if (action === 'user_detail') {
      requirePermission(adminCtx, 'users.read')
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      const [
        { data: userProfile },
        { data: entitlements },
        { data: subscriptions },
        { data: payments },
        { data: plaidItems },
        { data: tickets },
        { data: compliance },
        { data: adminNotes },
        { data: lifecycleEvents },
        { data: trialEvents },
        { data: deletionReviews },
      ] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('id, email, is_admin, is_banned, has_completed_onboarding, created_at')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabaseAdmin
          .from('entitlements')
          .select('id, feature_key, status, source, starts_at, ends_at')
          .eq('user_id', targetUserId),
        supabaseAdmin
          .from('billing_subscriptions')
          .select('id, status, current_period_start, current_period_end, stripe_subscription_id, cancel_at_period_end, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabaseAdmin
          .from('billing_payments')
          .select('id, amount_total, currency, status, product_key, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('plaid_items')
          .select('institution_name, last_sync_at, last_sync_error, item_login_required')
          .eq('user_id', targetUserId),
        supabaseAdmin
          .from('support_tickets')
          .select('id, ticket_number, subject, status, priority, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('user_compliance_status')
          .select('user_id, kyc_status, aml_status, pep_sanctions_hit, risk_score, last_checked_at, updated_at')
          .eq('user_id', targetUserId)
          .maybeSingle(),
        supabaseAdmin
          .from('admin_user_notes')
          .select('id, note_type, body, created_at')
          .eq('target_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('admin_user_lifecycle_events')
          .select('id, action, reason_code, reason, created_at')
          .eq('target_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('admin_trial_extension_events')
          .select('id, previous_trial_ends_at, new_trial_ends_at, additional_days, reason, created_at')
          .eq('target_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('admin_deletion_reviews')
          .select('id, status, reason_code, reason, created_at, cancelled_at, completed_at')
          .eq('target_user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      return new Response(
        JSON.stringify({
          user_detail: {
            profile: userProfile,
            entitlements: entitlements ?? [],
            subscriptions: subscriptions ?? [],
            payments: payments ?? [],
            plaid_items: plaidItems ?? [],
            tickets: tickets ?? [],
            compliance: compliance ?? null,
            admin_notes: adminNotes ?? [],
            lifecycle_events: lifecycleEvents ?? [],
            trial_events: trialEvents ?? [],
            deletion_reviews: deletionReviews ?? [],
          },
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'bulk_action') {
      const { targetUserIds, bulkAction } = body as { targetUserIds?: unknown; bulkAction?: unknown }
      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        throw new Error('targetUserIds must be a non-empty array')
      }
      if (targetUserIds.length > 50) {
        throw new Error('targetUserIds cannot exceed 50 entries')
      }
      for (const id of targetUserIds) {
        if (typeof id !== 'string' || !UUID_RE.test(id)) {
          throw new Error(`Invalid UUID in targetUserIds: ${id}`)
        }
        if (id === user.id) {
          throw new Error('Cannot target your own account in a bulk action')
        }
      }
      const validBulkActions = new Set(['ban', 'unban', 'grant_entitlement', 'revoke_entitlement'])
      if (typeof bulkAction !== 'string' || !validBulkActions.has(bulkAction)) {
        throw new Error('bulkAction must be one of: ban, unban, grant_entitlement, revoke_entitlement')
      }
      if (bulkAction === 'ban' || bulkAction === 'unban') {
        requireSuperAdmin(adminCtx)
      } else {
        requirePermission(adminCtx, 'billing.manage')
      }
      await enforceRateLimit(supabaseAdmin, user.id, 'bulk_action')
      const now = new Date().toISOString()
      await Promise.all(
        targetUserIds.map(async (uid: string) => {
          if (bulkAction === 'ban') {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { ban_duration: '876000h' })
            if (error) throw error
            await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', uid)
          } else if (bulkAction === 'unban') {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { ban_duration: 'none' })
            if (error) throw error
            await supabaseAdmin.from('profiles').update({ is_banned: false }).eq('id', uid)
          } else if (bulkAction === 'grant_entitlement') {
            await upsertEntitlementRow(supabaseAdmin, uid, 'full_suite', {
              source: 'admin',
              status: 'active',
              ends_at: null,
            })
          } else if (bulkAction === 'revoke_entitlement') {
            const { error } = await supabaseAdmin
              .from('entitlements')
              .update({ status: 'revoked', updated_at: now })
              .eq('user_id', uid)
              .eq('feature_key', 'full_suite')
            if (error) throw error
          }
        })
      )
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'bulk_action', {
        bulkAction,
        count: targetUserIds.length,
      })
      return new Response(
        JSON.stringify({ message: 'Bulk action completed.', count: targetUserIds.length }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'revenue_chart') {
      requirePermission(adminCtx, 'dashboard.view')
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
      const { data: payments, error } = await supabaseAdmin
        .from('billing_payments')
        .select('id, amount_total, created_at')
        .eq('status', 'paid')
        .gte('created_at', twelveMonthsAgo)
        .order('created_at', { ascending: true })
      if (error) throw error

      const totals: Record<string, number> = {}
      for (const p of payments ?? []) {
        const key = (p.created_at as string).slice(0, 7)
        totals[key] = (totals[key] ?? 0) + (p.amount_total ?? 0)
      }

      const now = new Date()
      const months: { month: string; revenue_cents: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        months.push({ month: key, revenue_cents: totals[key] ?? 0 })
      }

      return new Response(JSON.stringify({ revenue_chart: months }), { headers: jsonHeaders })
    }

    if (action === 'growth_chart') {
      requirePermission(adminCtx, 'dashboard.view')
      const twelveWeeksAgo = new Date(Date.now() - 84 * 24 * 3600 * 1000).toISOString()
      const { data: signups, error } = await supabaseAdmin
        .from('profiles')
        .select('created_at')
        .gte('created_at', twelveWeeksAgo)
        .order('created_at', { ascending: true })
      if (error) throw error

      function getWeekKey(date: Date): string {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
      }

      const totals: Record<string, number> = {}
      for (const s of signups ?? []) {
        const key = getWeekKey(new Date(s.created_at as string))
        totals[key] = (totals[key] ?? 0) + 1
      }

      const now = new Date()
      const weeks: { week: string; signups: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i * 7))
        const key = getWeekKey(d)
        weeks.push({ week: key, signups: totals[key] ?? 0 })
      }

      return new Response(JSON.stringify({ growth_chart: weeks }), { headers: jsonHeaders })
    }

    if (action === 'churn_stats') {
      requirePermission(adminCtx, 'dashboard.view')
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
      const [
        { data: canceledRows, count: totalCanceled },
        { count: totalActive },
        { count: canceled30d },
      ] = await Promise.all([
        supabaseAdmin
          .from('billing_subscriptions')
          .select('id, user_id, canceled_at, created_at', { count: 'exact' })
          .eq('status', 'canceled')
          .order('canceled_at', { ascending: false, nullsFirst: false })
          .limit(10),
        supabaseAdmin
          .from('billing_subscriptions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['active', 'trialing']),
        supabaseAdmin
          .from('billing_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'canceled')
          .gte('canceled_at', thirtyDaysAgo),
      ])

      const userIds = [...new Set((canceledRows ?? []).map((r: { user_id: string }) => r.user_id))]
      const { data: emailProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', userIds)
      const emailMap = Object.fromEntries((emailProfiles ?? []).map((p: { id: string; email: string }) => [p.id, p.email]))

      const recentChurns = (canceledRows ?? []).map((r: { user_id: string; canceled_at: string | null }) => ({
        email: (emailMap[r.user_id] as string) ?? r.user_id,
        canceled_at: r.canceled_at,
      }))

      const tc = totalCanceled ?? 0
      const ta = totalActive ?? 0
      const churn_rate = tc + ta > 0 ? Math.round((tc / (tc + ta)) * 100) / 100 : 0

      return new Response(
        JSON.stringify({
          churn_stats: {
            total_canceled: tc,
            active_subscriptions: ta,
            canceled_30d: canceled30d ?? 0,
            churn_rate,
            recent_churns: recentChurns,
          },
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'webhook_list') {
      requirePermission(adminCtx, 'telemetry.read')
      const { data, error } = await supabaseAdmin
        .from('stripe_events')
        .select('id, stripe_event_id, event_type, processed_at')
        .order('processed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return new Response(JSON.stringify({ webhooks: data ?? [] }), { headers: jsonHeaders })
    }

    if (action === 'grant_entitlement_by_email') {
      requirePermission(adminCtx, 'billing.manage')
      const { email, featureKey, durationDays } = body as {
        email?: unknown
        featureKey?: unknown
        durationDays?: unknown
      }
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
      const normalizedFeature = featureKey === 'pro' || featureKey === 'full_suite' ? 'full_suite' : null
      const normalizedDuration = Math.floor(Number(durationDays))
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Valid email is required')
      if (!normalizedFeature) throw new Error('Unsupported featureKey')
      if (!Number.isFinite(normalizedDuration) || normalizedDuration < 1 || normalizedDuration > 3650) {
        throw new Error('durationDays must be between 1 and 3650')
      }
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profile?.id) throw new Error('User not found')

      const endsAt = new Date(Date.now() + normalizedDuration * 24 * 60 * 60 * 1000).toISOString()
      await enforceRateLimit(supabaseAdmin, user.id, 'grant_entitlement_by_email')
      await upsertEntitlementRow(supabaseAdmin, profile.id, normalizedFeature, {
        source: 'admin',
        status: 'active',
        ends_at: endsAt,
      })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'grant_entitlement_by_email', {
        email: normalizedEmail,
        featureKey: normalizedFeature,
        durationDays: normalizedDuration,
      })
      return new Response(JSON.stringify({ message: 'Entitlement granted.' }), { headers: jsonHeaders })
    }

    if (action === 'extend_trial') {
      requirePermission(adminCtx, 'billing.manage')
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      const trial_end = (body as { trial_end?: unknown }).trial_end
      if (typeof trial_end !== 'string' || !trial_end.trim()) throw new Error('trial_end is required')
      if (trial_end !== 'now' && !(Number(trial_end) > Date.now() / 1000)) {
        throw new Error('trial_end must be "now" or a future Unix timestamp')
      }
      const { data: subRow } = await supabaseAdmin
        .from('billing_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', targetUserId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!subRow?.stripe_subscription_id) throw new Error('No active subscription found for user')
      await enforceRateLimit(supabaseAdmin, user.id, 'extend_trial')
      await stripePost(`/subscriptions/${subRow.stripe_subscription_id}`, { trial_end })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'extend_trial', { targetUserId, trial_end })
      return new Response(JSON.stringify({ message: 'Trial extended.' }), { headers: jsonHeaders })
    }

    if (action === 'extend_trial_by_email') {
      requirePermission(adminCtx, 'billing.manage')
      const { email, additionalDays } = body as {
        email?: unknown
        additionalDays?: unknown
      }
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
      const normalizedDays = Math.floor(Number(additionalDays))
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Valid email is required')
      if (!Number.isFinite(normalizedDays) || normalizedDays < 1 || normalizedDays > 90) {
        throw new Error('additionalDays must be between 1 and 90')
      }
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id, plan, trial_ends_at')
        .eq('email', normalizedEmail)
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profile?.id) throw new Error('User not found')
      if (profile.plan === 'full_suite') throw new Error('Cannot extend trial for a Full Suite user')

      const baseTime = profile.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now()
        ? new Date(profile.trial_ends_at).getTime()
        : Date.now()
      const nextTrialEndsAt = new Date(baseTime + normalizedDays * 24 * 60 * 60 * 1000).toISOString()

      await enforceRateLimit(supabaseAdmin, user.id, 'extend_trial_by_email')
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'trial',
          trial_expired: false,
          trial_ends_at: nextTrialEndsAt,
        })
        .eq('id', profile.id)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'extend_trial_by_email', {
        email: normalizedEmail,
        additionalDays: normalizedDays,
        trialEndsAt: nextTrialEndsAt,
      })
      return new Response(JSON.stringify({ message: 'Trial extended.' }), { headers: jsonHeaders })
    }

    if (action === 'set_feature_flag') {
      requirePermission(adminCtx, 'settings.platform')
      const { flagScope, flagKey, flagValue, targetUserId: flagTargetUserId } = body as {
        flagScope?: unknown
        flagKey?: unknown
        flagValue?: unknown
        targetUserId?: unknown
      }
      if (flagScope !== 'global' && flagScope !== 'user') throw new Error('flagScope must be "global" or "user"')
      if (typeof flagKey !== 'string' || !flagKey.trim()) throw new Error('flagKey is required')
      if (typeof flagValue !== 'boolean') throw new Error('flagValue must be a boolean')
      await enforceRateLimit(supabaseAdmin, user.id, 'set_feature_flag')
      if (flagScope === 'global') {
        const { data: settingsRow, error: settingsReadErr } = await supabaseAdmin
          .from('platform_settings')
          .select('id, feature_flags')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (settingsReadErr) throw settingsReadErr
        if (!settingsRow?.id) throw new Error('platform_settings row missing; run migrations / seed.')
        const current = (settingsRow.feature_flags as Record<string, unknown>) ?? {}
        const updated = { ...current, [flagKey as string]: flagValue }
        const { error } = await supabaseAdmin
          .from('platform_settings')
          .update({ feature_flags: updated })
          .eq('id', settingsRow.id)
        if (error) throw error
      } else {
        if (typeof flagTargetUserId !== 'string' || !UUID_RE.test(flagTargetUserId as string)) {
          throw new Error('targetUserId is required for scope="user"')
        }
        await upsertEntitlementRow(supabaseAdmin, flagTargetUserId, flagKey, {
          source: 'admin',
          status: flagValue ? 'active' : 'revoked',
        })
      }
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'set_feature_flag', {
        flagScope,
        flagKey,
        flagValue,
        targetUserId: typeof flagTargetUserId === 'string' ? flagTargetUserId : null,
      })
      return new Response(JSON.stringify({ message: 'Feature flag updated.' }), { headers: jsonHeaders })
    }

    if (action === 'admin_roles_permissions') {
      requirePermission(adminCtx, 'audit.read')
      const [{ data: roles }, { data: permissions }, { data: rolePermissions }, { data: userRoles }] = await Promise.all([
        supabaseAdmin.from('admin_roles').select('id, key, label'),
        supabaseAdmin.from('admin_permissions').select('id, key, label'),
        supabaseAdmin.from('admin_role_permissions').select('role_id, permission_id'),
        supabaseAdmin.from('admin_user_roles').select('user_id, role_id'),
      ])
      return new Response(
        JSON.stringify({
          roles: roles ?? [],
          permissions: permissions ?? [],
          role_permissions: rolePermissions ?? [],
          user_roles: userRoles ?? [],
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'user_timeline') {
      requirePermission(adminCtx, 'users.read')
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      const [{ data: plaidRows }, { data: billingRows }] = await Promise.all([
        supabaseAdmin
          .from('plaid_items')
          .select('item_id, institution_name, last_sync_at, last_sync_error, item_login_required, last_webhook_at, updated_at')
          .eq('user_id', targetUserId)
          .order('updated_at', { ascending: false })
          .limit(50),
        supabaseAdmin
          .from('billing_payments')
          .select('id, status, amount_total, currency, product_key, created_at')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      const timeline = [
        ...(plaidRows ?? []).map((row) => ({
          source: 'plaid',
          at: row.last_webhook_at ?? row.last_sync_at ?? row.updated_at,
          label: row.last_sync_error ? `Plaid sync error: ${row.last_sync_error}` : 'Plaid sync event',
          detail: row,
        })),
        ...(billingRows ?? []).map((row) => ({
          source: 'stripe_billing',
          at: row.created_at,
          label: `Stripe payment ${row.status}`,
          detail: row,
        })),
      ]
        .filter((row) => !!row.at)
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .slice(0, 150)

      return new Response(JSON.stringify({ timeline }), { headers: jsonHeaders })
    }

    if (action === 'compliance_overview') {
      requirePermission(adminCtx, 'compliance.read')
      const [{ data: statuses }, { data: flagged }] = await Promise.all([
        supabaseAdmin
          .from('user_compliance_status')
          .select('user_id, kyc_status, aml_status, pep_sanctions_hit, risk_score, last_checked_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(500),
        supabaseAdmin
          .from('flagged_transactions')
          .select('id, user_id, transaction_id, source, reason, severity, status, created_at, updated_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ])
      return new Response(JSON.stringify({ compliance: { statuses: statuses ?? [], flagged: flagged ?? [] } }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'compliance_update_status') {
      requirePermission(adminCtx, 'compliance.manage')
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      const {
        kycStatus,
        amlStatus,
        pepSanctionsHit,
        riskScore,
      } = body as {
        kycStatus?: 'pending' | 'verified' | 'rejected' | 'manual_review'
        amlStatus?: 'pending' | 'clear' | 'flagged' | 'manual_review'
        pepSanctionsHit?: boolean
        riskScore?: number
      }
      const now = new Date().toISOString()
      const { error } = await supabaseAdmin.from('user_compliance_status').upsert(
        {
          user_id: targetUserId,
          kyc_status: kycStatus ?? 'pending',
          aml_status: amlStatus ?? 'pending',
          pep_sanctions_hit: pepSanctionsHit ?? false,
          risk_score: typeof riskScore === 'number' ? riskScore : 0,
          last_checked_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id' },
      )
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'compliance_update_status', {
        targetUserId,
        kycStatus,
        amlStatus,
      })
      return new Response(JSON.stringify({ message: 'Compliance status updated.' }), { headers: jsonHeaders })
    }

    if (action === 'compliance_force_refresh_plaid') {
      requirePermission(adminCtx, 'compliance.manage')
      const staleHours = Number((body as { staleHours?: unknown }).staleHours ?? 1)
      const cronSecret = Deno.env.get('PLAID_CRON_SECRET')
      const projectUrl = Deno.env.get('SUPABASE_URL')
      if (!cronSecret || !projectUrl) throw new Error('Server misconfiguration')
      const resp = await fetch(`${projectUrl}/functions/v1/plaid-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      })
      if (!resp.ok) throw new Error('Failed to trigger plaid sync')
      const data = await resp.json()
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'compliance_force_refresh_plaid', {
        staleHours,
      })
      return new Response(JSON.stringify({ message: 'Plaid force refresh triggered.', result: data }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'telemetry_overview') {
      requirePermission(adminCtx, 'telemetry.read')
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 3600_000).toISOString()
      const [{ count: plaidErrorsHour }, { count: plaidRelink }, { data: stripeRecent }, { data: edgeMetrics }] =
        await Promise.all([
          supabaseAdmin
            .from('plaid_items')
            .select('item_id', { count: 'exact', head: true })
            .not('last_sync_error', 'is', null),
          supabaseAdmin
            .from('plaid_items')
            .select('item_id', { count: 'exact', head: true })
            .eq('item_login_required', true),
          supabaseAdmin
            .from('stripe_events')
            .select('event_type, processed_at')
            .gte('processed_at', oneDayAgo)
            .order('processed_at', { ascending: false })
            .limit(100),
          supabaseAdmin
            .from('audit_log')
            .select('action, created_at, new_data')
            .eq('table_name', 'admin_actions')
            .gte('created_at', oneHourAgo)
            .order('created_at', { ascending: false })
            .limit(200),
        ])

      const stripeLatencyMs = (() => {
        const rows = stripeRecent ?? []
        if (rows.length < 2) return null
        const newest = new Date(rows[0].processed_at).getTime()
        const oldest = new Date(rows[rows.length - 1].processed_at).getTime()
        const span = Math.max(1, newest - oldest)
        return Math.round(span / rows.length)
      })()

      return new Response(
        JSON.stringify({
          telemetry: {
            plaid: {
              rate_limit_near: false,
              error_items: plaidErrorsHour ?? 0,
              relink_items: plaidRelink ?? 0,
            },
            stripe: {
              webhook_events_24h: stripeRecent?.length ?? 0,
              avg_webhook_spacing_ms: stripeLatencyMs,
            },
            edge: {
              admin_actions_last_hour: edgeMetrics?.length ?? 0,
            },
          },
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'update_platform_controls') {
      requirePermission(adminCtx, 'settings.platform')
      const { maintenanceMode, plaidEnabled, broadcastMessage } = body as {
        maintenanceMode?: boolean
        plaidEnabled?: boolean
        broadcastMessage?: string | null
      }
      const { data: settingsRow, error: settingsErr } = await supabaseAdmin
        .from('platform_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (settingsErr || !settingsRow?.id) throw new Error('platform_settings row missing')
      const patch: Record<string, unknown> = {}
      if (typeof maintenanceMode === 'boolean') patch.maintenance_mode = maintenanceMode
      if (typeof plaidEnabled === 'boolean') patch.plaid_enabled = plaidEnabled
      if (broadcastMessage !== undefined) patch.broadcast_message = broadcastMessage
      if (Object.keys(patch).length === 0) throw new Error('No platform control values provided')
      const { error } = await supabaseAdmin.from('platform_settings').update(patch).eq('id', settingsRow.id)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'update_platform_controls', patch)
      return new Response(JSON.stringify({ message: 'Platform controls updated.' }), { headers: jsonHeaders })
    }

    if (action === 'update_moderation_status') {
      requirePermission(adminCtx, 'moderation.manage')
      const { moderationId, status } = body as { moderationId?: unknown; status?: unknown }
      const validStatuses = new Set(['pending', 'approved', 'rejected', 'flagged'])
      if (typeof moderationId !== 'string' || !UUID_RE.test(moderationId)) {
        throw new Error('Invalid moderationId format')
      }
      if (typeof status !== 'string' || !validStatuses.has(status)) {
        throw new Error('status must be one of: pending, approved, rejected, flagged')
      }
      await enforceRateLimit(supabaseAdmin, user.id, 'update_moderation_status')
      const reviewedAt = new Date().toISOString()
      const { error } = await supabaseAdmin
        .from('moderation_queue')
        .update({ status, reviewed_at: reviewedAt })
        .eq('id', moderationId)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'update_moderation_status', {
        moderationId,
        status,
      })
      return new Response(JSON.stringify({ message: 'Moderation status updated.', reviewed_at: reviewedAt }), { headers: jsonHeaders })
    }

    if (action === 'support_queue') {
      requirePermission(adminCtx, 'support.manage')
      const { status = 'any', search = '' } = body as { status?: unknown; search?: unknown }
      let query = supabaseAdmin
        .from('support_tickets')
        .select('id, user_id, ticket_number, subject, description, department, priority, status, assigned_admin_id, sla_due_at, resolved_at, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (typeof status === 'string' && status !== 'any') query = query.eq('status', status)
      const { data: tickets, error } = await query
      if (error) throw error
      const needle = readText(search).toLowerCase()
      const filtered = needle
        ? (tickets ?? []).filter((ticket: Record<string, unknown>) =>
          [ticket.ticket_number, ticket.subject, ticket.description, ticket.department, ticket.status]
            .some((value) => String(value ?? '').toLowerCase().includes(needle)),
        )
        : (tickets ?? [])
      const userIds = [...new Set(filtered.map((ticket: { user_id: string }) => ticket.user_id))]
      const adminIds = [...new Set(filtered.map((ticket: { assigned_admin_id?: string | null }) => ticket.assigned_admin_id).filter(Boolean) as string[])]
      const [{ data: users }, { data: admins }] = await Promise.all([
        userIds.length ? supabaseAdmin.from('profiles').select('id, email').in('id', userIds) : Promise.resolve({ data: [] }),
        adminIds.length ? supabaseAdmin.from('profiles').select('id, email').in('id', adminIds) : Promise.resolve({ data: [] }),
      ])
      const userEmail = Object.fromEntries((users ?? []).map((row: { id: string; email: string | null }) => [row.id, row.email]))
      const adminEmail = Object.fromEntries((admins ?? []).map((row: { id: string; email: string | null }) => [row.id, row.email]))
      return new Response(JSON.stringify({
        tickets: filtered.map((ticket: Record<string, unknown>) => ({
          ...ticket,
          user_email: userEmail[ticket.user_id as string] ?? null,
          assigned_admin_email: ticket.assigned_admin_id ? adminEmail[ticket.assigned_admin_id as string] ?? null : null,
        })),
      }), { headers: jsonHeaders })
    }

    if (action === 'support_update_ticket') {
      requirePermission(adminCtx, 'support.manage')
      
      // CRITICAL: Validate input with Zod schema
      const validationResult = TicketUpdateSchema.safeParse(body)
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`)
      }
      
      const { ticketId, status, priority, assignedAdminId } = validationResult.data
      
      const patch: Record<string, unknown> = {}
      const eventRows: Record<string, unknown>[] = []
      const { data: existing, error: readErr } = await supabaseAdmin
        .from('support_tickets')
        .select('status, priority, assigned_admin_id, sla_due_at')
        .eq('id', ticketId)
        .maybeSingle()
      if (readErr) throw readErr
      if (!existing) throw new Error('Ticket not found')
      
      if (status) {
        patch.status = status
        if (status === 'Resolved') patch.resolved_at = new Date().toISOString()
        eventRows.push({ event_type: 'status_changed', old_value: existing.status, new_value: status })
      }
      if (priority) {
        patch.priority = priority
        eventRows.push({ event_type: 'priority_changed', old_value: existing.priority, new_value: priority })
      }
      if (assignedAdminId !== undefined) {
        patch.assigned_admin_id = assignedAdminId
        eventRows.push({ event_type: 'assigned', old_value: existing.assigned_admin_id, new_value: assignedAdminId })
      }
      
      if (Object.keys(patch).length === 0) throw new Error('No ticket update provided')
      const { error } = await supabaseAdmin.from('support_tickets').update(patch).eq('id', ticketId)
      if (error) throw error
      if (eventRows.length > 0) {
        const { error: eventErr } = await supabaseAdmin.from('support_ticket_events').insert(eventRows.map((row) => ({
          ticket_id: ticketId,
          actor_user_id: user.id,
          ...row,
        })))
        if (eventErr) throw eventErr
      }
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'support_update_ticket', { ticketId, patch })
      return new Response(JSON.stringify({ message: 'Ticket updated.' }), { headers: jsonHeaders })
    }

    if (action === 'support_add_note') {
      requirePermission(adminCtx, 'support.manage')
      
      // CRITICAL: Validate input with Zod schema
      const validationResult = SupportNoteSchema.safeParse(body)
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`)
      }
      
      const { ticketId, note } = validationResult.data
      
      // Additional XSS sanitization (basic HTML tag stripping)
      const sanitizedNote = note.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                 .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                                 .replace(/on\w+="[^"]*"/gi, '')
      
      const { error } = await supabaseAdmin.from('support_ticket_notes').insert({ 
        ticket_id: ticketId, 
        admin_user_id: user.id, 
        body: sanitizedNote 
      })
      if (error) throw error
      await supabaseAdmin.from('support_ticket_events').insert({ 
        ticket_id: ticketId, 
        actor_user_id: user.id, 
        event_type: 'note', 
        body: sanitizedNote 
      })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'support_add_note', { ticketId })
      return new Response(JSON.stringify({ message: 'Note added.' }), { headers: jsonHeaders })
    }

    if (action === 'support_reply_history') {
      requirePermission(adminCtx, 'support.manage')
      const ticketId = requireText((body as { ticketId?: unknown }).ticketId, 'ticketId')
      if (!UUID_RE.test(ticketId)) throw new Error('Invalid ticketId format')
      const [{ data: events, error: eventsErr }, { data: notes, error: notesErr }] = await Promise.all([
        supabaseAdmin.from('support_ticket_events').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('support_ticket_notes').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }).limit(100),
      ])
      if (eventsErr) throw eventsErr
      if (notesErr) throw notesErr
      return new Response(JSON.stringify({ events: events ?? [], notes: notes ?? [] }), { headers: jsonHeaders })
    }

    if (action === 'billing_user_lookup') {
      requirePermission(adminCtx, 'billing.manage')
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown; targetUserId?: unknown }).target ?? targetUserId)
      const [{ data: profile }, { data: subscriptions }, { data: payments }, { data: entitlements }, { data: trialEvents }] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, email, stripe_customer_id, plan, trial_started_at, trial_ends_at, trial_expired, created_at').eq('id', target).maybeSingle(),
        supabaseAdmin.from('billing_subscriptions').select('*').eq('user_id', target).order('created_at', { ascending: false }).limit(20),
        supabaseAdmin.from('billing_payments').select('*').eq('user_id', target).order('created_at', { ascending: false }).limit(20),
        supabaseAdmin.from('entitlements').select('*').eq('user_id', target).order('created_at', { ascending: false }).limit(20),
        supabaseAdmin.from('admin_trial_extension_events').select('*').eq('target_user_id', target).order('created_at', { ascending: false }).limit(20),
      ])
      return new Response(JSON.stringify({
        billing: {
          profile,
          subscriptions: subscriptions ?? [],
          payments: payments ?? [],
          entitlements: entitlements ?? [],
          trial_events: trialEvents ?? [],
          stripe_customer_url: profile?.stripe_customer_id ? `https://dashboard.stripe.com/customers/${profile.stripe_customer_id}` : null,
        },
      }), { headers: jsonHeaders })
    }

    if (action === 'billing_open_portal_link') {
      requirePermission(adminCtx, 'billing.manage')
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown; targetUserId?: unknown }).target ?? targetUserId)
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', target)
        .maybeSingle()
      if (error) throw error
      if (!profile?.stripe_customer_id) throw new Error('No Stripe customer id for user')
      await enforceRateLimit(supabaseAdmin, user.id, 'billing_open_portal_link')
      const returnUrl = Deno.env.get('SITE_URL') ?? 'https://www.oweable.com/admin/billing'
      const portal = await stripePost('/billing_portal/sessions', { customer: profile.stripe_customer_id, return_url: returnUrl })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'billing_open_portal_link', { targetUserId: target })
      return new Response(JSON.stringify({ url: portal.url ?? null }), { headers: jsonHeaders })
    }

    if (action === 'billing_extend_trial') {
      requirePermission(adminCtx, 'billing.manage')
      
      // CRITICAL: Validate input with Zod schema
      const validationResult = TrialExtensionSchema.safeParse(body)
      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.issues.map(i => i.message).join(', ')}`)
      }
      
      const { target, additionalDays, reason } = validationResult.data
      const targetUserId = await resolveUserId(supabaseAdmin, target)
      
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('trial_ends_at, plan')
        .eq('id', targetUserId)
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profile) throw new Error('User not found')
      if (profile.plan === 'full_suite') throw new Error('Cannot extend trial for a Full Suite user')
      
      const baseTime = profile.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now()
        ? new Date(profile.trial_ends_at).getTime()
        : Date.now()
      const nextTrialEndsAt = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000).toISOString()
      
      await enforceRateLimit(supabaseAdmin, user.id, 'billing_extend_trial')
      const { error } = await supabaseAdmin.from('profiles').update({
        plan: 'trial',
        trial_expired: false,
        trial_ends_at: nextTrialEndsAt,
      }).eq('id', targetUserId)
      if (error) throw error
      
      await supabaseAdmin.from('admin_trial_extension_events').insert({
        target_user_id: targetUserId,
        admin_user_id: user.id,
        previous_trial_ends_at: profile.trial_ends_at,
        new_trial_ends_at: nextTrialEndsAt,
        additional_days: additionalDays,
        reason,
      })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'billing_extend_trial', { targetUserId, additionalDays })
      return new Response(JSON.stringify({ message: 'Trial extended.', trial_ends_at: nextTrialEndsAt }), { headers: jsonHeaders })
    }

    if (action === 'billing_entitlement_timeline') {
      requirePermission(adminCtx, 'billing.manage')
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown; targetUserId?: unknown }).target ?? targetUserId)
      const [{ data: entitlements }, { data: trialEvents }, { data: auditRows }] = await Promise.all([
        supabaseAdmin.from('entitlements').select('*').eq('user_id', target).order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('admin_trial_extension_events').select('*').eq('target_user_id', target).order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('audit_log').select('id, action, new_data, created_at').eq('table_name', 'admin_actions').contains('new_data', { targetUserId: target }).order('created_at', { ascending: false }).limit(50),
      ])
      return new Response(JSON.stringify({ entitlements: entitlements ?? [], trial_events: trialEvents ?? [], audit: auditRows ?? [] }), { headers: jsonHeaders })
    }

    if (action === 'billing_refund_payment') {
      requirePermission(adminCtx, 'billing.manage')
      const paymentId = requireText((body as { paymentId?: unknown }).paymentId, 'paymentId')
      if (!UUID_RE.test(paymentId)) throw new Error('Invalid paymentId format')
      const reason = requireReason((body as { reason?: unknown }).reason)
      await enforceRateLimit(supabaseAdmin, user.id, 'billing_refund_payment')
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'billing_refund_payment_requested', { paymentId, reason })
      return new Response(JSON.stringify({ message: 'Refund review recorded. Process the refund in Stripe after verifying the payment intent.' }), { headers: jsonHeaders })
    }

    if (action === 'user_risk_note_add') {
      requirePermission(adminCtx, 'users.manage')
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown }).target ?? targetUserId)
      const noteType = readText((body as { noteType?: unknown }).noteType, 'risk')
      if (!['risk', 'support', 'billing', 'general'].includes(noteType)) throw new Error('Invalid noteType')
      const bodyText = requireReason((body as { note?: unknown }).note, 'note')
      const { error } = await supabaseAdmin.from('admin_user_notes').insert({ target_user_id: target, admin_user_id: user.id, note_type: noteType, body: bodyText })
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'user_risk_note_add', { targetUserId: target, noteType })
      return new Response(JSON.stringify({ message: 'User note added.' }), { headers: jsonHeaders })
    }

    if (action === 'user_ban_with_reason' || action === 'user_unban_with_reason') {
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown }).target ?? targetUserId)
      if (target === user.id) throw new Error('Cannot perform this action on your own account')
      const reasonCode = requireText((body as { reasonCode?: unknown }).reasonCode, 'reasonCode')
      const reason = requireReason((body as { reason?: unknown }).reason)
      const ban = action === 'user_ban_with_reason'
      await enforceRateLimit(supabaseAdmin, user.id, action)
      const { error } = await supabaseAdmin.auth.admin.updateUserById(target, { ban_duration: ban ? '876000h' : 'none' })
      if (error) throw error
      const { error: profileErr } = await supabaseAdmin.from('profiles').update({ is_banned: ban }).eq('id', target)
      if (profileErr) throw profileErr
      const eventAction = ban ? 'ban' : 'unban'
      await supabaseAdmin.from('admin_user_lifecycle_events').insert({ target_user_id: target, admin_user_id: user.id, action: eventAction, reason_code: reasonCode, reason })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, action, { targetUserId: target, reasonCode })
      return new Response(JSON.stringify({ message: ban ? 'User banned.' : 'User unbanned.' }), { headers: jsonHeaders })
    }

    if (action === 'deletion_review_create') {
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown }).target ?? targetUserId)
      if (target === user.id) throw new Error('Cannot request deletion for your own account')
      const reasonCode = requireText((body as { reasonCode?: unknown }).reasonCode, 'reasonCode')
      const reason = requireReason((body as { reason?: unknown }).reason)
      await enforceRateLimit(supabaseAdmin, user.id, 'deletion_review_create')
      const { data: row, error } = await supabaseAdmin.from('admin_deletion_reviews').insert({ target_user_id: target, requested_by: user.id, reason_code: reasonCode, reason }).select('id').single()
      if (error) throw error
      await supabaseAdmin.from('admin_user_lifecycle_events').insert({ target_user_id: target, admin_user_id: user.id, action: 'delete_requested', reason_code: reasonCode, reason, metadata: { reviewId: row.id } })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'deletion_review_create', { targetUserId: target, reviewId: row.id })
      return new Response(JSON.stringify({ message: 'Deletion review queued.', review_id: row.id }), { headers: jsonHeaders })
    }

    if (action === 'deletion_review_cancel') {
      const reviewId = requireText((body as { reviewId?: unknown }).reviewId, 'reviewId')
      if (!UUID_RE.test(reviewId)) throw new Error('Invalid reviewId format')
      const reason = requireReason((body as { reason?: unknown }).reason)
      await enforceRateLimit(supabaseAdmin, user.id, 'deletion_review_cancel')
      const { data: review, error: readErr } = await supabaseAdmin.from('admin_deletion_reviews').select('target_user_id').eq('id', reviewId).maybeSingle()
      if (readErr) throw readErr
      if (!review) throw new Error('Deletion review not found')
      const { error } = await supabaseAdmin.from('admin_deletion_reviews').update({ status: 'cancelled', cancelled_by: user.id, cancelled_at: new Date().toISOString() }).eq('id', reviewId)
      if (error) throw error
      await supabaseAdmin.from('admin_user_lifecycle_events').insert({ target_user_id: review.target_user_id, admin_user_id: user.id, action: 'delete_cancelled', reason_code: 'cancelled', reason, metadata: { reviewId } })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'deletion_review_cancel', { reviewId })
      return new Response(JSON.stringify({ message: 'Deletion review cancelled.' }), { headers: jsonHeaders })
    }

    if (action === 'governance_snapshot') {
      requirePermission(adminCtx, 'audit.read')
      const [{ data: roles }, { data: permissions }, { data: rolePermissions }, { data: userRoles }, { data: invites }] = await Promise.all([
        supabaseAdmin.from('admin_roles').select('id, key, label').order('key'),
        supabaseAdmin.from('admin_permissions').select('id, key, label').order('key'),
        supabaseAdmin.from('admin_role_permissions').select('role_id, permission_id'),
        supabaseAdmin.from('admin_user_roles').select('user_id, role_id, assigned_by, created_at'),
        supabaseAdmin.from('admin_invites').select('id, email, role_id, status, expires_at, created_at').order('created_at', { ascending: false }).limit(50),
      ])
      const userIds = [...new Set((userRoles ?? []).map((row: { user_id: string }) => row.user_id))]
      const { data: profiles } = userIds.length
        ? await supabaseAdmin.from('profiles').select('id, email, is_admin').in('id', userIds)
        : { data: [] }
      const profileById = Object.fromEntries((profiles ?? []).map((row: { id: string; email: string | null; is_admin: boolean }) => [row.id, row]))
      return new Response(JSON.stringify({
        roles: roles ?? [],
        permissions: permissions ?? [],
        role_permissions: rolePermissions ?? [],
        user_roles: (userRoles ?? []).map((row: Record<string, unknown>) => ({ ...row, profile: profileById[row.user_id as string] ?? null })),
        invites: invites ?? [],
      }), { headers: jsonHeaders })
    }

    if (action === 'admin_invite_create') {
      const email = requireText((body as { email?: unknown }).email, 'email').toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required')
      const roleKey = requireText((body as { roleKey?: unknown }).roleKey, 'roleKey')
      const { data: role, error: roleErr } = await supabaseAdmin.from('admin_roles').select('id, key').eq('key', roleKey).maybeSingle()
      if (roleErr) throw roleErr
      if (!role) throw new Error('Role not found')
      const token = crypto.randomUUID()
      await enforceRateLimit(supabaseAdmin, user.id, 'admin_invite_create')
      const { data: invite, error } = await supabaseAdmin.from('admin_invites').insert({ email, role_id: role.id, invited_by: user.id, token_hash: await sha256Hex(token) }).select('id, expires_at').single()
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'admin_invite_create', { email, roleKey })
      return new Response(JSON.stringify({ message: 'Admin invite created.', invite_id: invite.id, expires_at: invite.expires_at, token }), { headers: jsonHeaders })
    }

    if (action === 'admin_role_assign' || action === 'admin_role_remove') {
      const target = await resolveUserId(supabaseAdmin, (body as { target?: unknown; targetUserId?: unknown }).target ?? targetUserId)
      if (target === user.id) throw new Error('Cannot change your own roles')
      const roleKey = requireText((body as { roleKey?: unknown }).roleKey, 'roleKey')
      const { data: role, error: roleErr } = await supabaseAdmin.from('admin_roles').select('id').eq('key', roleKey).maybeSingle()
      if (roleErr) throw roleErr
      if (!role) throw new Error('Role not found')
      await enforceRateLimit(supabaseAdmin, user.id, action)
      if (action === 'admin_role_assign') {
        const { error } = await supabaseAdmin.from('admin_user_roles').upsert({ user_id: target, role_id: role.id, assigned_by: user.id }, { onConflict: 'user_id,role_id' })
        if (error) throw error
      } else {
        const { error } = await supabaseAdmin.from('admin_user_roles').delete().eq('user_id', target).eq('role_id', role.id)
        if (error) throw error
      }
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, action, { targetUserId: target, roleKey })
      return new Response(JSON.stringify({ message: action === 'admin_role_assign' ? 'Role assigned.' : 'Role removed.' }), { headers: jsonHeaders })
    }

    if (action === 'platform_controls_get') {
      requirePermission(adminCtx, 'settings.platform')
      const [{ data: settings }, { data: replays }, { data: webhooks }] = await Promise.all([
        supabaseAdmin.from('platform_settings').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabaseAdmin.from('admin_webhook_replay_queue').select('*').order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('stripe_events').select('id, stripe_event_id, event_type, processed_at').order('processed_at', { ascending: false }).limit(25),
      ])
      return new Response(JSON.stringify({ settings, replay_queue: replays ?? [], webhooks: webhooks ?? [] }), { headers: jsonHeaders })
    }

    if (action === 'platform_controls_update') {
      requirePermission(adminCtx, 'incident.manage')
      const { maintenanceMode, plaidEnabled, broadcastMessage, featureFlags } = body as {
        maintenanceMode?: boolean
        plaidEnabled?: boolean
        broadcastMessage?: unknown
        featureFlags?: unknown
      }
      const { data: settingsRow, error: settingsErr } = await supabaseAdmin.from('platform_settings').select('id, feature_flags').order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (settingsErr || !settingsRow?.id) throw new Error('platform_settings row missing')
      const patch: Record<string, unknown> = {}
      if (typeof maintenanceMode === 'boolean') patch.maintenance_mode = maintenanceMode
      if (typeof plaidEnabled === 'boolean') patch.plaid_enabled = plaidEnabled
      if (broadcastMessage !== undefined) patch.broadcast_message = readText(broadcastMessage)
      if (featureFlags && typeof featureFlags === 'object' && !Array.isArray(featureFlags)) {
        patch.feature_flags = { ...((settingsRow.feature_flags as Record<string, unknown>) ?? {}), ...(featureFlags as Record<string, unknown>) }
      }
      if (Object.keys(patch).length === 0) throw new Error('No platform control values provided')
      await enforceRateLimit(supabaseAdmin, user.id, 'platform_controls_update')
      const { error } = await supabaseAdmin.from('platform_settings').update(patch).eq('id', settingsRow.id)
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'platform_controls_update', patch)
      return new Response(JSON.stringify({ message: 'Incident controls updated.' }), { headers: jsonHeaders })
    }

    if (action === 'webhook_replay_enqueue') {
      requirePermission(adminCtx, 'incident.manage')
      const provider = requireText((body as { provider?: unknown }).provider, 'provider')
      if (!['stripe', 'plaid', 'risc_google', 'other'].includes(provider)) throw new Error('Invalid provider')
      const sourceEventId = requireText((body as { sourceEventId?: unknown }).sourceEventId, 'sourceEventId')
      const reason = requireReason((body as { reason?: unknown }).reason)
      await enforceRateLimit(supabaseAdmin, user.id, 'webhook_replay_enqueue')
      const { error } = await supabaseAdmin.from('admin_webhook_replay_queue').insert({ provider, source_event_id: sourceEventId, requested_by: user.id, reason })
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'webhook_replay_enqueue', { provider, sourceEventId })
      return new Response(JSON.stringify({ message: 'Webhook replay queued.' }), { headers: jsonHeaders })
    }

    if (action === 'comms_templates_list') {
      requirePermission(adminCtx, 'comms.manage')
      const [{ data: templates }, { data: suppressions }, { data: queue }] = await Promise.all([
        supabaseAdmin.from('admin_email_templates').select('*').order('updated_at', { ascending: false }).limit(50),
        supabaseAdmin.from('admin_email_suppressions').select('*').order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('admin_email_queue').select('*').order('queued_at', { ascending: false }).limit(50),
      ])
      return new Response(JSON.stringify({ templates: templates ?? [], suppressions: suppressions ?? [], queue: queue ?? [] }), { headers: jsonHeaders })
    }

    if (action === 'comms_template_upsert') {
      requirePermission(adminCtx, 'comms.manage')
      const key = requireText((body as { key?: unknown }).key, 'key')
      if (!/^[a-z0-9_.-]{3,64}$/.test(key)) throw new Error('Template key must be 3-64 lowercase letters, numbers, dots, dashes, or underscores')
      const subject = requireText((body as { subject?: unknown }).subject, 'subject', 3)
      const bodyText = requireText((body as { body?: unknown }).body, 'body', 8)
      await enforceRateLimit(supabaseAdmin, user.id, 'comms_template_upsert')
      const { error } = await supabaseAdmin.from('admin_email_templates').upsert({ key, subject, body: bodyText, updated_by: user.id, created_by: user.id }, { onConflict: 'key' })
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'comms_template_upsert', { key })
      return new Response(JSON.stringify({ message: 'Template saved.' }), { headers: jsonHeaders })
    }

    if (action === 'comms_recipient_estimate') {
      requirePermission(adminCtx, 'comms.manage')
      const audience = readText((body as { audience?: unknown }).audience, 'all')
      const [totalUsers, activeSubs, lifetime, needsRelink, suppressions] = await Promise.all([
        countRows(supabaseAdmin, 'profiles'),
        countRows(supabaseAdmin, 'billing_subscriptions', (q) => q.in('status', ['active', 'trialing'])),
        countRows(supabaseAdmin, 'entitlements', (q) => q.eq('feature_key', 'full_suite').eq('source', 'one_time').eq('status', 'active')),
        countRows(supabaseAdmin, 'plaid_items', (q) => q.eq('item_login_required', true)),
        countRows(supabaseAdmin, 'admin_email_suppressions'),
      ])
      const raw =
        audience === 'pro' ? activeSubs :
          audience === 'lifetime' ? lifetime :
            audience === 'needs_relink' ? needsRelink :
              audience === 'free' ? Math.max(0, totalUsers - activeSubs - lifetime) :
                totalUsers
      return new Response(JSON.stringify({ estimate: { audience, raw_count: raw, suppressed_count: suppressions, sendable_count: Math.max(0, raw - suppressions) } }), { headers: jsonHeaders })
    }

    if (action === 'comms_test_send' || action === 'comms_queue_campaign') {
      requirePermission(adminCtx, 'comms.manage')
      const subject = requireText((body as { subject?: unknown }).subject, 'subject', 3)
      const bodyText = requireText((body as { body?: unknown }).body, 'body', 8)
      const audience = readText((body as { audience?: unknown }).audience, 'all')
      const testEmail = readText((body as { testEmail?: unknown }).testEmail).toLowerCase()
      if (action === 'comms_test_send' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) throw new Error('Valid testEmail is required')
      const estimateRes = await countRows(supabaseAdmin, 'profiles')
      await enforceRateLimit(supabaseAdmin, user.id, action)
      const { error } = await supabaseAdmin.from('admin_email_queue').insert({
        subject,
        body: bodyText,
        audience_filter: audience,
        recipient_count: action === 'comms_test_send' ? 1 : estimateRes,
        status: action === 'comms_test_send' ? 'test_queued' : 'queued',
        test_email: action === 'comms_test_send' ? testEmail : null,
        queued_by: user.id,
      })
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, action, { audience, testEmail: action === 'comms_test_send' ? testEmail : null })
      return new Response(JSON.stringify({ message: action === 'comms_test_send' ? 'Test email queued.' : 'Campaign queued.' }), { headers: jsonHeaders })
    }

    if (action === 'comms_suppress_email') {
      requirePermission(adminCtx, 'comms.manage')
      const email = requireText((body as { email?: unknown }).email, 'email').toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required')
      const reason = requireReason((body as { reason?: unknown }).reason)
      await enforceRateLimit(supabaseAdmin, user.id, 'comms_suppress_email')
      const { error } = await supabaseAdmin.from('admin_email_suppressions').upsert({ email, reason, created_by: user.id }, { onConflict: 'email' })
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'comms_suppress_email', { email })
      return new Response(JSON.stringify({ message: 'Email suppressed.' }), { headers: jsonHeaders })
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

    if (action === 'grant_entitlement') {
      requirePermission(adminCtx, 'billing.manage')
      const rawEnds = (body as { ends_at?: unknown }).ends_at
      const endsAt =
        rawEnds === null || rawEnds === undefined
          ? null
          : typeof rawEnds === 'string'
            ? rawEnds
            : null
      await enforceRateLimit(supabaseAdmin, user.id, 'grant_entitlement')
      await upsertEntitlementRow(supabaseAdmin, targetUserId, 'full_suite', {
        source: 'admin',
        status: 'active',
        ends_at: endsAt,
      })
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'grant_entitlement', { targetUserId })
      return new Response(JSON.stringify({ message: 'Full Suite granted.' }), { headers: jsonHeaders })
    }

    if (action === 'revoke_entitlement') {
      requirePermission(adminCtx, 'billing.manage')
      const now = new Date().toISOString()
      await enforceRateLimit(supabaseAdmin, user.id, 'revoke_entitlement')
      const { error } = await supabaseAdmin
        .from('entitlements')
        .update({ status: 'revoked', updated_at: now })
        .eq('user_id', targetUserId)
        .eq('feature_key', 'full_suite')
      if (error) throw error
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'revoke_entitlement', { targetUserId })
      return new Response(JSON.stringify({ message: 'Full Suite revoked.' }), { headers: jsonHeaders })
    }

    if (action === 'impersonate') {
      requirePermission(adminCtx, 'users.impersonate')
      if (!targetUserId || typeof targetUserId !== 'string') throw new Error('Missing targetUserId')
      const reason = String((body as { reason?: unknown }).reason ?? '').trim()
      if (reason.length < 8) throw new Error('Impersonation reason must be at least 8 characters')
      await enforceRateLimit(supabaseAdmin, user.id, 'impersonate')
      const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
      if (getUserError || !targetUser?.user) throw new Error('User not found')
      const userEmail = targetUser.user.email
      if (!userEmail) throw new Error('Target user has no email address')
      const targetEmail = userEmail.trim().toLowerCase()
      if (targetEmail === primaryAdminEmail) {
        throw new Error('Forbidden: cannot impersonate primary admin')
      }
      const [{ data: targetProfile }, { data: targetRoles }] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('is_admin')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabaseAdmin
          .from('admin_user_roles')
          .select('admin_roles(key)')
          .eq('user_id', targetUserId),
      ])
      const targetRoleKeys = new Set(
        (targetRoles ?? [])
          .map((row) => (row as { admin_roles?: { key?: string } | null }).admin_roles?.key)
          .filter((k): k is string => typeof k === 'string' && k.length > 0),
      )
      if (targetProfile?.is_admin === true || targetRoleKeys.size > 0) {
        throw new Error('Forbidden: cannot impersonate privileged admin account')
      }
      const siteBase = (Deno.env.get('APP_SITE_URL') ?? Deno.env.get('SITE_URL') ?? 'https://www.oweable.com').trim().replace(
        /\/$/,
        '',
      )
      const redirectTo = `${siteBase}/dashboard`
      const { data: linkPayload, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
        options: { redirectTo },
      })
      if (linkError) throw linkError
      const magicLinkUrl = (linkPayload as { properties?: { action_link?: string } })?.properties?.action_link ?? null
      if (!magicLinkUrl || typeof magicLinkUrl !== 'string') {
        throw new Error('Failed to create impersonation magic link')
      }
      const { data: impSession, error: impErr } = await supabaseAdmin
        .from('admin_impersonation_sessions')
        .insert({
          admin_user_id: user.id,
          target_user_id: targetUserId,
          reason,
          status: 'active',
          expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          audit_context: {
            actorEmail: callerEmailForAudit,
            requestIp: requestMeta.ip,
            userAgent: requestMeta.userAgent,
          },
        })
        .select('id, issued_at, expires_at')
        .single()
      if (impErr) throw impErr
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'impersonate', {
        targetUserId,
        reason,
        impersonationSessionId: impSession.id,
      })
      return new Response(
        JSON.stringify({
          impersonation_session: impSession,
          secure_handoff: true,
          magic_link_url: magicLinkUrl,
        }),
        { headers: jsonHeaders },
      )
    }

    if (action === 'revoke_sessions') {
      await enforceRateLimit(supabaseAdmin, user.id, 'revoke_sessions')
      const scope = (body as { revokeScope?: unknown }).revokeScope
      const sessionScope = scope === 'current' ? 'local' : 'global'
      const { error } = await supabaseAdmin.auth.admin.signOut(targetUserId, sessionScope)
      if (error) throw error
      const revokedAt = new Date().toISOString()
      const { error: sessionUpdateError } = await supabaseAdmin
        .from('user_sessions')
        .update({ revoked_at: revokedAt })
        .eq('user_id', targetUserId)
        .is('revoked_at', null)
      if (sessionUpdateError) throw sessionUpdateError
      await logAdminAction(supabaseAdmin, user.id, callerEmailForAudit, requestMeta, 'revoke_sessions', {
        targetUserId,
        revokeScope: sessionScope,
      })
      return new Response(JSON.stringify({ message: 'Sessions revoked.' }), { headers: jsonHeaders })
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
    const msg = err instanceof Error ? err.message : 'Request failed'
    const safe =
      /unauthorized|forbidden|missing|invalid|unknown action|rate limit|cannot/i.test(msg)
        ? msg
        : 'Request failed'
    return new Response(JSON.stringify({ error: safe }), {
      status: 400,
      headers: jsonHeaders,
    })
  }
})
