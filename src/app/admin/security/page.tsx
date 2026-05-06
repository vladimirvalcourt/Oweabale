import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const severityColor: Record<string, string> = {
  low: 'text-(--color-content-tertiary)',
  medium: 'text-(--color-warning)',
  high: 'text-(--color-danger)',
  critical: 'text-(--color-danger) font-semibold',
}

export default async function AdminSecurityPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('security_events')
    .select('id,event_type,user_id,ip_address,endpoint,severity,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = Array.from(new Set((events ?? []).map((e) => e.user_id).filter(Boolean)))
  const { data: users } = userIds.length
    ? await supabase.from('profiles').select('id,email').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Security events</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Latest 200 security events across all users.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">When</th>
              <th className="px-4 py-3 text-left font-normal">Event</th>
              <th className="px-4 py-3 text-left font-normal">Severity</th>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">IP</th>
              <th className="px-4 py-3 text-left font-normal">Endpoint</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {events && events.length > 0 ? (
              events.map((e) => {
                const u = e.user_id ? userMap.get(e.user_id) : null
                return (
                  <tr key={e.id} className="hover:bg-(--color-surface-elevated)">
                    <td className="px-4 py-3 text-(--color-content-tertiary) whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content)">{e.event_type}</td>
                    <td className={`px-4 py-3 capitalize ${severityColor[e.severity] ?? ''}`}>
                      {e.severity}
                    </td>
                    <td className="px-4 py-3">
                      {u ? (
                        <Link href={`/admin/users/${u.id}`} className="text-(--color-accent) hover:underline">
                          {u.email}
                        </Link>
                      ) : (
                        <span className="text-(--color-content-tertiary)">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      {e.ip_address ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      {e.endpoint ?? '—'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No security events recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
