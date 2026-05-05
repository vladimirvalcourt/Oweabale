import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { AssetsList } from './AssetsList'
import { AddAssetSheet } from './AddAssetSheet'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: assets } = await supabase
    .from('assets')
    .select('id,name,value,type,purchase_price')
    .eq('user_id', user.id)
    .order('value', { ascending: false })

  const totalValue = (assets ?? []).reduce((sum, a) => sum + Number(a.value), 0)
  const totalCost = (assets ?? []).filter(a => a.purchase_price).reduce((sum, a) => sum + Number(a.purchase_price), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Assets</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {assets?.length ?? 0} assets · {formatMoney(totalValue)} total value
            {totalCost > 0 && <span> · {formatMoney(totalValue - totalCost)} total gain</span>}
          </p>
        </div>
        <AddAssetSheet />
      </div>

      <AssetsList assets={assets ?? []} />
    </div>
  )
}
