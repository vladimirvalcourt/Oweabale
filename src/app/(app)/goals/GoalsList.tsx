'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Target, Plus, Minus, Search, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/formatters'
import { toCsv, downloadTextFile } from '@/lib/export'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  priority: string
  status: string
  type: string
}

interface GoalsListProps {
  goals: Goal[]
}

export function GoalsList({ goals }: GoalsListProps) {
  const router = useRouter()
  const supabase = createClient()
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState('deadline_asc')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    let result = q
      ? goals.filter(g =>
          g.name.toLowerCase().includes(q) ||
          g.type.toLowerCase().includes(q)
        )
      : goals

    const [field, dir] = sort.split('_') as [string, 'asc' | 'desc']
    const mult = dir === 'asc' ? 1 : -1

    result = [...result].sort((a, b) => {
      if (field === 'deadline') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity
        return mult * (da - db)
      }
      if (field === 'target') {
        return mult * (Number(a.target_amount) - Number(b.target_amount))
      }
      if (field === 'name') {
        return mult * a.name.localeCompare(b.name)
      }
      return 0
    })

    return result
  }, [goals, query, sort])

  const handleUpdateAmount = async (id: string, delta: number) => {
    setProcessingId(id)
    try {
      const goal = goals.find(g => g.id === id)
      if (!goal) return
      const newAmount = Math.max(0, Number(goal.current_amount) + delta)
      const { error } = await supabase.from('goals').update({ current_amount: newAmount, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setProcessingId(null)
    }
  }

  const handleExport = () => {
    const rows = filtered.map(g => ({
      Name: g.name,
      Type: g.type,
      Target: g.target_amount,
      Current: g.current_amount,
      Deadline: g.deadline,
    }))
    const csv = toCsv(rows)
    downloadTextFile(csv, `goals-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Downloaded goals CSV')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    setProcessingId(id)
    try {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
      toast.success('Goal deleted')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setProcessingId(null)
    }
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-16 text-center">
        <Target className="mx-auto h-10 w-10 text-(--color-content-tertiary)" />
        <p className="mt-4 text-sm font-medium text-(--color-content-secondary)">No goals yet</p>
        <p className="mt-1 text-xs text-(--color-content-tertiary)">Set a savings target to stay motivated.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-content-tertiary)" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search goals..."
            className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) py-2 pl-9 pr-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-xs text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
        >
          <option value="deadline_asc">Deadline soonest</option>
          <option value="deadline_desc">Deadline latest</option>
          <option value="target_asc">Target low–high</option>
          <option value="target_desc">Target high–low</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
        <Button
          variant="outline"
          onClick={handleExport}
          className="shrink-0 border-(--color-surface-border) px-2.5 text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
          title="Export to CSV"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      {query.trim() && (
        <p className="text-xs text-(--color-content-tertiary)">
          {filtered.length} of {goals.length} results
        </p>
      )}
      {filtered.length === 0 && query.trim() && (
        <div className="rounded-panel border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-6 py-12 text-center">
          <p className="text-sm text-(--color-content-secondary)">No goals match &quot;{query}&quot;</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((goal) => {
        const pct = Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
        const isComplete = pct >= 100
        const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))

        return (
          <div key={goal.id} className={cn(
            'rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-5 transition-colors',
            isComplete && 'border-(--color-success-border)'
          )}>
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/goals/${goal.id}`} className="text-sm font-medium text-(--color-content) hover:text-(--color-accent) transition-colors">
                  {goal.name}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{goal.type.replace('_', ' ')}</Badge>
                  <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'warning' : 'default'} className="text-xs capitalize">
                    {goal.priority}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-(--color-danger) hover:text-(--color-danger) hover:bg-(--color-danger-bg)" onClick={() => handleDelete(goal.id)} disabled={processingId === goal.id}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-(--color-content-tertiary)">
                <span>{formatMoney(Number(goal.current_amount))}</span>
                <span>{formatMoney(Number(goal.target_amount))}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-(--color-surface-elevated)">
                <div className={cn(
                  "h-full rounded-full transition-all",
                  isComplete ? "bg-(--color-success)" : "bg-(--color-accent)"
                )} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-(--color-content)">{pct}%</span>
                {remaining > 0 && <span className="text-(--color-content-tertiary)">{formatMoney(remaining)} to go</span>}
              </div>
            </div>

            {goal.deadline && (
              <p className="mt-3 text-xs text-(--color-content-tertiary)">
                Target: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleUpdateAmount(goal.id, -10)} disabled={processingId === goal.id}>
                <Minus className="h-3 w-3" /> $10
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-(--color-accent) hover:text-(--color-accent) hover:bg-(--color-accent-muted)" onClick={() => handleUpdateAmount(goal.id, 10)} disabled={processingId === goal.id}>
                <Plus className="h-3 w-3" /> $10
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-(--color-accent) hover:text-(--color-accent) hover:bg-(--color-accent-muted)" onClick={() => handleUpdateAmount(goal.id, 50)} disabled={processingId === goal.id}>
                <Plus className="h-3 w-3" /> $50
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-(--color-accent) hover:text-(--color-accent) hover:bg-(--color-accent-muted)" onClick={() => handleUpdateAmount(goal.id, 100)} disabled={processingId === goal.id}>
                <Plus className="h-3 w-3" /> $100
              </Button>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
