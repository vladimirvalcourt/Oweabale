import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, annualize } from '@/lib/formatters'
import { IncomeList } from './IncomeList'
import { AddIncomeSheet } from './AddIncomeSheet'

export default async function IncomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: incomes } = await supabase
    .from('incomes')
    .select('id,name,amount,frequency,source_type,next_date')
    .eq('user_id', user.id)
    .order('next_date', { ascending: true })

  const annualTotal = (incomes ?? []).reduce((sum, inc) => sum + annualize(Number(inc.amount), inc.frequency), 0)
  const monthlyTotal = annualTotal / 12

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Income</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {incomes?.length ?? 0} sources · {formatMoney(monthlyTotal)}/mo · {formatMoney(annualTotal)}/yr
          </p>
        </div>
        <AddIncomeSheet />
      </div>

      <IncomeList incomes={incomes ?? []} />
    </div>
  )
}
