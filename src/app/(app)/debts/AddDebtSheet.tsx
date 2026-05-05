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

const debtTypes = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'medical', label: 'Medical Debt' },
  { value: 'other', label: 'Other' },
]

export function AddDebtSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [name, setName] = React.useState('')
  const [type, setType] = React.useState('credit_card')
  const [remaining, setRemaining] = React.useState('')
  const [minPayment, setMinPayment] = React.useState('')
  const [apr, setApr] = React.useState('')
  const [paymentDueDate, setPaymentDueDate] = React.useState('')
  const [originalAmount, setOriginalAmount] = React.useState('')
  const [termMonths, setTermMonths] = React.useState('')

  const canSubmit = name.trim().length > 0 && remaining.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      const { error } = await supabase.from('debts').insert({
        user_id: user.id,
        name: name.trim(),
        type,
        remaining: Number(remaining),
        min_payment: minPayment ? Number(minPayment) : 0,
        apr: apr ? Number(apr) : 0,
        payment_due_date: paymentDueDate || null,
        original_amount: originalAmount ? Number(originalAmount) : 0,
        term_months: termMonths ? Number(termMonths) : null,
        status: 'pending',
      })

      if (error) throw error
      toast.success('Debt added')
      setOpen(false)
      router.refresh()

      setName('')
      setType('credit_card')
      setRemaining('')
      setMinPayment('')
      setApr('')
      setPaymentDueDate('')
      setOriginalAmount('')
      setTermMonths('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add debt'
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
          Add debt
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add new debt</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chase Credit Card" required />
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {debtTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="remaining">Balance *</Label>
              <Input id="remaining" type="number" step="0.01" min="0" value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_payment">Min payment</Label>
              <Input id="min_payment" type="number" step="0.01" min="0" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="apr">APR (%)</Label>
              <Input id="apr" type="number" step="0.01" min="0" value={apr} onChange={(e) => setApr(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term_months">Term (months)</Label>
              <Input id="term_months" type="number" min="0" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} placeholder="e.g. 36" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_due_date">Payment due date</Label>
            <Input id="payment_due_date" type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="original_amount">Original amount</Label>
            <Input id="original_amount" type="number" step="0.01" min="0" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save debt
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
