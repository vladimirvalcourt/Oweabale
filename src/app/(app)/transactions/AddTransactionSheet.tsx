'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const transactionTypes = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]

const categories = [
  'food', 'transport', 'shopping', 'entertainment', 'utilities',
  'healthcare', 'education', 'rent', 'travel', 'other',
]

export function AddTransactionSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [name, setName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('food')
  const [type, setType] = React.useState('expense')
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])

  const canSubmit = name.trim().length > 0 && amount.trim().length > 0 && date.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id, name: name.trim(), amount: Number(amount),
        category, type, date,
      })
      if (error) throw error
      toast.success('Transaction added')
      setOpen(false)
      router.refresh()
      setName('')
      setAmount('')
      setCategory('food')
      setType('expense')
      setDate(new Date().toISOString().split('T')[0])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add transaction</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader><SheetTitle>Add transaction</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Description *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grocery store" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{transactionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save transaction
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
