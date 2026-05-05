'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const categories = [
  'utilities', 'rent', 'insurance', 'phone', 'internet',
  'credit_card', 'loan', 'subscription', 'tax', 'other',
]

const frequencies = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
]

export function AddBillSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [biller, setBiller] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('utilities')
  const [dueDate, setDueDate] = React.useState('')
  const [frequency, setFrequency] = React.useState('monthly')
  const [autoPay, setAutoPay] = React.useState(false)

  const canSubmit = biller.trim().length > 0 && amount.trim().length > 0 && dueDate.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Not authenticated')
        return
      }

      const { error } = await supabase.from('bills').insert({
        user_id: user.id,
        biller: biller.trim(),
        amount: Number(amount),
        category,
        due_date: dueDate,
        frequency,
        auto_pay: autoPay,
        status: 'pending',
      })

      if (error) throw error

      toast.success('Bill added')
      setOpen(false)
      router.refresh()

      // Reset form
      setBiller('')
      setAmount('')
      setCategory('utilities')
      setDueDate('')
      setFrequency('monthly')
      setAutoPay(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add bill'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add bill
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add new bill</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="biller">Biller *</Label>
            <Input
              id="biller"
              value={biller}
              onChange={(e) => setBiller(e.target.value)}
              placeholder="e.g. Electric Company"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due date *</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="auto_pay"
              type="checkbox"
              checked={autoPay}
              onChange={(e) => setAutoPay(e.target.checked)}
              className="h-4 w-4 rounded border-(--color-surface-border) bg-(--color-surface) text-(--color-accent)"
            />
            <Label htmlFor="auto_pay" className="cursor-pointer">Auto-pay enabled</Label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save bill
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
