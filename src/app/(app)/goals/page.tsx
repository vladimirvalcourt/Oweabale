import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsList } from './GoalsList'
import { AddGoalSheet } from './AddGoalSheet'

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: goals } = await supabase
    .from('goals')
    .select('id,name,target_amount,current_amount,deadline,priority,status,type')
    .eq('user_id', user.id)
    .order('deadline', { ascending: true })

  const totalSaved = (goals ?? []).reduce((sum, g) => sum + Number(g.current_amount), 0)
  const totalTarget = (goals ?? []).reduce((sum, g) => sum + Number(g.target_amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Goals</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {goals?.length ?? 0} goals · {formatMoney(totalSaved)} saved of {formatMoney(totalTarget)} total
          </p>
        </div>
        <AddGoalSheet />
      </div>

      <GoalsList goals={goals ?? []} />
    </div>
  )
}
