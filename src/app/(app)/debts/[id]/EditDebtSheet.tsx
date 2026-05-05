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

const debtTypes = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto_loan', label: 'Auto Loan' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'medical', label: 'Medical Debt' },
  { value: 'other', label: 'Other' },
]

interface Debt {
  id: string
  name: string
  type: string
  apr: number
  remaining: number
  min_payment: number
  payment_due_date: string | null
  original_amount: number
  term_months: number | null
  status: string
}

export function EditDebtSheet({ debt }: { debt: Debt }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [name, setName] = React.useState(debt.name)
  const [type, setType] = React.useState(debt.type)
  const [remaining, setRemaining] = React.useState(String(debt.remaining))
  const [minPayment, setMinPayment] = React.useState(String(debt.min_payment ?? 0))
  const [apr, setApr] = React.useState(String(debt.apr ?? 0))
  const [paymentDueDate, setPaymentDueDate] = React.useState(debt.payment_due_date || '')
  const [originalAmount, setOriginalAmount] = React.useState(String(debt.original_amount ?? 0))
  const [termMonths, setTermMonths] = React.useState(debt.term_months ? String(debt.term_months) : '')
  const [status, setStatus] = React.useState(debt.status)

  const canSubmit = name.trim().length > 0 && remaining.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('debts').update({
        name: name.trim(),
        type,
        remaining: Number(remaining),
        min_payment: minPayment ? Number(minPayment) : 0,
        apr: apr ? Number(apr) : 0,
        payment_due_date: paymentDueDate || null,
        original_amount: originalAmount ? Number(originalAmount) : 0,
        term_months: termMonths ? Number(termMonths) : null,
        status,
        updated_at: new Date().toISOString(),
      }).eq('id', debt.id)

      if (error) throw error
      toast.success('Debt updated')
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update debt')
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
        <SheetHeader><SheetTitle>Edit debt</SheetTitle></SheetHeader>
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
                {debtTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
