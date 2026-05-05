'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Mail, Target, CalendarDays, BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface NotificationPrefs {
  emailReminders?: boolean
  dueDateAlerts?: boolean
  goalProgress?: boolean
  weeklySummary?: boolean
}

const defaultPrefs: NotificationPrefs = {
  emailReminders: true,
  dueDateAlerts: true,
  goalProgress: true,
  weeklySummary: false,
}

export default function NotificationsPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(defaultPrefs)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single()
      if (data?.metadata?.notifications) {
        setPrefs({ ...defaultPrefs, ...data.metadata.notifications })
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase
        .from('profiles')
        .update({
          metadata: { notifications: next },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
      </div>
    )
  }

  const items = [
    {
      key: 'emailReminders' as const,
      icon: Mail,
      title: 'Email Reminders',
      description: 'Get notified when bills or subscriptions are due.',
      checked: prefs.emailReminders ?? true,
    },
    {
      key: 'dueDateAlerts' as const,
      icon: CalendarDays,
      title: 'Due Date Alerts',
      description: 'Receive push alerts 3 days before a payment is due.',
      checked: prefs.dueDateAlerts ?? true,
    },
    {
      key: 'goalProgress' as const,
      icon: Target,
      title: 'Goal Progress',
      description: 'Celebrate when you hit savings milestones.',
      checked: prefs.goalProgress ?? true,
    },
    {
      key: 'weeklySummary' as const,
      icon: BarChart3,
      title: 'Weekly Summary',
      description: 'A digest of your spending and upcoming obligations every Monday.',
      checked: prefs.weeklySummary ?? false,
    },
  ]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Notifications</h2>
        <p className="text-sm text-(--color-content-secondary)">Choose how you want to be notified.</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.key} className="border-(--color-surface-border)">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
                <item.icon className="h-4 w-4 text-(--color-content-secondary)" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor={item.key} className="text-sm font-medium text-(--color-content)">{item.title}</Label>
                  <Switch
                    id={item.key}
                    checked={item.checked}
                    onCheckedChange={(v) => updatePref(item.key, v)}
                    disabled={saving}
                  />
                </div>
                <p className="mt-0.5 text-xs text-(--color-content-tertiary)">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
