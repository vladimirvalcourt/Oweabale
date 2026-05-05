import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DebtPlanner } from './DebtPlanner'

export const metadata = {
  title: 'Debt Payoff Planner — Oweable',
}

export default async function DebtPlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: debts } = await supabase
    .from('debts')
    .select('id,name,remaining,apr,min_payment,type,status')
    .eq('user_id', user.id)
    .neq('status', 'paid')
    .order('apr', { ascending: false })

  return (
    <div className="space-y-6">
      <DebtPlanner debts={debts ?? []} />
    </div>
  )
}
