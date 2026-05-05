'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Asset {
  id: string
  name: string
  value: number
  type: string
  purchase_price: number | null
}

interface AssetsListProps {
  assets: Asset[]
}

export function AssetsList({ assets }: AssetsListProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    try {
      const { error } = await supabase.from('assets').delete().eq('id', id)
      if (error) throw error
      toast.success('Asset deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Landmark className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No assets yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Track your cash, investments, real estate, and more.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => {
        const gain = asset.purchase_price ? Number(asset.value) - Number(asset.purchase_price) : null
        const gainPct = asset.purchase_price && Number(asset.purchase_price) > 0 ? Math.round((gain! / Number(asset.purchase_price)) * 100) : null

        return (
          <div key={asset.id} className="flex items-center gap-4 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-4 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <Landmark className="h-5 w-5 text-(--color-success)" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/assets/${asset.id}`} className="truncate text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors">
                  {asset.name}
                </Link>
                <Badge variant="outline" className="text-xs capitalize">{asset.type.replace('_', ' ')}</Badge>
              </div>
              {gain !== null && (
                <p className={cn('mt-0.5 text-xs', gain >= 0 ? 'text-(--color-success)' : 'text-(--color-danger)')}>
                  {gain >= 0 ? '+' : ''}{formatMoney(gain)} ({gainPct}%)
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(asset.value))}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDelete(asset.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
