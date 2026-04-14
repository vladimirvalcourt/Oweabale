import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin')
  const c = corsHeaders(origin)

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

    if (action === 'set_admin') {
      const isAdminFlag = (body as { isAdmin?: unknown }).isAdmin
      if (!targetUserId || typeof targetUserId !== 'string') {
        throw new Error('Missing targetUserId')
      }
      if (typeof isAdminFlag !== 'boolean') {
        throw new Error('isAdmin must be a boolean')
      }
      if (targetUserId === user.id && isAdminFlag) {
        throw new Error('Cannot promote your own account')
      }
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_admin: isAdminFlag })
        .eq('id', targetUserId)
      if (error) throw error
      return new Response(
        JSON.stringify({
          message: isAdminFlag ? 'User promoted to admin.' : 'Admin access removed.',
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
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h'
      })
      if (error) throw error
      await supabaseAdmin.from('profiles').update({ is_banned: true }).eq('id', targetUserId)
      return new Response(JSON.stringify({ message: 'User banned.' }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'unban') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none'
      })
      if (error) throw error
      await supabaseAdmin.from('profiles').update({ is_banned: false }).eq('id', targetUserId)
      return new Response(JSON.stringify({ message: 'User unbanned.' }), {
        headers: jsonHeaders,
      })
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
      if (error) throw error
      return new Response(JSON.stringify({ message: 'User permanently deleted.' }), {
        headers: jsonHeaders,
      })
    }

    throw new Error(`Unknown action: ${action}`)

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: jsonHeaders,
    })
  }
})
