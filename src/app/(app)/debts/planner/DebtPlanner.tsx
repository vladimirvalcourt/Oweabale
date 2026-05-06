'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingDown, Zap, Trophy, Info, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { cn } from '@/lib/utils'

/* ─── types ─────────────────────────────────────────────────────── */

interface Debt {
  id: string
  name: string
  remaining: number
  apr: number
  min_payment: number
  type: string
}

interface DebtState {
  id: string
  name: string
  balance: number
  apr: number
  minPayment: number
}

interface OrderEntry {
  name: string
  payoffMonth: number
  apr: number
  originalBalance: number
}

interface MonthRow {
  month: number
  label: string
  totalPayment: number
  totalInterest: number
  totalBalance: number
}

interface SimResult {
  months: number
  totalInterest: number
  totalPaid: number
  payoffDate: Date
  order: OrderEntry[]
  schedule: MonthRow[]
}

/* ─── algorithm ─────────────────────────────────────────────────── */

function simulate(
  debts: Debt[],
  extra: number,
  strategy: 'avalanche' | 'snowball',
): SimResult | null {
  const active = debts.filter(d => Number(d.remaining) > 0.01 && Number(d.min_payment) > 0)
  if (active.length === 0) return null

  let state: DebtState[] = active.map(d => ({
    id: d.id,
    name: d.name,
    balance: Number(d.remaining),
    apr: Number(d.apr),
    minPayment: Number(d.min_payment),
  }))

  const originals = Object.fromEntries(active.map(d => [d.id, Number(d.remaining)]))
  const aprs = Object.fromEntries(active.map(d => [d.id, Number(d.apr)]))

  let totalInterest = 0
  let totalPaid = 0
  let months = 0
  let rollingExtra = extra
  const order: OrderEntry[] = []
  const schedule: MonthRow[] = []
  const MAX_MONTHS = 600

  while (state.length > 0 && months < MAX_MONTHS) {
    months++

    // 1. Accrue monthly interest on every balance
    let monthInterest = 0
    for (const d of state) {
      if (d.apr > 0) {
        const interest = (d.apr / 100 / 12) * d.balance
        d.balance += interest
        totalInterest += interest
        monthInterest += interest
      }
    }

    // 2. Pay minimums on all debts
    let monthPayment = 0
    for (const d of state) {
      const payment = Math.min(d.minPayment, d.balance)
      d.balance = Math.max(0, d.balance - payment)
      totalPaid += payment
      monthPayment += payment
    }

    // 3. Sort remaining for extra-payment target
    const targets = [...state]
      .filter(d => d.balance > 0.01)
      .sort((a, b) =>
        strategy === 'avalanche'
          ? b.apr !== a.apr ? b.apr - a.apr : a.balance - b.balance
          : a.balance !== b.balance ? a.balance - b.balance : b.apr - a.apr,
      )

    // 4. Apply extra (+ rollovers) to the target debt(s)
    let leftover = rollingExtra
    for (const target of targets) {
      if (leftover <= 0.01) break
      const apply = Math.min(leftover, target.balance)
      target.balance = Math.max(0, target.balance - apply)
      totalPaid += apply
      monthPayment += apply
      leftover -= apply
      const s = state.find(x => x.id === target.id)
      if (s) s.balance = target.balance
    }

    // 5. Collect paid-off debts; roll their minimums into the extra pool
    const paid = state.filter(d => d.balance <= 0.01)
    for (const p of paid) {
      order.push({
        name: p.name,
        payoffMonth: months,
        apr: aprs[p.id] ?? 0,
        originalBalance: originals[p.id] ?? 0,
      })
      rollingExtra += p.minPayment
    }
    state = state.filter(d => d.balance > 0.01)

    const totalBalance = state.reduce((s, d) => s + d.balance, 0)
    const d = new Date()
    d.setMonth(d.getMonth() + months - 1)
    schedule.push({
      month: months,
      label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      totalPayment: monthPayment,
      totalInterest: monthInterest,
      totalBalance,
    })
  }

  const payoffDate = new Date()
  payoffDate.setMonth(payoffDate.getMonth() + months)

  return { months, totalInterest, totalPaid, payoffDate, order, schedule }
}

/* ─── helpers ───────────────────────────────────────────────────── */

function monthsToText(n: number): string {
  const y = Math.floor(n / 12)
  const m = n % 12
  const parts = []
  if (y > 0) parts.push(`${y} yr`)
  if (m > 0) parts.push(`${m} mo`)
  return parts.join(' ') || '< 1 mo'
}

/* ─── component ─────────────────────────────────────────────────── */

