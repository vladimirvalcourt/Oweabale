'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function CreateBroadcastForm() {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [level, setLevel] = React.useState('info')
  const [busy, setBusy] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setBusy(true)
    try {
      const { error } = await supabase.from('admin_broadcasts').insert({
        title: title.trim(),
        message: message.trim(),
        level,
      })
      if (error) throw error
      toast.success('Broadcast posted')
      setTitle('')
      setMessage('')
      setLevel('info')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-panel border border-(--color-surface-border) bg-(--color-surface-raised) p-5"
    >
      <h2 className="text-sm font-semibold text-(--color-content)">New broadcast</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-9 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface) px-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
          required
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="h-9 rounded-md border border-(--color-surface-border) bg-(--color-surface) px-3 text-sm text-(--color-content) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
        >
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message body…"
        rows={3}
        className="w-full resize-none rounded-md border border-(--color-surface-border) bg-(--color-surface) p-3 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-1 focus:ring-(--color-accent)"
        required
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !title.trim() || !message.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post broadcast'}
        </Button>
      </div>
    </form>
  )
}
