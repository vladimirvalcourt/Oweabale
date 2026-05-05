'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, FileText, CheckCircle2, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate, daysUntil, dueLabel } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Invoice {
  id: string
  client_name: string
  amount: number
  issued_date: string
  due_date: string | null
  status: string
  notes: string | null
}

export function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('client_invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      toast.success('Invoice marked as paid')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('client_invoices').delete().eq('id', id)
      if (error) throw error
      toast.success('Invoice deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = invoices.map(i => ({ Client: i.client_name, Amount: i.amount, Issued: i.issued_date, Due: i.due_date, Status: i.status, Notes: i.notes }))
    downloadTextFile(toCsv(rows), `invoices-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded CSV')
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <FileText className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No invoices yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Create invoices for clients and track payment status.</p>
      </div>
    )
  }

  const now = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport} className="gap-2 border-(--color-surface-border) text-(--color-content-secondary)">
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>
      {invoices.map(inv => {
        const isPaid = inv.status === 'paid'
        const days = inv.due_date ? daysUntil(inv.due_date) : null
        const isOverdue = inv.due_date && inv.due_date < now && !isPaid
        return (
          <div key={inv.id} className={cn(
            'flex items-center gap-4 rounded-panel border bg-(--color-surface-raised) p-4 transition-colors',
            isOverdue ? 'border-(--color-danger-border)' : 'border-(--color-surface-border)',
            isPaid && 'opacity-60',
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <FileText className="h-5 w-5 text-(--color-content-secondary)" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-(--color-content)">{inv.client_name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-(--color-content-tertiary)">
                <span>Issued {formatDate(inv.issued_date)}</span>
                {inv.due_date && days !== null && (
                  <><span>·</span><span className={cn(isOverdue && 'text-(--color-danger) font-medium')}>{dueLabel(days)}</span></>
                )}
              </div>
              {inv.notes && <p className="mt-0.5 text-xs text-(--color-content-tertiary) truncate">{inv.notes}</p>}
            </div>
            <div className="text-right">
              <p className={cn('text-sm font-mono font-semibold tabular-nums', isPaid ? 'text-(--color-content-tertiary) line-through' : 'text-(--color-content)')}>
                {formatMoney(Number(inv.amount))}
              </p>
              <Badge
                variant={isPaid ? 'success' : isOverdue ? 'destructive' : inv.status === 'draft' ? 'default' : 'warning'}
                className="mt-1 capitalize"
              >
                {inv.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {!isPaid && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-success) hover:bg-(--color-success-bg)"
                  onClick={() => handleMarkPaid(inv.id)} disabled={processingId === inv.id}>
                  {processingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:bg-(--color-danger-bg)"
                onClick={() => handleDelete(inv.id)} disabled={processingId === inv.id}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
