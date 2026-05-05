'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, PiggyBank } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Budget {
  id: string
  category: string
  amount: number
  period: string
  spent: number
}

export function BudgetsList({ budgets }: { budgets: Budget[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      toast.success('Budget deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  if (budgets.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <PiggyBank className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No budgets yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add a budget to start tracking spending limits.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {budgets.map(budget => {
        const pct = budget.amount > 0 ? Math.min(100, Math.round((budget.spent / budget.amount) * 100)) : 0
        const isOver = budget.spent > budget.amount
        const isWarning = !isOver && pct >= 80
        const remaining = budget.amount - budget.spent

        return (
          <div
            key={budget.id}
            className={cn(
              'rounded-panel border bg-(--color-surface-raised) p-5 transition-colors',
              isOver ? 'border-(--color-danger-border)' : isWarning ? 'border-(--color-warning-border)' : 'border-(--color-surface-border)',
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium capitalize text-(--color-content)">
                  {budget.category.replace('_', ' ')}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{budget.period}</Badge>
                  {isOver && <Badge variant="destructive" className="text-xs">Over budget</Badge>}
                  {isWarning && <Badge variant="warning" className="text-xs">Near limit</Badge>}
                  {!isOver && !isWarning && pct > 0 && <Badge variant="success" className="text-xs">On track</Badge>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)"
                onClick={() => handleDelete(budget.id)}
                disabled={deletingId === budget.id}
              >
                {deletingId === budget.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-(--color-content-tertiary)">Spent</p>
                  <p className={cn(
                    'text-xl font-semibold tabular-nums',
                    isOver ? 'text-(--color-danger)' : isWarning ? 'text-(--color-warning)' : 'text-(--color-content)',
                  )}>
                    {formatMoney(budget.spent)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-(--color-content-tertiary)">Limit</p>
                  <p className="text-sm font-medium text-(--color-content-secondary)">{formatMoney(budget.amount)}</p>
                </div>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-(--color-surface-elevated)">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isOver ? 'bg-(--color-danger)' : isWarning ? 'bg-(--color-warning)' : 'bg-(--color-accent)',
                  )}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-(--color-content-tertiary)">{pct}% used</span>
                {!isOver
                  ? <span className="text-(--color-content-tertiary)">{formatMoney(remaining)} left</span>
                  : <span className="font-medium text-(--color-danger)">{formatMoney(Math.abs(remaining))} over</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
