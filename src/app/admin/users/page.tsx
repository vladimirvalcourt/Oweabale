import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; filter?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { q, filter } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('id,email,first_name,last_name,plan,trial_ends_at,trial_expired,is_admin,created_at,has_completed_onboarding')
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) {
    query = query.or(
      `email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    )
  }

  if (filter === 'trial') {
    query = query.gt('trial_ends_at', new Date().toISOString()).neq('plan', 'pro')
  } else if (filter === 'paid') {
    query = query.eq('plan', 'pro')
  } else if (filter === 'admin') {
    query = query.eq('is_admin', true)
  }

  const { data: users } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Users</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {users?.length ?? 0} {(users?.length ?? 0) === 1 ? 'user' : 'users'} (showing latest 100)
          </p>
        </div>
      </div>

      <form className="flex items-center gap-2" action="/admin/users">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-content-tertiary)" />
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by email or name…"
            className="h-9 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          />
        </div>
        <div className="flex gap-1 text-xs">
          <FilterTab label="All" href="/admin/users" active={!filter} />
          <FilterTab label="Trial" href="/admin/users?filter=trial" active={filter === 'trial'} />
          <FilterTab label="Paid" href="/admin/users?filter=paid" active={filter === 'paid'} />
          <FilterTab label="Admins" href="/admin/users?filter=admin" active={filter === 'admin'} />
        </div>
      </form>

      <div className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">Plan</th>
              <th className="px-4 py-3 text-left font-normal">Trial ends</th>
              <th className="px-4 py-3 text-left font-normal">Onboarded</th>
              <th className="px-4 py-3 text-left font-normal">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {users && users.length > 0 ? (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer transition-colors hover:bg-(--color-surface-elevated)"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${u.id}`} className="block">
                      <div className="font-medium text-(--color-content)">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown'}
                        {u.is_admin && (
                          <span className="ml-2 rounded bg-(--color-danger-bg) px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-(--color-danger)">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-(--color-content-tertiary)">{u.email}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-(--color-content-secondary) capitalize">{u.plan ?? 'free'}</td>
                  <td className="px-4 py-3 text-(--color-content-secondary)">
                    {u.trial_ends_at ? (
                      <span
                        className={
                          new Date(u.trial_ends_at) < new Date()
                            ? 'text-(--color-danger)'
                            : 'text-(--color-content-secondary)'
                        }
                      >
                        {new Date(u.trial_ends_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-(--color-content-tertiary)">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-(--color-content-secondary)">
                    {u.has_completed_onboarding ? (
                      <span className="text-(--color-success)">Yes</span>
                    ) : (
                      <span className="text-(--color-warning)">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-(--color-content-tertiary)">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilterTab({ label, href, active }: { label: string; href: string; active: boolean }) {
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
