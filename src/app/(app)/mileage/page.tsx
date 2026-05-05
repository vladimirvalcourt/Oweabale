import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MileageList } from './MileageList'
import { AddMileageSheet } from './AddMileageSheet'

export default async function MileagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const currentYear = new Date().getFullYear()
  const { data: entries } = await supabase
    .from('mileage_log')
    .select('id,trip_date,start_location,end_location,miles,purpose,platform,irs_rate_per_mile,deduction_amount')
    .eq('user_id', user.id)
    .order('trip_date', { ascending: false })

  const thisYear = (entries ?? []).filter(e => e.trip_date.startsWith(String(currentYear)))
  const totalMiles = thisYear.reduce((s, e) => s + Number(e.miles), 0)
  const totalDeduction = thisYear.reduce((s, e) => s + Number(e.deduction_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Mileage</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {entries?.length ?? 0} trips · {totalMiles.toFixed(1)} mi in {currentYear}
            {totalDeduction > 0 && <> · <span className="font-medium text-(--color-success)">${totalDeduction.toFixed(2)} deductible</span></>}
          </p>
        </div>
        <AddMileageSheet />
      </div>
      <MileageList entries={entries ?? []} />
    </div>
  )
}
