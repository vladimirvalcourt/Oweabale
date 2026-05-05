'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Pencil, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const types = [
  { value: 'savings', label: 'Savings' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'vacation', label: 'Vacation' },
  { value: 'other', label: 'Other' },
]

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  priority: string
  type: string
  status: string
}

export function EditGoalSheet({ goal }: { goal: Goal }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [name, setName] = React.useState(goal.name)
  const [targetAmount, setTargetAmount] = React.useState(String(goal.target_amount))
  const [currentAmount, setCurrentAmount] = React.useState(String(goal.current_amount))
  const [deadline, setDeadline] = React.useState(goal.deadline || '')
  const [priority, setPriority] = React.useState(goal.priority)
  const [type, setType] = React.useState(goal.type)
  const [status, setStatus] = React.useState(goal.status)

  const canSubmit = name.trim().length > 0 && targetAmount.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('goals').update({
        name: name.trim(),
        target_amount: Number(targetAmount),
        current_amount: currentAmount ? Number(currentAmount) : 0,
        deadline: deadline || null,
        priority,
        type,
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', goal.id)

      if (error) throw error
      toast.success('Goal updated')
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update goal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Pencil className="h-3.5 w-3.5" />Edit</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Edit goal</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Goal name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target">Target amount *</Label>
              <Input id="target" type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current">Current saved</Label>
              <Input id="current" type="number" step="0.01" min="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Goal type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorities.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Target date</Label>
            <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
