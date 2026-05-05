import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, CreditCard, Percent, CalendarDays, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { EditDebtSheet } from './EditDebtSheet'
import { cn } from '@/lib/utils'

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: debt } = await supabase.from('debts').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!debt) notFound()

  const days = debt.payment_due_date ? daysUntil(debt.payment_due_date) : null
  const isOverdue = days !== null && days < 0 && debt.status !== 'paid'
  const isPaid = debt.status === 'paid'
  const progress = debt.original_amount > 0 ? Math.round(((debt.original_amount - debt.remaining) / debt.original_amount) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/debts"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{debt.name}</h1>
            <Badge variant={isPaid ? 'success' : isOverdue ? 'destructive' : 'default'} className="capitalize">{isPaid ? 'Paid' : isOverdue ? 'Overdue' : debt.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">{debt.type.replace('_', ' ')}</p>
        </div>
        <EditDebtSheet debt={debt} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CreditCard className="h-3.5 w-3.5"/>Balance</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(debt.remaining))}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Percent className="h-3.5 w-3.5"/>APR</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{debt.apr ? `${debt.apr}%` : '—'}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><TrendingDown className="h-3.5 w-3.5"/>Min payment</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{debt.min_payment ? formatMoney(Number(debt.min_payment)) : '—'}</p>
        </CardContent></Card>

        {debt.payment_due_date && (
          <Card className="border-(--color-surface-border)"><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CalendarDays className="h-3.5 w-3.5"/>Due</div>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', isOverdue ? 'text-(--color-danger)' : days! >= 0 && days! <= 3 ? 'text-(--color-warning)' : 'text-(--color-content)')}>
              {new Date(debt.payment_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
            <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{dueLabel(days!)}</p>
          </CardContent></Card>
        )}
      </div>

      {debt.original_amount > 0 && (
        <Card className="border-(--color-surface-border)"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-(--color-content)">Payoff progress</span>
            <span className="text-sm font-mono text-(--color-content-secondary)">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-(--color-surface-elevated)">
            <div className="h-full rounded-full bg-(--color-accent) transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-(--color-content-tertiary)">
            <span>{formatMoney(Number(debt.original_amount) - Number(debt.remaining))} paid</span>
            <span>{formatMoney(Number(debt.remaining))} remaining</span>
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
