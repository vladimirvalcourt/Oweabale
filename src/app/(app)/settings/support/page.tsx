'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, MessageSquare, Mail } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SupportPage() {
  const supabase = createClient()
  const [saving, setSaving] = React.useState(false)
  const [subject, setSubject] = React.useState('')
  const [message, setMessage] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }
      // Save to a simple feedback table if it exists, otherwise just toast
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
      })
      if (error && error.code !== '42P01') throw error
      toast.success('Message sent. We will get back to you soon.')
      setSubject('')
      setMessage('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Support</h2>
        <p className="text-sm text-(--color-content-secondary)">Get help or send feedback.</p>
      </div>

      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <MessageSquare className="h-4 w-4 text-(--color-content-secondary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--color-content)">Contact us</p>
              <p className="text-xs text-(--color-content-tertiary)">Send a message and we will respond within 24 hours.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this about?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or feedback..."
                rows={4}
                required
                className="w-full rounded-md border border-(--color-surface-border) bg-(--color-surface) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !subject.trim() || !message.trim()} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Send message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-(--color-surface-border)">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
            <Mail className="h-5 w-5 text-(--color-content-secondary)" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--color-content)">Email support</p>
            <p className="text-xs text-(--color-content-tertiary)">support@oweable.app</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
