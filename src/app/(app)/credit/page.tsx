import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, annualize } from '@/lib/formatters'
import { Card, CardContent } from '@/components/ui/card'
import { CreditFixList } from './CreditFixList'
import { AddCreditFixSheet } from './AddCreditFixSheet'
import { cn } from '@/lib/utils'

function UtilizationBar({ pct, label }: { pct: number; label: string }) {
  const clamped = Math.min(100, pct)
  const color = pct > 30 ? (pct > 50 ? 'bg-(--color-danger)' : 'bg-(--color-warning)') : 'bg-(--color-success)'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-(--color-content-secondary)">{label}</span>
        <span className={cn('font-medium', pct > 30 ? (pct > 50 ? 'text-(--color-danger)' : 'text-(--color-warning)') : 'text-(--color-success)')}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-(--color-surface-elevated)">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
      <p className="text-xs text-(--color-content-tertiary)">
        {pct <= 10 ? 'Excellent — keep it under 10%' : pct <= 30 ? 'Good — under 30%' : pct <= 50 ? 'Fair — aim to reduce below 30%' : 'High — prioritize paying down balances'}
      </p>
    </div>
  )
}

export default async function CreditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: debts }, { data: incomes }, { data: fixes }] = await Promise.all([
    supabase.from('debts').select('type,remaining,original_amount,min_payment,frequency,status,apr').eq('user_id', user.id),
    supabase.from('incomes').select('amount,frequency').eq('user_id', user.id),
    supabase.from('credit_fixes').select('id,item_type,description,bureau,amount,status,notes').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  const activeDebts = (debts ?? []).filter(d => d.status !== 'paid' && d.status !== 'cancelled')
  const ccDebts = activeDebts.filter(d => d.type === 'credit_card')
  const ccBalance = ccDebts.reduce((s, d) => s + Number(d.remaining), 0)
  const ccLimit = ccDebts.reduce((s, d) => s + Number(d.original_amount), 0)
  const utilizationPct = ccLimit > 0 ? (ccBalance / ccLimit) * 100 : 0

  const totalDebt = activeDebts.reduce((s, d) => s + Number(d.remaining), 0)
  const monthlyIncome = (incomes ?? []).reduce((s, i) => s + annualize(Number(i.amount), i.frequency), 0) / 12
  const monthlyDebtPayments = activeDebts.reduce((s, d) => s + annualize(Number(d.min_payment), d.frequency ?? 'monthly'), 0) / 12
  const dtiPct = monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : 0

  const fixItems = fixes ?? []
  const removed = fixItems.filter(f => f.status === 'removed' || f.status === 'resolved').length
  const pending = fixItems.filter(f => f.status === 'pending' || f.status === 'disputed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Credit</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            Computed from your debts · {fixItems.length} repair items tracked
          </p>
        </div>
        <AddCreditFixSheet />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-(--color-surface-border)">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Credit utilization</p>
            {ccLimit > 0 ? (
              <>
                <UtilizationBar pct={utilizationPct} label={`${formatMoney(ccBalance)} of ${formatMoney(ccLimit)}`} />
              </>
            ) : (
              <p className="text-sm text-(--color-content-secondary)">No credit card debts tracked</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-(--color-surface-border)">
          <CardContent className="p-5 space-y-4">
            <p className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Debt-to-income ratio</p>
            {monthlyIncome > 0 ? (
              <>
                <UtilizationBar pct={dtiPct} label={`${formatMoney(monthlyDebtPayments)}/mo payments on ${formatMoney(monthlyIncome)}/mo income`} />
              </>
            ) : (
              <p className="text-sm text-(--color-content-secondary)">Add income sources to compute DTI</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-(--color-surface-border)">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)">Credit repair</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-(--color-content-secondary)">Items removed / resolved</span>
                <span className="text-sm font-semibold text-(--color-success)">{removed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-(--color-content-secondary)">In progress</span>
                <span className="text-sm font-semibold text-(--color-warning)">{pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-(--color-content-secondary)">Total debt balance</span>
                <span className="text-sm font-semibold text-(--color-content)">{formatMoney(totalDebt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-(--color-content)">Credit repair tracker</h2>
        <CreditFixList items={fixItems} />
      </div>
    </div>
  )
}
