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

const PURPOSES = ['business', 'medical', 'charity', 'personal']
const PLATFORMS = ['personal', 'DoorDash', 'Uber Eats', 'Uber', 'Lyft', 'Amazon Flex', 'Instacart', 'other']
const IRS_RATE_2026 = 0.70

export function AddMileageSheet() {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [tripDate, setTripDate] = React.useState(new Date().toISOString().split('T')[0])
  const [startLocation, setStartLocation] = React.useState('')
  const [endLocation, setEndLocation] = React.useState('')
  const [miles, setMiles] = React.useState('')
  const [purpose, setPurpose] = React.useState('business')
  const [platform, setPlatform] = React.useState('personal')
  const [irsRate, setIrsRate] = React.useState(String(IRS_RATE_2026))

  const milesNum = Number(miles)
  const rateNum = Number(irsRate)
  const deduction = milesNum > 0 && rateNum > 0 ? milesNum * rateNum : 0

  const canSubmit = milesNum > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      const { error } = await supabase.from('mileage_log').insert({
        user_id: user.id,
        trip_date: tripDate,
        start_location: startLocation || null,
        end_location: endLocation || null,
        miles: milesNum,
        purpose,
        platform,
        irs_rate_per_mile: rateNum,
        deduction_amount: deduction,
      })
      if (error) throw error
      toast.success('Trip logged')
      setOpen(false)
      setMiles(''); setStartLocation(''); setEndLocation('')
      setTripDate(new Date().toISOString().split('T')[0])
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to log trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" />Log trip</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>Log mileage trip</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip_date">Date *</Label>
            <Input id="trip_date" type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="miles">Miles driven *</Label>
            <Input id="miles" type="number" step="0.1" min="0.1" value={miles} onChange={e => setMiles(e.target.value)} placeholder="0.0" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purpose *</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p} value={p}>{p.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">From</Label>
            <Input id="start" value={startLocation} onChange={e => setStartLocation(e.target.value)} placeholder="Start location" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">To</Label>
            <Input id="end" value={endLocation} onChange={e => setEndLocation(e.target.value)} placeholder="End location" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">IRS rate per mile</Label>
            <Input id="rate" type="number" step="0.001" min="0" value={irsRate} onChange={e => setIrsRate(e.target.value)} />
          </div>
          {deduction > 0 && (
            <div className="rounded-md border border-(--color-success-border) bg-(--color-success-bg) px-4 py-3">
              <p className="text-sm text-(--color-success) font-medium">
                Estimated deduction: ${deduction.toFixed(2)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save trip
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
