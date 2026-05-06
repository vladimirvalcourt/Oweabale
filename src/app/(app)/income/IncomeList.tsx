'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'

interface Income {
  id: string
  name: string
  amount: number
  frequency: string
  source_type: string
  next_date: string | null
}

interface IncomeListProps {
  incomes: Income[]
}

export function IncomeList({ incomes }: IncomeListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('incomes').delete().eq('id', id)
      if (error) throw error
      toast.success('Income deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  if (incomes.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Wallet className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No income sources yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add your salary, freelance, or other income.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {incomes.map((inc) => (
        <div key={inc.id} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <Wallet className="h-5 w-5 text-(--color-success)" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link href={`/income/${inc.id}`} className="truncate text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors">
                {inc.name}
              </Link>
              <Badge variant="outline" className="text-xs capitalize">{inc.source_type.replace('_', ' ')}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{inc.frequency.replace('_', ' ')}</Badge>
            </div>
            {inc.next_date && (
              <p className="mt-0.5 text-xs text-(--color-content-tertiary)">
                Next: {new Date(inc.next_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-semibold tabular-nums text-(--color-success)">{formatMoney(Number(inc.amount))}</p>
            <p className="text-xs text-(--color-content-tertiary)">/{inc.frequency.replace('_', '')}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDelete(inc.id)} disabled={processingId === inc.id}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
