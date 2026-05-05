import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney, annualize } from '@/lib/formatters'
import { SubscriptionsList } from './SubscriptionsList'
import { AddSubscriptionSheet } from './AddSubscriptionSheet'

export default async function SubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id,name,amount,frequency,next_billing_date,status')
    .eq('user_id', user.id)
    .order('next_billing_date', { ascending: true })

  const annualTotal = (subs ?? [])
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + annualize(Number(s.amount), s.frequency), 0)

  const monthlyTotal = annualTotal / 12

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Subscriptions</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {subs?.length ?? 0} subscriptions · {formatMoney(monthlyTotal)}/mo · {formatMoney(annualTotal)}/yr
          </p>
        </div>
        <AddSubscriptionSheet />
      </div>

      <SubscriptionsList subscriptions={subs ?? []} />
    </div>
  )
}