export function DebtPlanner({ debts }: { debts: Debt[] }) {
  const [extra, setExtra] = React.useState(0)
  const [strategy, setStrategy] = React.useState<'avalanche' | 'snowball'>('avalanche')
  const [showFullSchedule, setShowFullSchedule] = React.useState(false)

  const active = debts.filter(d => Number(d.remaining) > 0.01 && Number(d.min_payment) > 0)
  const totalBalance = active.reduce((s, d) => s + Number(d.remaining), 0)
  const totalMin = active.reduce((s, d) => s + Number(d.min_payment), 0)

  const avalanche = React.useMemo(() => simulate(debts, extra, 'avalanche'), [debts, extra])
  const snowball = React.useMemo(() => simulate(debts, extra, 'snowball'), [debts, extra])
  const selected = strategy === 'avalanche' ? avalanche : snowball

  const interestSavings = avalanche && snowball
    ? snowball.totalInterest - avalanche.totalInterest
    : 0
  const monthsSaved = avalanche && snowball
    ? Math.abs(snowball.months - avalanche.months)
    : 0

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <CreditCard className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No active debts with minimum payments</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add a debt with a balance and minimum payment to use the planner.</p>
        <Button asChild className="mt-5 gap-2">
          <Link href="/debts">Back to Debts</Link>
        </Button>
      </div>
    )
  }

  const scheduleRows = selected?.schedule ?? []
  const visibleRows = showFullSchedule ? scheduleRows : scheduleRows.slice(0, 24)

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/debts"><ArrowLeft className="h-4 w-4" />Back to Debts</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Debt Payoff Planner</h1>
        <p className="mt-1 text-sm text-(--color-content-secondary)">
          {active.length} active debts · {formatMoney(totalBalance)} total balance · {formatMoney(totalMin)}/mo minimums
        </p>
      </div>

      {/* ── Extra payment input ── */}
      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-(--color-content)">
              Extra monthly payment <span className="text-(--color-content-tertiary)">(above all minimums)</span>
            </label>
            <p className="mt-0.5 text-xs text-(--color-content-tertiary)">
              Even $50–$100 extra per month dramatically shortens payoff time.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--color-content-tertiary)">$</span>
              <input
                type="number"
                min={0}
                step={10}
                value={extra}
                onChange={e => setExtra(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-7 pr-3 text-sm text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 50, 100, 200, 500].map(v => (
                <button
                  key={v}
                  onClick={() => setExtra(v)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    extra === v
                      ? 'border-(--color-accent) bg-(--color-accent-muted) text-(--color-accent)'
                      : 'border-(--color-surface-border) text-(--color-content-secondary) hover:border-(--color-accent-muted) hover:text-(--color-content)',
                  )}
                >
                  {v === 0 ? 'Minimums only' : `+${formatMoney(v)}`}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Strategy comparison ── */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-(--color-content-tertiary)">Choose Your Strategy</p>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Avalanche */}
          <button
            onClick={() => setStrategy('avalanche')}
            className={cn(
              'rounded-xl border p-5 text-left transition-all',
              strategy === 'avalanche'
                ? 'border-(--color-accent) bg-(--color-accent-muted)'
                : 'border-(--color-surface-border) bg-(--color-surface-raised) hover:border-(--color-accent-muted)',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-(--color-accent)" />
                <span className="text-sm font-semibold text-(--color-content)">Avalanche</span>
              </div>
              {strategy === 'avalanche' && <Badge variant="secondary">Selected</Badge>}
              {interestSavings > 0 && strategy !== 'avalanche' && (
                <Badge variant="success">Saves more</Badge>
              )}
            </div>
            <p className="mt-1.5 text-xs text-(--color-content-secondary)">Pay highest APR first. Minimizes total interest paid.</p>
            {avalanche && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total interest</p>
                  <p className="text-lg font-semibold tabular-nums text-(--color-danger)">{formatMoney(avalanche.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Payoff time</p>
                  <p className="text-lg font-semibold text-(--color-content)">{monthsToText(avalanche.months)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Debt-free by</p>
                  <p className="text-sm font-medium text-(--color-content)">
                    {avalanche.payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total paid</p>
                  <p className="text-sm font-medium text-(--color-content)">{formatMoney(avalanche.totalPaid)}</p>
                </div>
              </div>
            )}
          </button>

          {/* Snowball */}
          <button
            onClick={() => setStrategy('snowball')}
            className={cn(
              'rounded-xl border p-5 text-left transition-all',
              strategy === 'snowball'
                ? 'border-(--color-accent) bg-(--color-accent-muted)'
                : 'border-(--color-surface-border) bg-(--color-surface-raised) hover:border-(--color-accent-muted)',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-(--color-warning)" />
                <span className="text-sm font-semibold text-(--color-content)">Snowball</span>
              </div>
              {strategy === 'snowball' && <Badge variant="secondary">Selected</Badge>}
              {interestSavings < 0 && strategy !== 'snowball' && (
                <Badge variant="success">Saves more</Badge>
              )}
            </div>
            <p className="mt-1.5 text-xs text-(--color-content-secondary)">Pay smallest balance first. Builds momentum with quick wins.</p>
            {snowball && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total interest</p>
                  <p className="text-lg font-semibold tabular-nums text-(--color-danger)">{formatMoney(snowball.totalInterest)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Payoff time</p>
                  <p className="text-lg font-semibold text-(--color-content)">{monthsToText(snowball.months)}</p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Debt-free by</p>
                  <p className="text-sm font-medium text-(--color-content)">
                    {snowball.payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Total paid</p>
                  <p className="text-sm font-medium text-(--color-content)">{formatMoney(snowball.totalPaid)}</p>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── Savings callout ── */}
      {avalanche && snowball && (
        <div className="rounded-xl border border-(--color-success-border) bg-(--color-success-bg) px-5 py-4">
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-(--color-success)" />
            <div>
              <p className="text-sm font-semibold text-(--color-content)">
                {interestSavings > 0
                  ? `Avalanche saves you ${formatMoney(interestSavings)} in interest`
                  : interestSavings < 0
                  ? `Snowball saves you ${formatMoney(Math.abs(interestSavings))} in interest`
                  : 'Both strategies cost the same interest for your debts'}
              </p>
              <p className="mt-0.5 text-xs text-(--color-content-secondary)">
                {monthsSaved > 0
                  ? `${interestSavings > 0 ? 'Avalanche' : 'Snowball'} also gets you debt-free ${monthsToText(monthsSaved)} sooner. `
                  : ''}
                {interestSavings === 0
                  ? 'Choose Snowball if you want the motivation of quick wins on smaller balances.'
                  : interestSavings > 0
                  ? 'Choose Snowball instead if you need the psychological boost of eliminating debts quickly.'
                  : 'Choose Avalanche instead if minimizing total cost is your priority.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Payoff order ── */}
      {selected && selected.order.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-(--color-content-tertiary)">
            Payoff Order — {strategy === 'avalanche' ? 'Highest APR First' : 'Lowest Balance First'}
          </p>
          <div className="space-y-2">
            {selected.order.map((entry, i) => (
              <div
                key={entry.name}
                className="flex items-center gap-4 rounded-lg border border-(--color-surface-border) bg-(--color-surface-raised) p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--color-accent-muted) text-sm font-bold text-(--color-accent)">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-(--color-content)">{entry.name}</p>
                  <p className="text-xs text-(--color-content-tertiary)">
                    {formatMoney(entry.originalBalance)} · {entry.apr > 0 ? `${entry.apr}% APR` : '0% APR'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-(--color-content)">
                    {entry.payoffMonth === 1
                      ? 'Month 1'
                      : `Month ${entry.payoffMonth}`}
                  </p>
                  <p className="text-xs text-(--color-content-tertiary)">
                    {(() => {
                      const d = new Date()
                      d.setMonth(d.getMonth() + entry.payoffMonth)
                      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    })()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Monthly schedule ── */}
      {selected && scheduleRows.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-(--color-content-tertiary)">
              Payment Schedule
            </p>
            <div className="flex items-center gap-1.5 text-xs text-(--color-content-tertiary)">
              <Info className="h-3.5 w-3.5" />
              {scheduleRows.length} months total
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-(--color-surface-border)">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-(--color-surface-border) bg-(--color-surface-raised)">
                <tr>
                  <th className="px-4 py-2.5 font-medium text-(--color-content-secondary)">Month</th>
                  <th className="px-4 py-2.5 text-right font-medium text-(--color-content-secondary)">Payment</th>
                  <th className="px-4 py-2.5 text-right font-medium text-(--color-content-secondary)">Interest</th>
                  <th className="px-4 py-2.5 text-right font-medium text-(--color-content-secondary)">Principal</th>
                  <th className="px-4 py-2.5 text-right font-medium text-(--color-content-secondary)">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr
                    key={row.month}
                    className={cn(
                      'border-b border-(--color-surface-border) last:border-0',
                      i % 2 === 0 ? 'bg-(--color-surface)' : 'bg-(--color-surface-raised)',
                    )}
                  >
                    <td className="px-4 py-2 font-medium text-(--color-content)">{row.label}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-(--color-content)">{formatMoney(row.totalPayment)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-(--color-danger)">{formatMoney(row.totalInterest)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-(--color-success)">{formatMoney(row.totalPayment - row.totalInterest)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-(--color-content)">{formatMoney(row.totalBalance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-(--color-surface-border) bg-(--color-surface-raised)">
                <tr>
                  <td className="px-4 py-2.5 text-xs font-medium text-(--color-content)">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-(--color-content)">{formatMoney(selected.totalPaid)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-(--color-danger)">{formatMoney(selected.totalInterest)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-(--color-success)">{formatMoney(selected.totalPaid - selected.totalInterest)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-(--color-content-tertiary)">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {!showFullSchedule && scheduleRows.length > 24 && (
            <button
              onClick={() => setShowFullSchedule(true)}
              className="mt-2 w-full rounded-md border border-(--color-surface-border) py-2 text-xs text-(--color-content-secondary) transition-colors hover:bg-(--color-surface-raised)"
            >
              Show all {scheduleRows.length} months
            </button>
          )}
        </div>
      )}

    </div>
  )
}
