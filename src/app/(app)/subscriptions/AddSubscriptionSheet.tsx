'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const frequencies = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export function AddSubscriptionSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [frequency, setFrequency] = React.useState('monthly')
  const [nextBillingDate, setNextBillingDate] = React.useState('')

  const canSubmit = name.trim().length > 0 && amount.trim().length > 0 && nextBillingDate.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        name: name.trim(),
        amount: Number(amount),
        frequency,
        next_billing_date: nextBillingDate,
        status: 'active',
      })

      if (error) throw error
      toast.success('Subscription added')
      setOpen(false)
      router.refresh()

      setName('')
      setAmount('')
      setFrequency('monthly')
      setNextBillingDate('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add subscription')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add subscription</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Add new subscription</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_billing_date">Next billing date *</Label>
            <Input id="next_billing_date" type="date" value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save subscription
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
