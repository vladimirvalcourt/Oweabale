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

const ITEM_TYPES = ['collections', 'late_payment', 'charge_off', 'inquiry', 'bankruptcy', 'judgment', 'other']
const BUREAUS = ['Equifax', 'Experian', 'TransUnion', 'All three']
const STATUSES = ['pending', 'disputed', 'resolved', 'removed']

export function AddCreditFixSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [itemType, setItemType] = React.useState('late_payment')
  const [description, setDescription] = React.useState('')
  const [bureau, setBureau] = React.useState('Equifax')
  const [amount, setAmount] = React.useState('')
  const [status, setStatus] = React.useState('pending')
  const [notes, setNotes] = React.useState('')

  const canSubmit = description.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('credit_fixes').insert({
        user_id: user.id,
        item_type: itemType,
        description,
        bureau,
        amount: amount ? Number(amount) : null,
        status,
        notes: notes || null,
      })
      if (error) throw error
      toast.success('Credit item added')
      setOpen(false)
      setItemType('late_payment'); setDescription(''); setBureau('Equifax')
      setAmount(''); setStatus('pending'); setNotes('')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add item</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Track credit repair item</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Item type *</Label>
            <Select value={itemType} onValueChange={setItemType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Capital One collection from 2021" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bureau *</Label>
              <Select value={bureau} onValueChange={setBureau}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUREAUS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Balance / amount</Label>
            <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dispute letter sent, reference number..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
