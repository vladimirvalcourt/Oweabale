'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

type Theme = 'dark' | 'light' | 'system'

export default function DisplayPage() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [theme, setTheme] = React.useState<Theme>('dark')
  const [compactMode, setCompactMode] = React.useState(false)

  React.useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('theme,metadata').eq('id', user.id).single()
      if (data) {
        setTheme((data.theme as Theme) || 'dark')
        setCompactMode(data.metadata?.compactMode ?? false)
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  const saveTheme = async (next: Theme) => {
    setTheme(next)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').update({ theme: next, updated_at: new Date().toISOString() }).eq('id', user.id)
      if (error) throw error
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const saveCompact = async (next: boolean) => {
    setCompactMode(next)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('metadata').eq('id', user.id).single()
      const { error } = await supabase.from('profiles').update({
        metadata: { ...profile?.metadata, compactMode: next },
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)
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

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Display</h2>
        <p className="text-sm text-(--color-content-secondary)">Customize your interface preferences.</p>
      </div>

      <div className="space-y-3">
        <Card className="border-(--color-surface-border)">
          <CardContent className="space-y-4 p-4">
            <Label className="text-sm font-medium text-(--color-content)">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const Icon = t.icon
                const active = theme === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => saveTheme(t.value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      active
                        ? 'border-(--color-accent) bg-(--color-accent-muted) text-(--color-accent)'
                        : 'border-(--color-surface-border) bg-(--color-surface) text-(--color-content-secondary) hover:border-(--color-content-tertiary)'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-(--color-surface-border)">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <Label htmlFor="compact" className="text-sm font-medium text-(--color-content)">Compact mode</Label>
              <p className="text-xs text-(--color-content-tertiary)">Reduce padding and font sizes for denser layouts.</p>
            </div>
            <Switch id="compact" checked={compactMode} onCheckedChange={saveCompact} disabled={saving} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
