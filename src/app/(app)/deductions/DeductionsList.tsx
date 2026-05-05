'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, Calculator, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDate } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'

interface Deduction {
  id: string
  name: string
  category: string
  amount: number
  date: string
}

export function DeductionsList({ deductions }: { deductions: Deduction[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return deductions
    return deductions.filter(d => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q))
  }, [deductions, query])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deduction?')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('deductions').delete().eq('id', id)
      if (error) throw error
      toast.success('Deduction deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(d => ({ Date: d.date, Description: d.name, Category: d.category, Amount: d.amount }))
    downloadTextFile(toCsv(rows), `deductions-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded CSV')
  }

  if (deductions.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Calculator className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No deductions logged</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Track tax-deductible expenses throughout the year.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search deductions..."
          className="flex-1 rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 px-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        />
        <Button variant="outline" onClick={handleExport} className="gap-2 border-(--color-surface-border) text-(--color-content-secondary)">
          <Download className="h-4 w-4" />Export
        </Button>
      </div>
      {filtered.map(d => (
        <div key={d.id} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <Calculator className="h-5 w-5 text-(--color-content-secondary)" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--color-content)">{d.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">{d.category.replace(/_/g, ' ')}</Badge>
              <span className="text-xs text-(--color-content-tertiary)">{formatDate(d.date)}</span>
            </div>
          </div>
          <p className="text-sm font-mono font-semibold tabular-nums text-(--color-success)">{formatMoney(Number(d.amount))}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:bg-(--color-danger-bg)"
            onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}>
            {deletingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      ))}
    </div>
  )
}
