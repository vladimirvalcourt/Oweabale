import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { TransactionsList } from './TransactionsList'
import { AddTransactionSheet } from './AddTransactionSheet'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id,name,amount,category,date,type')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const totalIncome = (transactions ?? []).filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = (transactions ?? []).filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Transactions</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {transactions?.length ?? 0} transactions · {formatMoney(totalIncome)} in · {formatMoney(totalExpense)} out
          </p>
        </div>
        <AddTransactionSheet />
      </div>

      <TransactionsList transactions={transactions ?? []} initialQuery={q ?? ''} />
    </div>
  )
}
