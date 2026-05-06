import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminUserActions } from './AdminUserActions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [profileRes, billsRes, debtsRes, txnsRes, notesRes, lifecycleRes, ticketsRes, paymentsRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('bills').select('id', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', id),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', id),
      supabase
        .from('admin_user_notes')
        .select('id,body,note_type,created_at,admin_user_id')
        .eq('target_user_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('admin_user_lifecycle_events')
        .select('id,action,reason,created_at')
        .eq('target_user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('support_tickets')
        .select('id,subject,status,priority,created_at,ticket_number')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('billing_payments')
        .select('id,amount_total,currency,status,created_at,product_key')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

  if (!profileRes.data) notFound()
  const profile = profileRes.data

  const stats = [
    { label: 'Bills', value: billsRes.count ?? 0 },
    { label: 'Debts', value: debtsRes.count ?? 0 },
    { label: 'Transactions', value: txnsRes.count ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="mb-3 inline-flex items-center gap-1 text-xs text-(--color-content-tertiary) hover:text-(--color-content)"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to users
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">
              {[profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
                profile.email ||
                'Unknown user'}
              {profile.is_admin && (
                <span className="ml-3 rounded bg-(--color-danger-bg) px-2 py-0.5 align-middle text-[10px] font-mono uppercase tracking-wider text-(--color-danger)">
                  Admin
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-(--color-content-secondary)">{profile.email}</p>
            <p className="mt-1 text-xs font-mono text-(--color-content-tertiary)">{profile.id}</p>
          </div>
          <AdminUserActions
            userId={profile.id}
            isAdmin={profile.is_admin ?? false}
            trialEndsAt={profile.trial_ends_at}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Plan" value={profile.plan ?? 'free'} />
        <Field
          label="Trial ends"
          value={profile.trial_ends_at ? new Date(profile.trial_ends_at).toLocaleDateString() : '—'}
        />
        <Field
          label="Joined"
          value={new Date(profile.created_at).toLocaleDateString()}
        />
        <Field
          label="Onboarded"
          value={profile.has_completed_onboarding ? 'Yes' : 'No'}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4"
          >
            <div className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
              {s.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <Section title="Recent payments">
        {(paymentsRes.data ?? []).length === 0 ? (
          <Empty text="No payments." />
        ) : (
          <Table
            rows={(paymentsRes.data ?? []).map((p) => ({
              key: p.id,
              cells: [
                p.product_key ?? '—',
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: (p.currency ?? 'usd').toUpperCase(),
                }).format(Number(p.amount_total ?? 0) / 100),
                <span key="status" className="capitalize">
                  {p.status}
                </span>,
                new Date(p.created_at).toLocaleString(),
              ],
            }))}
            headers={['Product', 'Amount', 'Status', 'Date']}
          />
        )}
      </Section>

      <Section title="Support tickets">
        {(ticketsRes.data ?? []).length === 0 ? (
          <Empty text="No tickets." />
        ) : (
          <Table
            rows={(ticketsRes.data ?? []).map((t) => ({
              key: t.id,
              cells: [
                <Link key="link" href={`/admin/support/${t.id}`} className="text-(--color-accent) hover:underline">
                  #{t.ticket_number}
                </Link>,
                t.subject,
                <span key="status" className="capitalize">
                  {t.status}
                </span>,
                <span key="priority" className="capitalize">
                  {t.priority}
                </span>,
                new Date(t.created_at).toLocaleDateString(),
              ],
            }))}
            headers={['#', 'Subject', 'Status', 'Priority', 'Created']}
          />
        )}
      </Section>

      <Section title="Lifecycle events">
        {(lifecycleRes.data ?? []).length === 0 ? (
          <Empty text="No lifecycle events." />
        ) : (
          <Table
            rows={(lifecycleRes.data ?? []).map((e) => ({
              key: e.id,
              cells: [e.action, e.reason ?? '—', new Date(e.created_at).toLocaleString()],
            }))}
            headers={['Action', 'Reason', 'When']}
          />
        )}
      </Section>

      <Section title="Admin notes">
        {(notesRes.data ?? []).length === 0 ? (
          <Empty text="No notes." />
        ) : (
          <ul className="divide-y divide-(--color-surface-border)">
            {(notesRes.data ?? []).map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-xs text-(--color-content-tertiary)">
                  <span className="capitalize">{n.note_type ?? 'note'}</span>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-(--color-content)">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) px-4 py-3">
      <div className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium capitalize text-(--color-content)">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
      <div className="border-b border-(--color-surface-border) px-5 py-3">
        <h2 className="text-sm font-semibold text-(--color-content)">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-6 text-center text-sm text-(--color-content-tertiary)">{text}</div>
}

function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<{ key: string; cells: React.ReactNode[] }>
}) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-4 py-2 text-left font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-(--color-surface-border)">
        {rows.map((r) => (
          <tr key={r.key}>
            {r.cells.map((c, i) => (
              <td key={i} className="px-4 py-3 text-(--color-content-secondary)">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
