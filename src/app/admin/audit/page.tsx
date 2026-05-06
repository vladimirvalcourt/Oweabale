import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const supabase = await createClient()
  const { data: logs } = await supabase
    .from('audit_log')
    .select('id,user_id,table_name,record_id,action,created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id).filter(Boolean)))
  const { data: users } = userIds.length
    ? await supabase.from('profiles').select('id,email').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Audit log</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Latest 200 database mutations.
        </p>
      </div>

      <div className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">When</th>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">Action</th>
              <th className="px-4 py-3 text-left font-normal">Table</th>
              <th className="px-4 py-3 text-left font-normal">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {logs && logs.length > 0 ? (
              logs.map((l) => {
                const u = l.user_id ? userMap.get(l.user_id) : null
                return (
                  <tr key={l.id} className="hover:bg-(--color-surface-elevated)">
                    <td className="px-4 py-3 whitespace-nowrap text-(--color-content-tertiary)">
                      {new Date(l.created_at).toLocaleString()}
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
                    <td className="px-4 py-3 font-mono text-xs uppercase text-(--color-content-secondary)">
                      {l.action}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content)">{l.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      {l.record_id ?? '—'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No audit log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
