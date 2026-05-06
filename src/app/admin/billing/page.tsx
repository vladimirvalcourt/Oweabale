import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export default async function AdminBillingPage() {
  const supabase = await createClient()

  const [subsRes, paymentsRes] = await Promise.all([
    supabase
      .from('billing_subscriptions')
      .select('id,user_id,stripe_subscription_id,stripe_price_id,status,current_period_end,cancel_at_period_end,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('billing_payments')
      .select('id,user_id,amount_total,currency,status,product_key,created_at,stripe_payment_intent_id')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const subs = subsRes.data ?? []
  const payments = paymentsRes.data ?? []

  const userIds = Array.from(
    new Set([...subs.map((s) => s.user_id), ...payments.map((p) => p.user_id)].filter(Boolean))
  )
  const { data: users } = userIds.length
    ? await supabase.from('profiles').select('id,email,first_name,last_name').in('id', userIds)
    : { data: [] }
  const userMap = new Map((users ?? []).map((u) => [u.id, u]))

  const totalRevenue = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + Number(p.amount_total ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Billing</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Subscriptions and payments — last 100 / 50.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Active subs" value={subs.filter((s) => s.status === 'active').length} />
        <Stat
          label="Cancelling"
          value={subs.filter((s) => s.cancel_at_period_end).length}
        />
        <Stat label="Recent payments" value={payments.length} />
        <Stat label="Revenue (recent)" value={formatMoney(totalRevenue)} />
      </div>

      <Section title="Subscriptions">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-4 py-3 text-left font-normal">Period ends</th>
              <th className="px-4 py-3 text-left font-normal">Price</th>
              <th className="px-4 py-3 text-left font-normal">Stripe ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {subs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No subscriptions.
                </td>
              </tr>
            ) : (
              subs.map((s) => {
                const u = s.user_id ? userMap.get(s.user_id) : null
                return (
                  <tr key={s.id} className="hover:bg-(--color-surface-elevated)">
                    <td className="px-4 py-3">
                      {u ? (
                        <Link href={`/admin/users/${u.id}`} className="text-(--color-accent) hover:underline">
                          {u.email}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-(--color-content-secondary)">
                      {s.status}
                      {s.cancel_at_period_end && (
                        <span className="ml-2 text-xs text-(--color-warning)">(cancelling)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--color-content-tertiary)">
                      {s.current_period_end
                        ? new Date(s.current_period_end).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      {s.stripe_price_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-(--color-content-tertiary)">
                      {s.stripe_subscription_id ?? '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Section>

      <Section title="Recent payments">
        <table className="w-full text-sm">
          <thead className="border-b border-(--color-surface-border) bg-(--color-surface) text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
            <tr>
              <th className="px-4 py-3 text-left font-normal">User</th>
              <th className="px-4 py-3 text-left font-normal">Product</th>
              <th className="px-4 py-3 text-left font-normal">Amount</th>
              <th className="px-4 py-3 text-left font-normal">Status</th>
              <th className="px-4 py-3 text-left font-normal">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-surface-border)">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-(--color-content-tertiary)">
                  No payments.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const u = p.user_id ? userMap.get(p.user_id) : null
                return (
                  <tr key={p.id} className="hover:bg-(--color-surface-elevated)">
                    <td className="px-4 py-3">
                      {u ? (
                        <Link href={`/admin/users/${u.id}`} className="text-(--color-accent) hover:underline">
                          {u.email}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-(--color-content-secondary)">{p.product_key ?? '—'}</td>
                    <td className="px-4 py-3 font-medium tabular-nums text-(--color-content)">
                      {formatMoney(Number(p.amount_total ?? 0), p.currency ?? 'usd')}
                    </td>
                    <td className="px-4 py-3 capitalize text-(--color-content-secondary)">{p.status}</td>
                    <td className="px-4 py-3 text-(--color-content-tertiary)">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
