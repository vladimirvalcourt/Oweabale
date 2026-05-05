'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle2, Trash2, Loader2, Repeat, Search, ArrowUpDown, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, daysUntil, dueLabel } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Subscription {
  id: string
  name: string
  amount: number
  frequency: string
  next_billing_date: string | null
  status: string
}

interface SubscriptionsListProps {
  subscriptions: Subscription[]
}

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('next_billing_date_asc')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = q
      ? subscriptions.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.frequency.toLowerCase().includes(q)
        )
      : subscriptions

    const [field, dir] = sort.split('_') as [string, 'asc' | 'desc']
    const mult = dir === 'asc' ? 1 : -1

    result = [...result].sort((a, b) => {
      if (field === 'next_billing_date') {
        const da = a.next_billing_date ? new Date(a.next_billing_date).getTime() : Infinity
        const db = b.next_billing_date ? new Date(b.next_billing_date).getTime() : Infinity
        return mult * (da - db)
      }
      if (field === 'amount') {
        return mult * (Number(a.amount) - Number(b.amount))
      }
      if (field === 'name') {
        return mult * a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [subscriptions, query, sort])

  const handleCancel = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('subscriptions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('Subscription cancelled')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subscription?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id)
      if (error) throw error
      toast.success('Subscription deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(s => ({
      Name: s.name,
      Amount: s.amount,
      Frequency: s.frequency,
      Next_Billing_Date: s.next_billing_date,
      Status: s.status,
    }))
    const csv = toCsv(rows)
    downloadTextFile(csv, `subscriptions-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded subscriptions CSV')
  }

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Repeat className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No subscriptions yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add your first subscription to start tracking.</p>
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
            placeholder="Search subscriptions..."
            className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="next_billing_date_asc">Due soonest</option>
          <option value="next_billing_date_desc">Due latest</option>
          <option value="amount_asc">Amount low–high</option>
          <option value="amount_desc">Amount high–low</option>
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
          {filtered.length} of {subscriptions.length} results
        </p>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
          <p className="text-sm text-(--color-content-secondary)">No subscriptions match &quot;{query}&quot;</p>
        </div>
      )}
      {filtered.map((sub) => {
        const days = sub.next_billing_date ? daysUntil(sub.next_billing_date) : null
        const isOverdue = sub.next_billing_date && sub.next_billing_date < now && sub.status === 'active'
        const isCancelled = sub.status === 'cancelled'
        const annualAmount = sub.frequency === 'monthly' ? Number(sub.amount) * 12 :
          sub.frequency === 'weekly' ? Number(sub.amount) * 52 :
          sub.frequency === 'biweekly' ? Number(sub.amount) * 26 :
          sub.frequency === 'quarterly' ? Number(sub.amount) * 4 :
          sub.frequency === 'yearly' ? Number(sub.amount) : Number(sub.amount) * 12

        return (
          <div key={sub.id} className={cn(
            'flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors',
            isOverdue && 'border-l-4 border-l-(--color-danger)',
            isCancelled && 'opacity-50'
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <Repeat className="h-5 w-5 text-(--color-content-secondary)" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/subscriptions/${sub.id}`} className="truncate text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors">
                  {sub.name}
                </Link>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs capitalize">{sub.frequency}</Badge>
              </div>
              {sub.next_billing_date && (
                <div className="mt-0.5 text-xs text-(--color-content-tertiary)">
                  {isOverdue ? (
                    <span className="text-(--color-danger) font-medium">{dueLabel(days!)}</span>
                  ) : days !== null && days >= 0 && days <= 3 && sub.status === 'active' ? (
                    <span className="text-(--color-warning) font-medium">{dueLabel(days)}</span>
                  ) : (
                    <span>{dueLabel(days!)}</span>
                  )}
                </div>
              )}
              <p className="mt-1 text-xs text-(--color-content-tertiary)">{formatMoney(annualAmount)}/year</p>
            </div>

            <div className="text-right">
              <p className={cn('text-sm font-mono font-semibold tabular-nums', isCancelled ? 'text-(--color-content-tertiary) line-through' : 'text-(--color-content)')}>
                {formatMoney(Number(sub.amount))}
              </p>
              <p className="text-xs text-(--color-content-tertiary)">/{sub.frequency.replace('_', '')}</p>
              <Badge variant={isCancelled ? 'secondary' : isOverdue ? 'destructive' : days !== null && days >= 0 && days <= 3 ? 'warning' : 'default'} className="mt-1">
                {isCancelled ? 'Cancelled' : isOverdue ? 'Overdue' : days !== null && days >= 0 && days <= 3 ? 'Due soon' : 'Active'}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {!isCancelled && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-warning) hover:text-(--color-warning) hover:bg-(--color-warning-bg)" onClick={() => handleCancel(sub.id)} disabled={processingId === sub.id}>
                  {processingId === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDelete(sub.id)} disabled={processingId === sub.id}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
