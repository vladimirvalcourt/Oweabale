'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface CreditFix {
  id: string
  item_type: string
  description: string
  bureau: string | null
  amount: number | null
  status: string
  notes: string | null
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  removed: 'success',
  resolved: 'success',
  disputed: 'warning',
  pending: 'destructive',
}

export function CreditFixList({ items }: { items: CreditFix[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)

  const handleAdvance = async (item: CreditFix) => {
    const next = item.status === 'pending' ? 'disputed' : item.status === 'disputed' ? 'resolved' : 'removed'
    setProcessingId(item.id)
    try {
      const { error } = await supabase.from('credit_fixes').update({ status: next, updated_at: new Date().toISOString() }).eq('id', item.id)
      if (error) throw error
      toast.success(`Status updated to ${next}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('credit_fixes').delete().eq('id', id)
      if (error) throw error
      toast.success('Item deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-(--color-content-tertiary)" />
        <p className="mt-3 text-sm font-medium text-(--color-content-secondary)">No items tracked</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Add collections, late payments, or inquiries you are disputing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const isDone = item.status === 'removed' || item.status === 'resolved'
        const nextLabel = item.status === 'pending' ? 'Mark disputed' : item.status === 'disputed' ? 'Mark resolved' : null
        return (
          <div key={item.id} className={cn(
            'flex items-start gap-4 rounded-panel border bg-(--color-surface-raised) p-4 transition-colors',
            isDone ? 'border-(--color-success-border) opacity-70' : 'border-(--color-surface-border)',
          )}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <ShieldCheck className="h-4 w-4 text-(--color-content-secondary)" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-(--color-content)">{item.description}</span>
                <Badge variant="outline" className="text-xs capitalize">{item.item_type.replace(/_/g, ' ')}</Badge>
                {item.bureau && <Badge variant="outline" className="text-xs">{item.bureau}</Badge>}
              </div>
              {item.amount && Number(item.amount) > 0 && (
                <p className="mt-0.5 text-xs text-(--color-content-tertiary)">Balance: {formatMoney(Number(item.amount))}</p>
              )}
              {item.notes && <p className="mt-0.5 text-xs text-(--color-content-tertiary) truncate">{item.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant={STATUS_VARIANT[item.status] ?? 'default'} className="capitalize">{item.status}</Badge>
              {nextLabel && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-success) hover:bg-(--color-success-bg)"
                  onClick={() => handleAdvance(item)} disabled={processingId === item.id} title={nextLabel}>
                  {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:bg-(--color-danger-bg)"
                onClick={() => handleDelete(item.id)} disabled={processingId === item.id}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
