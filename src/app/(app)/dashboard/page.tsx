import Link from 'next/link'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  Plus, Receipt, CreditCard, Repeat, AlertTriangle, Clock,
  Wallet, TrendingUp, ArrowRight, CheckCircle2, Zap, Target,
  Calendar, History, BarChart2, PieChart,
} from 'lucide-react'
import { BarChart } from '@/components/charts/BarChart'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, annualize, daysUntil, dueLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) redirect('/auth')
  const supabase = await createClient()

  const baseDate = new Date()
  const now = baseDate.toISOString().split('T')[0]
  const sevenDays = new Date(baseDate.getTime() + 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 86400000).toISOString().split('T')[0]

  // Parallelize profile + all data queries — eliminates sequential waterfall
  const [profileRes, billsRes, debtsRes, subsRes, goalsRes, incomesRes, transactionsRes, assetsRes] = await Promise.all([
    supabase.from('profiles').select('first_name,full_name').eq('id', user.id).single(),
    supabase.from('bills').select('id,biller,amount,due_date,status,frequency').eq('user_id', user.id).order('due_date', { ascending: true }),
    supabase.from('debts').select('id,name,remaining,min_payment,payment_due_date,status,frequency').eq('user_id', user.id).order('payment_due_date', { ascending: true }),
    supabase.from('subscriptions').select('id,name,amount,next_billing_date,status,frequency').eq('user_id', user.id).order('next_billing_date', { ascending: true }),
    supabase.from('goals').select('id,name,target_amount,current_amount,deadline').eq('user_id', user.id).order('deadline', { ascending: true }),
    supabase.from('incomes').select('amount,frequency').eq('user_id', user.id),
    supabase.from('transactions').select('id,name,amount,category,date,type').eq('user_id', user.id).gte('date', thirtyDaysAgo).order('date', { ascending: false }),
    supabase.from('assets').select('value,type').eq('user_id', user.id),
  ])

  const profile = profileRes.data
  const displayName = profile?.full_name || profile?.first_name || user.email?.split('@')[0] || 'User'

  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []
  const subs = subsRes.data ?? []
  const goals = goalsRes.data ?? []
  const incomes = incomesRes.data ?? []
  const allTransactions = transactionsRes.data ?? []
  const transactions = allTransactions.slice(0, 5)
  const assets = assetsRes.data ?? []

  const monthlyIncome = incomes.reduce((sum, inc) => sum + annualize(Number(inc.amount), inc.frequency), 0) / 12
  const monthlyObligations = (
    bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled').reduce((sum, b) => sum + annualize(Number(b.amount), b.frequency), 0) +
    debts.filter(d => d.status !== 'paid' && d.status !== 'cancelled').reduce((sum, d) => sum + annualize(Number(d.min_payment), d.frequency), 0) +
    subs.filter(s => s.status !== 'paid' && s.status !== 'cancelled').reduce((sum, s) => sum + annualize(Number(s.amount), s.frequency), 0)
  ) / 12
  const safeSpend = Math.max(0, monthlyIncome - monthlyObligations) / 30

  // Analytics — use full 30-day window, not the 5-item recent list
  const spendingByCategory = allTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {} as Record<string, number>)

  const categoryChartData = Object.entries(spendingByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value], i) => ({
      label,
      value,
      color: ['#494fdf', '#5a62f0', '#7b82f5', '#9ca2fa', '#bdc1ff', '#d0d6e0'][i] || '#8a8f98',
    }))

  const totalAssets = assets.reduce((sum, a) => sum + Number(a.value), 0)
  const totalDebtBalance = debts.reduce((sum, d) => sum + Number(d.remaining), 0)
  const netWorth = totalAssets - totalDebtBalance

  const pendingBills = bills.filter(b => b.status !== 'paid')
  const overdueBills = pendingBills.filter(b => b.due_date && b.due_date < now)
  const dueSoonBills = pendingBills.filter(b => b.due_date && b.due_date >= now && b.due_date <= sevenDays)

  const pendingDebts = debts.filter(d => d.status !== 'paid')
  const overdueDebts = pendingDebts.filter(d => d.payment_due_date && d.payment_due_date < now)
  const dueSoonDebts = pendingDebts.filter(d => d.payment_due_date && d.payment_due_date >= now && d.payment_due_date <= sevenDays)

  const pendingSubs = subs.filter(s => s.status === 'active')
  const dueSoonSubs = pendingSubs.filter(s => s.next_billing_date && s.next_billing_date >= now && s.next_billing_date <= sevenDays)

  const totalDue = [...pendingBills, ...pendingDebts.map(d => ({ ...d, amount: d.min_payment })), ...pendingSubs]
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const totalOverdue = [...overdueBills, ...overdueDebts.map(d => ({ ...d, amount: d.min_payment }))]
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const totalDueSoon = [...dueSoonBills, ...dueSoonDebts.map(d => ({ ...d, amount: d.min_payment })), ...dueSoonSubs]
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const overdueCount = overdueBills.length + overdueDebts.length
  const dueSoonCount = dueSoonBills.length + dueSoonDebts.length + dueSoonSubs.length

  type QItem = { id: string; name: string; amount: number; days: number; type: 'bill' | 'debt' | 'subscription'; href: string }
  const queue: QItem[] = [
    ...overdueBills.map(b => ({ id: b.id, name: b.biller, amount: Number(b.amount), days: daysUntil(b.due_date), type: 'bill' as const, href: `/bills/${b.id}` })),
    ...overdueDebts.map(d => ({ id: d.id, name: d.name, amount: Number(d.min_payment), days: daysUntil(d.payment_due_date), type: 'debt' as const, href: `/debts/${d.id}` })),
    ...dueSoonBills.map(b => ({ id: b.id, name: b.biller, amount: Number(b.amount), days: daysUntil(b.due_date), type: 'bill' as const, href: `/bills/${b.id}` })),
    ...dueSoonDebts.map(d => ({ id: d.id, name: d.name, amount: Number(d.min_payment), days: daysUntil(d.payment_due_date), type: 'debt' as const, href: `/debts/${d.id}` })),
    ...dueSoonSubs.map(s => ({ id: s.id, name: s.name, amount: Number(s.amount), days: daysUntil(s.next_billing_date), type: 'subscription' as const, href: `/subscriptions/${s.id}` })),
  ].sort((a, b) => a.days - b.days)

  const hasData = bills.length > 0 || debts.length > 0 || subs.length > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Welcome back, {displayName}</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">Here is everything you need to keep track of today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Wallet className="h-3.5 w-3.5"/>Total Due</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(totalDue)}</p>
        </CardContent></Card>
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-danger)"><AlertTriangle className="h-3.5 w-3.5"/>Overdue</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-danger)">{formatMoney(totalOverdue)}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{overdueCount} items</p>
        </CardContent></Card>
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-warning)"><Clock className="h-3.5 w-3.5"/>Due Soon</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-warning)">{formatMoney(totalDueSoon)}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{dueSoonCount} items</p>
        </CardContent></Card>
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><TrendingUp className="h-3.5 w-3.5"/>Safe Spend</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-success)">{formatMoney(safeSpend)}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">per day</p>
        </CardContent></Card>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Quick Add</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <QuickAddCard icon={Receipt} label="Bill" description="Add a recurring bill" href="/bills" />
          <QuickAddCard icon={CreditCard} label="Debt" description="Track a loan or card" href="/debts" />
          <QuickAddCard icon={Repeat} label="Subscription" description="Add a recurring charge" href="/subscriptions" />
          <QuickAddCard icon={Target} label="Goal" description="Set a savings target" href="/goals" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Priority Queue</h2>
          {queue.length > 0 && <span className="text-xs text-(--color-content-tertiary)">{queue.length} items</span>}
        </div>
        {queue.length > 0 ? (
          <div className="space-y-2">
            {queue.map(item => (
              <Link key={`${item.type}-${item.id}`} href={item.href} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors hover:border-(--color-content-tertiary)">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${item.days < 0 ? 'border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger)' : item.days <= 3 ? 'border-(--color-warning-border) bg-(--color-warning-bg) text-(--color-warning)' : 'border-(--color-surface-border) bg-(--color-surface) text-(--color-content-secondary)'}`}>
                  {item.type === 'bill' && <Receipt className="h-4 w-4" />}
                  {item.type === 'debt' && <CreditCard className="h-4 w-4" />}
                  {item.type === 'subscription' && <Repeat className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--color-content)">{item.name}</p>
                  <p className="text-xs text-(--color-content-tertiary)">{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold tabular-nums text-(--color-content)">{formatMoney(item.amount)}</p>
                  <Badge variant={item.days < 0 ? 'destructive' : item.days <= 3 ? 'warning' : 'default'} className="mt-0.5">{dueLabel(item.days)}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-(--color-content-tertiary)" />
              </Link>
            ))}
          </div>
        ) : hasData ? (
          <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-(--color-success)" />
            <p className="mt-3 text-sm font-medium text-(--color-content-secondary)">All caught up</p>
            <p className="mt-1 text-xs text-(--color-content-tertiary)">Nothing overdue or due soon.</p>
          </div>
        ) : (
          <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
            <Zap className="mx-auto h-8 w-8 text-(--color-content-tertiary)" />
            <p className="mt-3 text-sm font-medium text-(--color-content-secondary)">No obligations yet</p>
            <p className="mt-1 text-xs text-(--color-content-tertiary)">Add your first bill, debt, or subscription to get started.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild className="gap-2"><Link href="/bills"><Plus className="h-4 w-4" />Add bill</Link></Button>
            </div>
          </div>
        )}
      </div>

      {goals.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Goals</h2>
            <Link href="/goals" className="text-xs text-(--color-accent) hover:underline">View all</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
              return (
                <Card key={g.id} className="border-(--color-surface-border)">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-(--color-content)">{g.name}</span>
                      <span className="text-xs font-mono text-(--color-content-tertiary)">{pct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-(--color-surface-elevated)">
                      <div className="h-full rounded-full bg-(--color-accent) transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-(--color-content-tertiary)">{formatMoney(Number(g.current_amount))} of {formatMoney(Number(g.target_amount))}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar Strip */}
      <div>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Calendar className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5"/>Next 14 Days</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 14 }).map((_, i) => {
            const dayDate = new Date()
            dayDate.setDate(dayDate.getDate() + i)
            const dateStr = dayDate.toISOString().split('T')[0]
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'narrow' })
            const dayNum = dayDate.getDate()
            const isToday = i === 0

            // Find items due on this day
            const dayBills = bills.filter(b => b.due_date === dateStr && b.status !== 'paid')
            const dayDebts = debts.filter(debt => debt.payment_due_date === dateStr && debt.status !== 'paid')
            const daySubs = subs.filter(s => s.next_billing_date === dateStr && s.status === 'active')
            const dayItemDates = [
              ...dayBills.map(b => b.due_date),
              ...dayDebts.map(debt => debt.payment_due_date),
              ...daySubs.map(s => s.next_billing_date),
            ].filter((dt): dt is string => !!dt)
            const hasOverdue = dayItemDates.some(dt => dt < now)
            const hasDueSoon = dayItemDates.some(dt => dt >= now && dt <= sevenDays)
            const dotColor = hasOverdue ? 'bg-(--color-danger)' : hasDueSoon ? 'bg-(--color-warning)' : (dayBills.length + dayDebts.length + daySubs.length) > 0 ? 'bg-(--color-accent)' : 'bg-transparent'

            return (
              <div key={dateStr} className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 min-w-14 ${isToday ? 'border-(--color-accent) bg-(--color-accent-muted)' : 'border-(--color-surface-border) bg-(--color-surface-raised)'}`}>
                <span className="text-[10px] font-medium text-(--color-content-tertiary) uppercase">{dayName}</span>
                <span className={`text-sm font-semibold ${isToday ? 'text-(--color-accent)' : 'text-(--color-content)'}`}>{dayNum}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {transactions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><History className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5"/>Recent Activity</h2>
            <Link href="/transactions" className="text-xs text-(--color-accent) hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'income'
              const isExpense = tx.type === 'expense'
              return (
                <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors hover:border-(--color-content-tertiary)">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${isIncome ? 'border-(--color-success-border) bg-(--color-success-bg) text-(--color-success)' : isExpense ? 'border-(--color-danger-border) bg-(--color-danger-bg) text-(--color-danger)' : 'border-(--color-surface-border) bg-(--color-surface) text-(--color-content-secondary)'}`}>
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-(--color-content)">{tx.name}</p>
                    <p className="text-xs text-(--color-content-tertiary) capitalize">{tx.category.replace('_', ' ')} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-semibold tabular-nums ${isIncome ? 'text-(--color-success)' : 'text-(--color-content)'}`}>
                      {isIncome ? '+' : isExpense ? '-' : ''}{formatMoney(Number(tx.amount))}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Analytics */}
      {categoryChartData.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><BarChart2 className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5"/>Spending by Category</h2>
            <Link href="/transactions" className="text-xs text-(--color-accent) hover:underline">View all</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-(--color-surface-border) lg:col-span-2"><CardContent className="p-5">
              <BarChart data={categoryChartData} />
            </CardContent></Card>
            <Card className="border-(--color-surface-border)"><CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><PieChart className="h-3.5 w-3.5"/>Snapshot</div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Net worth</p>
                  <p className={cn('text-xl font-semibold tabular-nums', netWorth >= 0 ? 'text-(--color-success)' : 'text-(--color-danger)')}>{formatMoney(netWorth)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total assets</p>
                  <p className="text-sm font-mono font-medium tabular-nums text-(--color-content)">{formatMoney(totalAssets)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total debt</p>
                  <p className="text-sm font-mono font-medium tabular-nums text-(--color-content)">{formatMoney(totalDebtBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Monthly obligations</p>
                  <p className="text-sm font-mono font-medium tabular-nums text-(--color-content)">{formatMoney(monthlyObligations)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Monthly income</p>
                  <p className="text-sm font-mono font-medium tabular-nums text-(--color-success)">{formatMoney(monthlyIncome)}/mo</p>
                </div>
              </div>
            </CardContent></Card>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickAddCard({ icon: Icon, label, description, href }: { icon: React.ComponentType<{ className?: string }>; label: string; description: string; href: string }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-lg border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors hover:border-(--color-content-tertiary)">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-(--color-accent-muted)">
        <Icon className="h-4 w-4 text-(--color-accent)" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-(--color-content)">{label}</p>
        <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{description}</p>
      </div>
    </Link>
  )
}
