'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, Trash2, Loader2, Receipt, Search, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Bill {
  id: string
  biller: string
  amount: number
  category: string
  due_date: string
  frequency: string
  status: string
  auto_pay: boolean
}

interface BillsListProps {
  bills: Bill[]
}

function nextDueDate(current: string, frequency: string): string {
  const d = new Date(current)
  switch (frequency) {
    case 'weekly':    d.setDate(d.getDate() + 7); break
    case 'biweekly':  d.setDate(d.getDate() + 14); break
    case 'monthly':   d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

export function BillsList({ bills }: BillsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('due_date_asc')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = q
      ? bills.filter(b =>
          b.biller.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q) ||
          b.frequency.toLowerCase().includes(q)
        )
      : bills

    const [field, dir] = sort.split('_') as [string, 'asc' | 'desc']
    const mult = dir === 'asc' ? 1 : -1

    result = [...result].sort((a, b) => {
      if (field === 'due_date') {
        return mult * (new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      }
      if (field === 'amount') {
        return mult * (Number(a.amount) - Number(b.amount))
      }
      if (field === 'biller') {
        return mult * a.biller.localeCompare(b.biller)
      }
      return 0
    })

    return result
  }, [bills, query, sort])

  const handleMarkPaid = async (id: string) => {
    const bill = bills.find(b => b.id === id)
    if (!bill) return
    setProcessingId(id)
    try {
      const isRecurring = bill.frequency !== 'one-time' && bill.frequency !== 'once'
      const update = isRecurring
        ? { status: 'pending', due_date: nextDueDate(bill.due_date, bill.frequency), updated_at: new Date().toISOString() }
        : { status: 'paid', updated_at: new Date().toISOString() }
      const { error } = await supabase.from('bills').update(update).eq('id', id)
      if (error) throw error
      toast.success(isRecurring ? 'Paid — next due date set' : 'Marked as paid')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bill?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('bills').delete().eq('id', id)
      if (error) throw error
      toast.success('Bill deleted')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(msg)
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(b => ({
      Biller: b.biller,
      Category: b.category,
      Amount: b.amount,
      Due_Date: b.due_date,
      Frequency: b.frequency,
      Status: b.status,
    }))
    const csv = toCsv(rows)
    downloadTextFile(csv, `bills-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded bills CSV')
  }

  if (bills.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Receipt className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No bills yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">
          Add your first bill to start tracking.
        </p>
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
            placeholder="Search bills..."
            className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="due_date_asc">Due soonest</option>
          <option value="due_date_desc">Due latest</option>
          <option value="amount_asc">Amount low–high</option>
          <option value="amount_desc">Amount high–low</option>
          <option value="biller_asc">Name A–Z</option>
          <option value="biller_desc">Name Z–A</option>
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
          {filtered.length} of {bills.length} results
        </p>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
          <p className="text-sm text-(--color-content-secondary)">No bills match &quot;{query}&quot;</p>
        </div>
      )}
      {filtered.map((bill) => {
        const days = daysUntil(bill.due_date)
        const isOverdue = bill.due_date < now && bill.status !== 'paid'
        const isPaid = bill.status === 'paid'

        return (
          <div
            key={bill.id}
            className={cn(
              'flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors',
              isOverdue && 'border-l-4 border-l-(--color-danger)',
              isPaid && 'opacity-60'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <Receipt className="h-5 w-5 text-(--color-content-secondary)" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/bills/${bill.id}`}
                  className="truncate text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors"
                >
                  {bill.biller}
                </Link>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                  {bill.category.replace('_', ' ')}
                </Badge>
                {bill.auto_pay && (
                  <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                    Auto-pay
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-(--color-content-tertiary)">
                <span className={cn(
                  isOverdue && 'text-(--color-danger) font-medium',
                  days >= 0 && days <= 3 && bill.status !== 'paid' && 'text-(--color-warning) font-medium'
                )}>
                  {dueLabel(days)}
                </span>
                <span>•</span>
                <span className="capitalize">{bill.frequency}</span>
              </div>
            </div>

            <div className="text-right">
              <p className={cn(
                'text-sm font-mono font-semibold tabular-nums',
                isPaid ? 'text-(--color-content-tertiary) line-through' : 'text-(--color-content)'
              )}>
                {formatMoney(Number(bill.amount))}
              </p>
              <Badge
                variant={isPaid ? 'success' : isOverdue ? 'destructive' : days >= 0 && days <= 3 ? 'warning' : 'default'}
                className="mt-1"
              >
                {isPaid ? 'Paid' : isOverdue ? 'Overdue' : days >= 0 && days <= 3 ? 'Due soon' : 'Pending'}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {!isPaid && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-(--color-success) hover:text-(--color-success) hover:bg-(--color-success-bg)"
                  onClick={() => handleMarkPaid(bill.id)}
                  disabled={processingId === bill.id}
                >
                  {processingId === bill.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)"
                onClick={() => handleDelete(bill.id)}
                disabled={processingId === bill.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
