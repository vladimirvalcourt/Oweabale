import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMoney } from '@/lib/formatters'
import { InvoicesList } from './InvoicesList'
import { AddInvoiceSheet } from './AddInvoiceSheet'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: invoices } = await supabase
    .from('client_invoices')
    .select('id,client_name,amount,issued_date,due_date,status,notes')
    .eq('user_id', user.id)
    .order('issued_date', { ascending: false })

  const outstanding = (invoices ?? []).filter(i => i.status !== 'paid')
  const totalOutstanding = outstanding.reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = (invoices ?? []).filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">Invoices</h1>
          <p className="mt-1 text-sm text-(--color-content-secondary)">
            {invoices?.length ?? 0} invoices
            {totalOutstanding > 0 && <> · <span className="font-medium text-(--color-warning)">{formatMoney(totalOutstanding)} outstanding</span></>}
            {totalPaid > 0 && <> · <span className="font-medium text-(--color-success)">{formatMoney(totalPaid)} collected</span></>}
          </p>
        </div>
        <AddInvoiceSheet />
      </div>
      <InvoicesList invoices={invoices ?? []} />
    </div>
  )
}
