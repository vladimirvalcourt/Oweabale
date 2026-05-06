'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  userId: string
  isAdmin: boolean
  trialEndsAt: string | null
}

export function AdminUserActions({ userId, isAdmin, trialEndsAt }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = React.useState<string | null>(null)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [note, setNote] = React.useState('')

  const handleToggleAdmin = async () => {
    if (!confirm(`${isAdmin ? 'Revoke admin' : 'Grant admin'} for this user?`)) return
    setBusy('admin')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId)
      if (error) throw error
      toast.success(`Admin ${isAdmin ? 'revoked' : 'granted'}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  const handleExtendTrial = async () => {
    const daysStr = prompt('Extend trial by how many days?', '7')
    if (!daysStr) return
    const days = parseInt(daysStr, 10)
    if (isNaN(days) || days <= 0) {
      toast.error('Invalid number of days')
      return
    }
    setBusy('trial')
    try {
      const base = trialEndsAt ? new Date(trialEndsAt) : new Date()
      const newEnd = new Date(base.getTime() + days * 86400000)
      const { error } = await supabase
        .from('profiles')
        .update({ trial_ends_at: newEnd.toISOString(), trial_expired: false })
        .eq('id', userId)
      if (error) throw error
      const { data: { user: admin } } = await supabase.auth.getUser()
      if (admin) {
        await supabase.from('admin_trial_extension_events').insert({
          target_user_id: userId,
          admin_user_id: admin.id,
          previous_trial_ends_at: trialEndsAt,
          new_trial_ends_at: newEnd.toISOString(),
          additional_days: days,
        })
      }
      toast.success(`Trial extended by ${days} days`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  const handleAddNote = async () => {
    if (!note.trim()) return
    setBusy('note')
    try {
      const { data: { user: admin } } = await supabase.auth.getUser()
      if (!admin) throw new Error('Not authenticated')
      const { error } = await supabase.from('admin_user_notes').insert({
        target_user_id: userId,
        admin_user_id: admin.id,
        note_type: 'general',
        body: note.trim(),
      })
      if (error) throw error
      toast.success('Note added')
      setNote('')
      setNoteOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleExtendTrial} disabled={busy !== null}>
          {busy === 'trial' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Extend trial'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNoteOpen((v) => !v)}>
          Add note
        </Button>
        <Button
          size="sm"
          variant={isAdmin ? 'destructive' : 'outline'}
          onClick={handleToggleAdmin}
          disabled={busy !== null}
        >
          {busy === 'admin' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isAdmin ? (
            'Revoke admin'
          ) : (
            'Grant admin'
          )}
        </Button>
      </div>

      {noteOpen && (
        <div className="w-80 rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add an internal note about this user…"
            rows={3}
            className="w-full resize-none rounded border border-(--color-surface-border) bg-(--color-surface) p-2 text-sm text-(--color-content) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNote} disabled={!note.trim() || busy === 'note'}>
              {busy === 'note' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save note'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
