'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, Trash2, Loader2, CreditCard, Search, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Debt {
  id: string
  name: string
  type: string
  apr: number
  remaining: number
  min_payment: number
  paid: number
  payment_due_date: string | null
  original_amount: number
  status: string
}

interface DebtsListProps {
  debts: Debt[]
}

export function DebtsList({ debts }: DebtsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('payment_due_date_asc')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = q
      ? debts.filter(d =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q)
        )
      : debts

    const [field, dir] = sort.split('_') as [string, 'asc' | 'desc']
    const mult = dir === 'asc' ? 1 : -1

    result = [...result].sort((a, b) => {
      if (field === 'payment_due_date') {
        const da = a.payment_due_date ? new Date(a.payment_due_date).getTime() : Infinity
        const db = b.payment_due_date ? new Date(b.payment_due_date).getTime() : Infinity
        return mult * (da - db)
      }
      if (field === 'amount') {
        return mult * (Number(a.remaining) - Number(b.remaining))
      }
      if (field === 'name') {
        return mult * a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [debts, query, sort])

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('debts').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('Marked as paid')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this debt?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
      toast.success('Debt deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(d => ({
      Name: d.name,
      Type: d.type,
      APR: d.apr,
      Remaining: d.remaining,
      Min_Payment: d.min_payment,
      Payment_Due_Date: d.payment_due_date,
      Status: d.status,
    }))
    const csv = toCsv(rows)
    downloadTextFile(csv, `debts-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded debts CSV')
  }

  if (debts.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <CreditCard className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No debts yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add your first debt to start tracking.</p>
      </div>
    )
  }

  const now = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-content-tertiary)" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search debts..."
            className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="payment_due_date_asc">Due soonest</option>
          <option value="payment_due_date_desc">Due latest</option>
          <option value="amount_asc">Balance low–high</option>
          <option value="amount_desc">Balance high–low</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
        <Button
          variant="outline"
          onClick={handleExport}
          className="shrink-0 border-(--color-surface-border) px-2.5 text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
          title="Export to CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      {query.trim() && (
        <p className="text-xs text-(--color-content-tertiary)">
          {filtered.length} of {debts.length} results
        </p>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
          <p className="text-sm text-(--color-content-secondary)">No debts match &quot;{query}&quot;</p>
        </div>
      )}
      {filtered.map((debt) => {
        const days = debt.payment_due_date ? daysUntil(debt.payment_due_date) : null
        const isOverdue = debt.payment_due_date && debt.payment_due_date < now && debt.status !== 'paid'
        const isPaid = debt.status === 'paid'
        const progress = debt.original_amount > 0 ? Math.round(((debt.original_amount - debt.remaining) / debt.original_amount) * 100) : 0

        return (
          <div
            key={debt.id}
            className={cn(
              'rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors',
              isOverdue && 'border-l-4 border-l-(--color-danger)',
              isPaid && 'opacity-60'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
                <CreditCard className="h-5 w-5 text-(--color-content-secondary)" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/debts/${debt.id}`} className="truncate text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors">
                    {debt.name}
                  </Link>
                  <Badge variant="outline" className="hidden sm:inline-flex text-xs capitalize">{debt.type.replace('_', ' ')}</Badge>
                </div>
                {debt.payment_due_date && (
                  <div className="mt-0.5 text-xs text-(--color-content-tertiary)">
                    {isOverdue ? (
                      <span className="text-(--color-danger) font-medium">{dueLabel(days!)}</span>
                    ) : days !== null && days >= 0 && days <= 3 && !isPaid ? (
                      <span className="text-(--color-warning) font-medium">{dueLabel(days)}</span>
                    ) : (
                      <span>{dueLabel(days!)}</span>
                    )}
                    {debt.apr > 0 && <span> • APR {debt.apr}%</span>}
                  </div>
                )}

                {debt.original_amount > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-(--color-content-tertiary)">
                      <span>Paid off</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-(--color-surface-elevated)">
                      <div className="h-full rounded-full bg-(--color-accent) transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className={cn('text-sm font-mono font-semibold tabular-nums', isPaid ? 'text-(--color-content-tertiary) line-through' : 'text-(--color-content)')}>
                  {formatMoney(Number(debt.remaining))}
                </p>
                {debt.min_payment > 0 && !isPaid && (
                  <p className="text-xs text-(--color-content-tertiary)">Min {formatMoney(Number(debt.min_payment))}/mo</p>
                )}
                <Badge variant={isPaid ? 'success' : isOverdue ? 'destructive' : days !== null && days >= 0 && days <= 3 ? 'warning' : 'default'} className="mt-1">
                  {isPaid ? 'Paid' : isOverdue ? 'Overdue' : days !== null && days >= 0 && days <= 3 ? 'Due soon' : 'Pending'}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                {!isPaid && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-success) hover:text-(--color-success) hover:bg-(--color-success-bg)" onClick={() => handleMarkPaid(debt.id)} disabled={processingId === debt.id}>
                    {processingId === debt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDelete(debt.id)} disabled={processingId === debt.id}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
