'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, User, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  timezone: string | null
  phone: string | null
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [profile, setProfile] = useState<Profile>({
    id: '',
    full_name: '',
    avatar_url: '',
    timezone: 'America/New_York',
    phone: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserEmail(user.email || '')

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          id: user.id,
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          timezone: data.timezone || 'America/New_York',
          phone: data.phone || '',
        })
      } else if (error && error.code !== 'PGRST116') {
        toast.error('Failed to load profile')
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: profile.id,
          full_name: profile.full_name || null,
          avatar_url: profile.avatar_url || null,
          timezone: profile.timezone || null,
          phone: profile.phone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (error) throw error
      toast.success('Profile saved')
      router.refresh()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to save profile'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [profile, saving, router, supabase])

  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    setAvatarUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not authenticated'); return }

      const ext = file.name.split('.').pop() || 'png'
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

      setProfile(p => ({ ...p, avatar_url: publicUrl }))

      // Also persist to profile table immediately
      const { error: updateError } = await supabase.from('profiles').upsert(
        { id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
      if (updateError) throw updateError

      toast.success('Avatar updated')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar'
      toast.error(msg)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-(--color-content-tertiary)" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Profile</h2>
        <p className="text-sm text-(--color-content-secondary)">Update your personal information.</p>
      </div>

      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative group"
            >
              <Avatar className="h-16 w-16 cursor-pointer transition-opacity group-hover:opacity-80">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || ''} />
                <AvatarFallback className="text-lg bg-(--color-accent-muted) text-(--color-accent)">
                  {avatarUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <User className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Upload className="h-5 w-5 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div>
              <p className="text-sm font-medium text-(--color-content)">Avatar</p>
              <p className="text-xs text-(--color-content-tertiary)">Click to upload a new image (max 5MB)</p>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={userEmail} disabled />
            <p className="text-xs text-(--color-content-tertiary)">Managed by Google sign-in</p>
          </div>

          {/* Full name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Your name"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={profile.timezone || 'America/New_York'}
              onValueChange={(val) => setProfile(p => ({ ...p, timezone: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
