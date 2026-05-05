'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Loader2, Car, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'

interface MileageEntry {
  id: string
  trip_date: string
  start_location: string | null
  end_location: string | null
  miles: number
  purpose: string
  platform: string | null
  irs_rate_per_mile: number | null
  deduction_amount: number | null
}

export function MileageList({ entries }: { entries: MileageEntry[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this trip?')) return
    setDeletingId(id)
    try {
      const { error } = await supabase.from('mileage_log').delete().eq('id', id)
      if (error) throw error
      toast.success('Trip deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = () => {
    const rows = entries.map(e => ({
      Date: e.trip_date, From: e.start_location, To: e.end_location,
      Miles: e.miles, Purpose: e.purpose, Platform: e.platform,
      Rate: e.irs_rate_per_mile, Deduction: e.deduction_amount,
    }))
    downloadTextFile(toCsv(rows), `mileage-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded CSV')
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Car className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No trips logged</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Track business, medical, and charity mileage for tax deductions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport} className="gap-2 border-(--color-surface-border) text-(--color-content-secondary)">
          <Download className="h-4 w-4" />Export IRS log
        </Button>
      </div>
      {entries.map(e => (
        <div key={e.id} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <Car className="h-5 w-5 text-(--color-content-secondary)" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-(--color-content)">
              {e.start_location && e.end_location
                ? `${e.start_location} → ${e.end_location}`
                : `${Number(e.miles).toFixed(1)} miles`}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-(--color-content-tertiary)">
              <span>{formatDate(e.trip_date)}</span>
              <Badge variant="outline" className="text-xs capitalize">{e.purpose}</Badge>
              {e.platform && e.platform !== 'personal' && <Badge variant="outline" className="text-xs">{e.platform}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-semibold tabular-nums text-(--color-content)">{Number(e.miles).toFixed(1)} mi</p>
            {e.deduction_amount && Number(e.deduction_amount) > 0 && (
              <p className="text-xs font-mono text-(--color-success)">${Number(e.deduction_amount).toFixed(2)}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:bg-(--color-danger-bg)"
            onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}>
            {deletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      ))}
    </div>
  )
}
