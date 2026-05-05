import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { CitationsList } from './CitationsList'
import { AddCitationSheet } from './AddCitationSheet'

export default async function CitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: citations } = await supabase
    .from('citations')
    .select('id,type,jurisdiction,amount,penalty_fee,date,citation_number,payment_url,status')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  const unpaid = (citations ?? []).filter(c => c.status !== 'paid' && c.status !== 'dismissed')
  const totalOwed = unpaid.reduce((s, c) => s + Number(c.amount) + Number(c.penalty_fee ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Citations</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {citations?.length ?? 0} citations
            {totalOwed > 0 && <> · <span className="text-(--color-danger) font-medium">{formatMoney(totalOwed)} unpaid</span></>}
          </p>
        </div>
        <AddCitationSheet />
      </div>
      <CitationsList citations={citations ?? []} />
    </div>
  )
}
