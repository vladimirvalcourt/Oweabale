import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Wallet, CalendarDays, BadgeCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'

export default async function IncomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: inc } = await supabase.from('incomes').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!inc) notFound()

  const annualAmount = inc.frequency === 'monthly' ? Number(inc.amount) * 12 :
    inc.frequency === 'weekly' ? Number(inc.amount) * 52 :
    inc.frequency === 'biweekly' ? Number(inc.amount) * 26 :
    inc.frequency === 'quarterly' ? Number(inc.amount) * 4 :
    inc.frequency === 'yearly' ? Number(inc.amount) : Number(inc.amount) * 12

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/income"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{inc.name}</h1>
            <Badge variant="outline" className="capitalize">{inc.source_type.replace('_', ' ')}</Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">{inc.frequency}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Wallet className="h-3.5 w-3.5"/>Amount</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-success)">{formatMoney(Number(inc.amount))}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">/{inc.frequency.replace('_', '')}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><BadgeCheck className="h-3.5 w-3.5"/>Annual</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(annualAmount)}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">per year</p>
        </CardContent></Card>

        {inc.next_date && (
          <Card className="border-(--color-surface-border)"><CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CalendarDays className="h-3.5 w-3.5"/>Next</div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{new Date(inc.next_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  )
}
