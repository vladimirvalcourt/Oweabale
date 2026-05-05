'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, FileWarning, CheckCircle2, ExternalLink, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Citation {
  id: string
  type: string
  jurisdiction: string | null
  amount: number
  penalty_fee: number | null
  date: string
  citation_number: string | null
  payment_url: string | null
  status: string
}

export function CitationsList({ citations }: { citations: Citation[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)

  const handleMarkPaid = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase.from('citations').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', id)
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
    if (!confirm('Delete this citation?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('citations').delete().eq('id', id)
      if (error) throw error
      toast.success('Citation deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = citations.map(c => ({ Type: c.type, Jurisdiction: c.jurisdiction, Amount: c.amount, Penalty: c.penalty_fee, Date: c.date, Citation_Number: c.citation_number, Status: c.status }))
    downloadTextFile(toCsv(rows), `citations-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded CSV')
  }

  if (citations.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <FileWarning className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No citations recorded</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Track parking tickets, traffic violations, and fines.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport} className="gap-2 border-(--color-surface-border) text-(--color-content-secondary)">
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>
      {citations.map(c => {
        const isPaid = c.status === 'paid' || c.status === 'dismissed'
        const total = Number(c.amount) + Number(c.penalty_fee ?? 0)
        return (
          <div key={c.id} className={cn(
            'flex items-center gap-4 rounded-panel border bg-(--color-surface-raised) p-4 transition-colors',
            isPaid ? 'border-(--color-surface-border) opacity-60' : 'border-(--color-danger-border)',
          )}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <FileWarning className="h-5 w-5 text-(--color-content-secondary)" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize text-(--color-content)">{c.type.replace('_', ' ')} ticket</span>
                {c.citation_number && <span className="text-xs text-(--color-content-tertiary)">#{c.citation_number}</span>}
              </div>
              <p className="mt-0.5 text-xs text-(--color-content-tertiary)">
                {c.jurisdiction ?? 'Unknown jurisdiction'} · {formatDate(c.date)}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-sm font-mono font-semibold tabular-nums', isPaid ? 'text-(--color-content-tertiary) line-through' : 'text-(--color-danger)')}>
                {formatMoney(total)}
                {c.penalty_fee && Number(c.penalty_fee) > 0 && <span className="text-xs text-(--color-content-tertiary) ml-1">(+{formatMoney(Number(c.penalty_fee))} penalty)</span>}
              </p>
              <Badge variant={isPaid ? 'success' : c.status === 'contested' ? 'warning' : 'destructive'} className="mt-1 capitalize">
                {c.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {c.payment_url && !isPaid && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-content-secondary)" asChild>
                  <a href={c.payment_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              )}
              {!isPaid && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-success) hover:bg-(--color-success-bg)"
                  onClick={() => handleMarkPaid(c.id)} disabled={processingId === c.id}>
                  {processingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:bg-(--color-danger-bg)"
                onClick={() => handleDelete(c.id)} disabled={processingId === c.id}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
