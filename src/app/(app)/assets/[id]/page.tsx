import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Landmark, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: asset } = await supabase.from('assets').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!asset) notFound()

  const gain = asset.purchase_price ? Number(asset.value) - Number(asset.purchase_price) : null
  const gainPct = asset.purchase_price && Number(asset.purchase_price) > 0 ? Math.round((gain! / Number(asset.purchase_price)) * 100) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/assets"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{asset.name}</h1>
            <Badge variant="outline" className="capitalize">{asset.type.replace('_', ' ')}</Badge>
          </div>
          {asset.purchase_date && (
            <p className="mt-1 text-sm text-(--color-content-secondary)">
              Purchased {new Date(asset.purchase_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Landmark className="h-3.5 w-3.5"/>Value</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(asset.value))}</p>
        </CardContent></Card>

        {asset.purchase_price !== null && (
          <Card className="border-(--color-surface-border)"><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><DollarSign className="h-3.5 w-3.5"/>Purchase price</div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(asset.purchase_price))}</p>
          </CardContent></Card>
        )}

        {gain !== null && (
          <Card className="border-(--color-surface-border)"><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><TrendingUp className="h-3.5 w-3.5"/>Gain/Loss</div>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', gain >= 0 ? 'text-(--color-success)' : 'text-(--color-danger)')}>
              {gain >= 0 ? '+' : ''}{formatMoney(gain)}
            </p>
            {gainPct !== null && <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{gain >= 0 ? '+' : ''}{gainPct}%</p>}
          </CardContent></Card>
        )}
      </div>

      {asset.notes && (
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Notes</p>
          <p className="mt-2 text-sm text-(--color-content-secondary)">{asset.notes}</p>
        </CardContent></Card>
      )}
    </div>
  )
}
