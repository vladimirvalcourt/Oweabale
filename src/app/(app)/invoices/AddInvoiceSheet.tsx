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

export function AddInvoiceSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [clientName, setClientName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [issuedDate, setIssuedDate] = React.useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = React.useState('')
  const [status, setStatus] = React.useState('sent')
  const [notes, setNotes] = React.useState('')

  const canSubmit = clientName.trim().length > 0 && Number(amount) > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('client_invoices').insert({
        user_id: user.id,
        client_name: clientName,
        amount: Number(amount),
        issued_date: issuedDate,
        due_date: dueDate || null,
        status,
        notes: notes || null,
      })
      if (error) throw error
      toast.success('Invoice created')
      setOpen(false)
      setClientName(''); setAmount(''); setDueDate(''); setNotes(''); setStatus('sent')
      setIssuedDate(new Date().toISOString().split('T')[0])
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />New invoice</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>New client invoice</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client name *</Label>
            <Input id="client_name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Corp" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issued_date">Issued *</Label>
              <Input id="issued_date" type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['draft', 'sent', 'paid', 'overdue'].map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Project description, terms..." />
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
