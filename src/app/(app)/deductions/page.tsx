import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { DeductionsList } from './DeductionsList'
import { AddDeductionSheet } from './AddDeductionSheet'

export default async function DeductionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const currentYear = new Date().getFullYear()
  const { data: deductions } = await supabase
    .from('deductions')
    .select('id,name,category,amount,date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const thisYearTotal = (deductions ?? [])
    .filter(d => d.date.startsWith(String(currentYear)))
    .reduce((s, d) => s + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Deductions</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {deductions?.length ?? 0} entries · <span className="font-medium text-(--color-success)">{formatMoney(thisYearTotal)}</span> logged in {currentYear}
          </p>
        </div>
        <AddDeductionSheet />
      </div>
      <DeductionsList deductions={deductions ?? []} />
    </div>
  )
}
