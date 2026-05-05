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

interface Bill {
  id: string
  biller: string
  amount: number
  category: string
  due_date: string
  frequency: string
  auto_pay: boolean
  status: string
}

export function EditBillSheet({ bill }: { bill: Bill }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [biller, setBiller] = React.useState(bill.biller)
  const [amount, setAmount] = React.useState(String(bill.amount))
  const [category, setCategory] = React.useState(bill.category)
  const [dueDate, setDueDate] = React.useState(bill.due_date)
  const [frequency, setFrequency] = React.useState(bill.frequency)
  const [autoPay, setAutoPay] = React.useState(bill.auto_pay)
  const [status, setStatus] = React.useState(bill.status)

  const canSubmit = biller.trim().length > 0 && amount.trim().length > 0 && dueDate.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return

    setSaving(true)
    try {
      const { error } = await supabase.from('bills').update({
        biller: biller.trim(),
        amount: Number(amount),
        category,
        due_date: dueDate,
        frequency,
        auto_pay: autoPay,
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', bill.id)

      if (error) throw error
      toast.success('Bill updated')
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update bill')
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
        <SheetHeader><SheetTitle>Edit bill</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="biller">Biller *</Label>
            <Input id="biller" value={biller} onChange={(e) => setBiller(e.target.value)} placeholder="e.g. Electric Company" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Due date *</Label>
            <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {frequencies.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <input id="auto_pay" type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} className="h-4 w-4 rounded border-(--color-surface-border) bg-(--color-surface) text-(--color-accent)" />
            <Label htmlFor="auto_pay" className="cursor-pointer">Auto-pay enabled</Label>
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
