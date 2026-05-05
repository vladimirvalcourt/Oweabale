import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { DebtsList } from './DebtsList'
import { AddDebtSheet } from './AddDebtSheet'

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: debts } = await supabase
    .from('debts')
    .select('id,name,type,apr,remaining,min_payment,paid,payment_due_date,original_amount,status')
    .eq('user_id', user.id)
    .order('payment_due_date', { ascending: true })

  const totalRemaining = (debts ?? []).filter(d => d.status !== 'paid').reduce((sum, d) => sum + Number(d.remaining), 0)
  const totalMinPayment = (debts ?? []).filter(d => d.status !== 'paid').reduce((sum, d) => sum + Number(d.min_payment), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Debts</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {debts?.length ?? 0} debts · {formatMoney(totalRemaining)} remaining · {formatMoney(totalMinPayment)}/mo minimum
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="gap-2 border-(--color-surface-border) text-(--color-content-secondary) hover:text-(--color-content)">
            <Link href="/debts/planner">
              <TrendingDown className="h-4 w-4" />
              Payoff Planner
            </Link>
          </Button>
          <AddDebtSheet />
        </div>
      </div>

      <DebtsList debts={debts ?? []} />
    </div>
  )
}
