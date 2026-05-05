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

const TYPES = ['parking', 'traffic', 'speeding', 'red_light', 'equipment', 'other']
const STATUSES = ['unpaid', 'contested', 'dismissed', 'paid']

export function AddCitationSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [type, setType] = React.useState('parking')
  const [jurisdiction, setJurisdiction] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [penaltyFee, setPenaltyFee] = React.useState('')
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0])
  const [citationNumber, setCitationNumber] = React.useState('')
  const [paymentUrl, setPaymentUrl] = React.useState('')
  const [status, setStatus] = React.useState('unpaid')

  const canSubmit = amount.trim().length > 0 && Number(amount) > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('citations').insert({
        user_id: user.id,
        type,
        jurisdiction: jurisdiction || null,
        amount: Number(amount),
        penalty_fee: penaltyFee ? Number(penaltyFee) : null,
        date,
        citation_number: citationNumber || null,
        payment_url: paymentUrl || null,
        status,
      })
      if (error) throw error
      toast.success('Citation added')
      setOpen(false)
      setType('parking'); setJurisdiction(''); setAmount(''); setPenaltyFee('')
      setDate(new Date().toISOString().split('T')[0]); setCitationNumber(''); setPaymentUrl(''); setStatus('unpaid')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add citation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Add citation</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Add citation / fine</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
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
            <Label htmlFor="amount">Fine amount *</Label>
            <Input id="amount" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="penalty">Late penalty fee</Label>
            <Input id="penalty" type="number" step="0.01" min="0" value={penaltyFee} onChange={e => setPenaltyFee(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date issued *</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <Input id="jurisdiction" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} placeholder="City, State" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="citation_number">Citation number</Label>
            <Input id="citation_number" value={citationNumber} onChange={e => setCitationNumber(e.target.value)} placeholder="ABC-123456" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_url">Payment URL</Label>
            <Input id="payment_url" type="url" value={paymentUrl} onChange={e => setPaymentUrl(e.target.value)} placeholder="https://..." />
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
