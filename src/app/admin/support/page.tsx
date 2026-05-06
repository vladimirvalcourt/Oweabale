import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('support_tickets')
    .select('id,ticket_number,subject,status,priority,department,created_at,user_id,sla_due_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else if (!status) {
    query = query.in('status', ['open', 'in_progress', 'pending'])
  }

  const { data: tickets } = await query

  const userIds = Array.from(new Set((tickets ?? []).map((t) => t.user_id).filter(Boolean)))
  const { data: users } = userIds.length
    ? await supabase.from('profiles').select('id,email,first_name,last_name').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Support tickets</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          {tickets?.length ?? 0} tickets
        </p>
      </div>

      <div className="flex gap-1 text-xs">
        <Tab label="Open" href="/admin/support" active={!status} />
        <Tab label="In progress" href="/admin/support?status=in_progress" active={status === 'in_progress'} />
        <Tab label="Resolved" href="/admin/support?status=resolved" active={status === 'resolved'} />
        <Tab label="All" href="/admin/support?status=all" active={status === 'all'} />
      </div>

      <div className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">#</th>
              <th className="px-4 py-3 text-left font-normal">Subject</th>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-4 py-3 text-left font-normal">Priority</th>
              <th className="px-4 py-3 text-left font-normal">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {tickets && tickets.length > 0 ? (
              tickets.map((t) => {
                const u = t.user_id ? userMap.get(t.user_id) : null
                return (
                  <tr key={t.id} className="hover:bg-(--color-surface-elevated)">
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      #{t.ticket_number}
                    </td>
                    <td className="px-4 py-3 text-(--color-content)">{t.subject}</td>
                    <td className="px-4 py-3">
                      {u ? (
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-(--color-accent) hover:underline"
                        >
                          {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                        </Link>
                      ) : (
                        <span className="text-(--color-content-tertiary)">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-(--color-content-secondary)">{t.status}</td>
                    <td className="px-4 py-3 capitalize text-(--color-content-secondary)">{t.priority}</td>
                    <td className="px-4 py-3 text-(--color-content-tertiary)">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No tickets.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Tab({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-md bg-(--color-accent-muted) px-3 py-1.5 font-medium text-(--color-accent)'
          : 'rounded-md px-3 py-1.5 text-(--color-content-secondary) hover:bg-(--color-surface-elevated) hover:text-(--color-content)'
      }
    >
      {label}
    </Link>
  )
}
