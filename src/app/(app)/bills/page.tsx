import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Receipt } from 'lucide-react'
import { formatMoney, annualize } from '@/lib/formatters'
import { BillsList } from './BillsList'
import { AddBillSheet } from './AddBillSheet'

export default async function BillsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: bills } = await supabase
    .from('bills')
    .select('id,biller,amount,category,due_date,frequency,status,auto_pay')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  const totalMonthly = (bills ?? [])
    .filter(b => b.status !== 'paid' && b.status !== 'cancelled')
    .reduce((sum, b) => sum + annualize(Number(b.amount), b.frequency), 0) / 12

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Bills</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {bills?.length ?? 0} bills · {formatMoney(totalMonthly)}/mo recurring
          </p>
        </div>
        <AddBillSheet />
      </div>

      <BillsList bills={bills ?? []} />
    </div>
  )
}

