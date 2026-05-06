import { createClient } from '@/lib/supabase/server'
import { CreateBroadcastForm } from './CreateBroadcastForm'

export const dynamic = 'force-dynamic'

export default async function AdminBroadcastsPage() {
  const supabase = await createClient()
  const { data: broadcasts } = await supabase
    .from('admin_broadcasts')
    .select('id,title,message,level,created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Broadcasts</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Send in-app messages to all users.
        </p>
      </div>

      <CreateBroadcastForm />

      <div className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <div className="border-b border-(--color-surface-border) px-5 py-3">
          <h2 className="text-sm font-semibold text-(--color-content)">Recent broadcasts</h2>
        </div>
        <ul className="divide-y divide-(--color-surface-border)">
          {(broadcasts ?? []).length === 0 ? (
            <li className="px-5 py-12 text-center text-sm text-(--color-content-tertiary)">
              No broadcasts yet.
            </li>
          ) : (
            (broadcasts ?? []).map((b) => (
              <li key={b.id} className="px-5 py-4">
                <div className="flex items-center justify-between text-xs text-(--color-content-tertiary)">
                  <span className="font-mono uppercase">{b.level}</span>
                  <span>{new Date(b.created_at).toLocaleString()}</span>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-(--color-content)">{b.title}</h3>
                <p className="mt-1 text-sm text-(--color-content-secondary)">{b.message}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
