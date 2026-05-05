import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { BudgetsList } from './BudgetsList'
import { AddBudgetSheet } from './AddBudgetSheet'

function getPeriodStart(period: string): string {
  const now = new Date()
  switch (period) {
    case 'Weekly': {
      const d = new Date(now)
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return d.toISOString().split('T')[0]
    }
    case 'Bi-weekly': {
      const d = new Date(now)
      d.setDate(d.getDate() - 13)
      return d.toISOString().split('T')[0]
    }
    case 'Monthly':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    case 'Quarterly': {
      const q = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]
    }
    case 'Yearly':
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
}

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: budgets }, { data: transactions }] = await Promise.all([
    supabase
      .from('budgets')
      .select('id,category,amount,period')
      .eq('user_id', user.id)
      .order('category', { ascending: true }),
    supabase
      .from('transactions')
      .select('category,amount,date,type')
      .eq('user_id', user.id)
      .eq('type', 'expense'),
  ])

  const budgetsWithSpent = (budgets ?? []).map(budget => {
    const periodStart = getPeriodStart(budget.period)
    const spent = (transactions ?? [])
      .filter(t => t.category === budget.category && t.date >= periodStart)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { ...budget, spent }
  })

  const totalLimit = budgetsWithSpent.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0)
  const overCount = budgetsWithSpent.filter(b => b.spent > Number(b.amount)).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Budgets</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {budgetsWithSpent.length} budgets
            {totalLimit > 0 && <> &middot; {formatMoney(totalSpent)} spent of {formatMoney(totalLimit)}</>}
            {overCount > 0 && <> &middot; <span className="text-(--color-danger) font-medium">{overCount} over budget</span></>}
          </p>
        </div>
        <AddBudgetSheet />
      </div>

      <BudgetsList budgets={budgetsWithSpent} />
    </div>
  )
}
