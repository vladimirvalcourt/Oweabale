import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Receipt, BadgeCheck, Repeat } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { DeleteBillButton } from './DeleteBillButton'
import { EditBillSheet } from './EditBillSheet'
import { cn } from '@/lib/utils'

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: bill } = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!bill) notFound()

  const days = daysUntil(bill.due_date)
  const isOverdue = days < 0 && bill.status !== 'paid'
  const isPaid = bill.status === 'paid'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/bills"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{bill.biller}</h1>
            <Badge
              variant={isPaid ? 'success' : isOverdue ? 'destructive' : days >= 0 && days <= 3 ? 'warning' : 'default'}
              className="capitalize"
            >
              {isPaid ? 'Paid' : isOverdue ? 'Overdue' : days >= 0 && days <= 3 ? 'Due soon' : bill.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">
            {bill.category.replace('_', ' ')} · {bill.frequency}
            {bill.auto_pay && ' · Auto-pay enabled'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EditBillSheet bill={bill} />
          <DeleteBillButton id={bill.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Receipt className="h-3.5 w-3.5"/>Amount</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(bill.amount))}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">/{bill.frequency.replace('_', '')}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Repeat className="h-3.5 w-3.5"/>Next due</div>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums', isOverdue ? 'text-(--color-danger)' : days >= 0 && days <= 3 ? 'text-(--color-warning)' : 'text-(--color-content)')}>
            {new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{dueLabel(days)}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><BadgeCheck className="h-3.5 w-3.5"/>Annual cost</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">
            {formatMoney(
              bill.frequency === 'monthly' ? Number(bill.amount) * 12 :
              bill.frequency === 'weekly' ? Number(bill.amount) * 52 :
              bill.frequency === 'biweekly' ? Number(bill.amount) * 26 :
              bill.frequency === 'quarterly' ? Number(bill.amount) * 4 :
              bill.frequency === 'yearly' ? Number(bill.amount) : Number(bill.amount) * 12
            )}
          </p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">per year</p>
        </CardContent></Card>
      </div>
    </div>
  )
}
