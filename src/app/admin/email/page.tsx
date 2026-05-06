import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  const supabase = await createClient()

  const [templatesRes, blastsRes, queueRes, suppressionsRes] = await Promise.all([
    supabase
      .from('admin_email_templates')
      .select('id,key,subject,updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('admin_email_blasts')
      .select('id,subject,recipient_count,sent_at,status')
      .order('sent_at', { ascending: false })
      .limit(20),
    supabase
      .from('admin_email_queue')
      .select('id,subject,recipient_count,status,queued_at')
      .order('queued_at', { ascending: false })
      .limit(20),
    supabase
      .from('admin_email_suppressions')
      .select('id', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Email</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Templates, blasts, queue, and suppressions.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Templates" value={templatesRes.data?.length ?? 0} />
        <Stat label="Blasts (recent)" value={blastsRes.data?.length ?? 0} />
        <Stat label="In queue" value={queueRes.data?.filter((q) => q.status !== 'sent').length ?? 0} />
        <Stat label="Suppressed" value={suppressionsRes.count ?? 0} />
      </div>

      <Section title="Templates">
        {(templatesRes.data ?? []).length === 0 ? (
          <Empty text="No templates." />
        ) : (
          <ul className="divide-y divide-(--color-surface-border)">
            {templatesRes.data!.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-(--color-content)">{t.subject}</div>
                  <div className="font-mono text-xs text-(--color-content-tertiary)">{t.key}</div>
                </div>
                <span className="text-xs text-(--color-content-tertiary)">
                  {new Date(t.updated_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent blasts">
        {(blastsRes.data ?? []).length === 0 ? (
          <Empty text="No email blasts sent yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
              <tr>
                <th className="px-4 py-3 text-left font-normal">Subject</th>
                <th className="px-4 py-3 text-left font-normal">Recipients</th>
                <th className="px-4 py-3 text-left font-normal">Status</th>
                <th className="px-4 py-3 text-left font-normal">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-surface-border)">
              {blastsRes.data!.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-(--color-content)">{b.subject}</td>
                  <td className="px-4 py-3 text-(--color-content-secondary)">
                    {b.recipient_count ?? 0}
                  </td>
                  <td className="px-4 py-3 capitalize text-(--color-content-secondary)">{b.status}</td>
                  <td className="px-4 py-3 text-(--color-content-tertiary)">
                    {b.sent_at ? new Date(b.sent_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
      <div className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{value}</div>
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
  return <div className="px-5 py-8 text-center text-sm text-(--color-content-tertiary)">{text}</div>
}
