import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, CreditCard, LifeBuoy, Shield, AlertTriangle, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(
    cents / 100
  )
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [
    usersRes,
    paidRes,
    trialRes,
    activeSubsRes,
    paymentsRes,
    openTicketsRes,
    securityRes,
    flaggedRes,
    recentSignupsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('trial_ends_at', new Date().toISOString())
      .neq('plan', 'pro'),
    supabase.from('billing_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('billing_payments')
      .select('amount_total,currency,created_at')
      .gt('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
      .eq('status', 'succeeded'),
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved')
      .neq('status', 'closed'),
    supabase
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', new Date(Date.now() - 86400000).toISOString())
      .in('severity', ['high', 'critical']),
    supabase.from('flagged_transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase
      .from('profiles')
      .select('id,email,first_name,last_name,created_at,plan')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalUsers = usersRes.count ?? 0
  const paidUsers = paidRes.count ?? 0
  const trialUsers = trialRes.count ?? 0
  const activeSubs = activeSubsRes.count ?? 0
  const openTickets = openTicketsRes.count ?? 0
  const securityIncidents = securityRes.count ?? 0
  const flaggedCount = flaggedRes.count ?? 0
  const revenue30d = (paymentsRes.data ?? []).reduce((sum, p) => sum + Number(p.amount_total ?? 0), 0)

  const stats = [
    { label: 'Total users', value: totalUsers.toLocaleString(), icon: Users, href: '/admin/users' },
    { label: 'Paid users', value: paidUsers.toLocaleString(), icon: CreditCard, href: '/admin/billing' },
    { label: 'Active trials', value: trialUsers.toLocaleString(), icon: TrendingUp, href: '/admin/users?filter=trial' },
    { label: 'Active subs', value: activeSubs.toLocaleString(), icon: CreditCard, href: '/admin/billing' },
    { label: 'Revenue (30d)', value: formatMoney(revenue30d), icon: TrendingUp, href: '/admin/billing' },
    { label: 'Open tickets', value: openTickets.toLocaleString(), icon: LifeBuoy, href: '/admin/support' },
    { label: 'Security (24h)', value: securityIncidents.toLocaleString(), icon: Shield, href: '/admin/security' },
    { label: 'Flagged txns', value: flaggedCount.toLocaleString(), icon: AlertTriangle, href: '/admin/users' },
  ]

  const recentSignups = recentSignupsRes.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Overview</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          Snapshot of users, revenue, support, and security.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors hover:border-(--color-content-tertiary)"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">
                {label}
              </span>
              <Icon className="h-4 w-4 text-(--color-content-tertiary)" />
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums text-(--color-content)">{value}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised)">
        <div className="flex items-center justify-between border-b border-(--color-surface-border) px-5 py-4">
          <h2 className="text-sm font-semibold text-(--color-content)">Recent signups</h2>
          <Link href="/admin/users" className="text-xs text-(--color-accent) hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-(--color-surface-border)">
          {recentSignups.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-(--color-content-tertiary)">
              No users yet.
            </div>
          ) : (
            recentSignups.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-(--color-surface-elevated)"
              >
                <div>
                  <div className="text-sm font-medium text-(--color-content)">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown'}
                  </div>
                  <div className="text-xs text-(--color-content-tertiary)">{u.email}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-(--color-content-tertiary)">
                  <span className="rounded border border-(--color-surface-border) px-2 py-0.5 capitalize">
                    {u.plan ?? 'free'}
                  </span>
                  <span>{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
