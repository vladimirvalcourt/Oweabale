import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowLeftRight, DollarSign, CalendarDays, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: tx } = await supabase.from('transactions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!tx) notFound()

  const isIncome = tx.type === 'income'
  const isExpense = tx.type === 'expense'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/transactions"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{tx.name}</h1>
            <Badge variant={isIncome ? 'success' : isExpense ? 'destructive' : 'outline'} className="capitalize">{tx.type}</Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">{tx.category.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><ArrowLeftRight className="h-3.5 w-3.5"/>Amount</div>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums', isIncome ? 'text-(--color-success)' : 'text-(--color-content)')}>
            {isIncome ? '+' : isExpense ? '-' : ''}{formatMoney(Number(tx.amount))}
          </p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CalendarDays className="h-3.5 w-3.5"/>Date</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatDate(tx.date)}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Tag className="h-3.5 w-3.5"/>Category</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{tx.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
        </CardContent></Card>
      </div>
    </div>
  )
}
