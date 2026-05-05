import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Repeat, CalendarDays, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { EditSubscriptionSheet } from './EditSubscriptionSheet'
import { cn } from '@/lib/utils'

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!sub) notFound()

  const days = sub.next_billing_date ? daysUntil(sub.next_billing_date) : null
  const isOverdue = days !== null && days < 0 && sub.status === 'active'
  const isCancelled = sub.status === 'cancelled'
  const annualCost = sub.frequency === 'monthly' ? Number(sub.amount) * 12 :
    sub.frequency === 'weekly' ? Number(sub.amount) * 52 :
    sub.frequency === 'biweekly' ? Number(sub.amount) * 26 :
    sub.frequency === 'quarterly' ? Number(sub.amount) * 4 :
    sub.frequency === 'yearly' ? Number(sub.amount) : Number(sub.amount) * 12

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/subscriptions"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{sub.name}</h1>
            <Badge variant={isCancelled ? 'secondary' : isOverdue ? 'destructive' : 'default'} className="capitalize">{isCancelled ? 'Cancelled' : sub.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">{sub.frequency} · {formatMoney(Number(sub.amount))}</p>
        </div>
        <EditSubscriptionSheet subscription={sub} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><DollarSign className="h-3.5 w-3.5"/>Amount</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(sub.amount))}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">/{sub.frequency.replace('_', '')}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CalendarDays className="h-3.5 w-3.5"/>Next billing</div>
          {sub.next_billing_date ? (
            <>
              <p className={cn('mt-2 text-2xl font-semibold tabular-nums', isOverdue ? 'text-(--color-danger)' : days! >= 0 && days! <= 3 ? 'text-(--color-warning)' : 'text-(--color-content)')}>
                {new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{dueLabel(days!)}</p>
            </>
          ) : (
            <p className="mt-2 text-2xl font-semibold text-(--color-content-tertiary)">—</p>
          )}
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Repeat className="h-3.5 w-3.5"/>Annual cost</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(annualCost)}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">per year</p>
        </CardContent></Card>
      </div>
    </div>
  )
}
