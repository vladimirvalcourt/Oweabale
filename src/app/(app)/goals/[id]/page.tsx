import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Target, CalendarDays, PiggyBank } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { EditGoalSheet } from './EditGoalSheet'

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { id } = await params
  const { data: goal } = await supabase.from('goals').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!goal) notFound()

  const pct = Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
  const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))
  const isComplete = pct >= 100

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-(--color-content-secondary)">
          <Link href="/goals"><ArrowLeft className="h-4 w-4" />Back</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-(--color-content)">{goal.name}</h1>
            <Badge variant={isComplete ? 'success' : 'default'}>{isComplete ? 'Complete' : 'Active'}</Badge>
          </div>
          <p className="mt-1 text-sm text-(--color-content-secondary) capitalize">{goal.type.replace('_', ' ')} · {goal.priority} priority</p>
        </div>
        <EditGoalSheet goal={goal} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><Target className="h-3.5 w-3.5"/>Target</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(Number(goal.target_amount))}</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><PiggyBank className="h-3.5 w-3.5"/>Saved</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-accent)">{formatMoney(Number(goal.current_amount))}</p>
          <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{pct}% complete</p>
        </CardContent></Card>

        <Card className="border-(--color-surface-border)"><CardContent className="p-5">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-(--color-content-tertiary)"><CalendarDays className="h-3.5 w-3.5"/>Remaining</div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-(--color-content)">{formatMoney(remaining)}</p>
          {goal.deadline && <p className="mt-0.5 text-xs text-(--color-content-tertiary)">By {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
        </CardContent></Card>
      </div>

      <Card className="border-(--color-surface-border)"><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-(--color-content)">Progress</span>
          <span className="text-sm font-mono text-(--color-content-secondary)">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-(--color-surface-elevated)">
          <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-(--color-success)' : 'bg-(--color-accent)'}`} style={{ width: `${pct}%` }} />
        </div>
      </CardContent></Card>
    </div>
  )
}
