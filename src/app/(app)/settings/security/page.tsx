'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2, KeyRound, ShieldAlert, ShieldCheck, Smartphone, Trash2,
  Monitor, Globe, Clock, QrCode,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SessionInfo {
  id: string
  device: string
  location: string
  created_at: string
  last_active: string
  is_current: boolean
}

export default function SecurityPage() {
  const supabase = createClient()

  // Password
  const [savingPw, setSavingPw] = React.useState(false)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  // MFA
  const [mfaLoading, setMfaLoading] = React.useState(true)
  const [mfaFactors, setMfaFactors] = React.useState<{ id: string; status: string; friendly_name?: string }[]>([])
  const [enrolling, setEnrolling] = React.useState(false)
  const [qrCode, setQrCode] = React.useState<string | null>(null)
  const [factorId, setFactorId] = React.useState<string | null>(null)
  const [verifyCode, setVerifyCode] = React.useState('')
  const [unenrollingId, setUnenrollingId] = React.useState<string | null>(null)

  // Sessions
  const [sessions, setSessions] = React.useState<SessionInfo[]>([])
  const [sessionsLoading, setSessionsLoading] = React.useState(true)
  const [revokingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true

    const load = async () => {
      // MFA
      try {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (!mounted) return
        if (error) throw error
        setMfaFactors([...(data?.totp ?? [])])
      } catch {
        if (!mounted) return
        setMfaFactors([])
      } finally {
        if (mounted) setMfaLoading(false)
      }

      // Sessions
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return
        const current: SessionInfo[] = []
        if (data.session) {
          const ua = navigator.userAgent
          const device = /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop'
          current.push({
            id: data.session.user?.id ?? 'current',
            device: `${device} — ${ua.slice(0, 40)}...`,
            location: 'Current location',
            created_at: new Date().toLocaleString(),
            last_active: 'Now',
            is_current: true,
          })
        }
        setSessions(current)
      } catch {
        if (!mounted) return
        setSessions([])
      } finally {
        if (mounted) setSessionsLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [supabase])

  // ── Password ──
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSavingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated successfully')
      setPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPw(false)
    }
  }

  // ── MFA ──
  const handleEnrollMfa = async () => {
    setEnrolling(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setQrCode(data.totp?.qr_code ?? null)
      setFactorId(data.id ?? null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start MFA enrollment')
      setEnrolling(false)
    }
  }

  const handleVerifyMfa = async () => {
    if (!factorId || !verifyCode) return
    try {
      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
      if (challengeErr) throw challengeErr
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      })
      if (verifyErr) throw verifyErr
      toast.success('Two-factor authentication enabled')
      setQrCode(null)
      setFactorId(null)
      setVerifyCode('')
      // Refresh MFA list
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        setMfaFactors([...(data?.totp ?? [])])
      } catch {
        setMfaFactors([])
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenrollMfa = async (id: string) => {
    if (!confirm('Remove this two-factor method? You will no longer be prompted for a verification code at sign-in.')) return
    setUnenrollingId(id)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (error) throw error
      toast.success('Two-factor authentication removed')
      // Refresh MFA list
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        setMfaFactors([...(data?.totp ?? [])])
      } catch {
        setMfaFactors([])
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove MFA')
    } finally {
      setUnenrollingId(null)
    }
  }

  // ── Sessions ──
  const handleRevokeAll = async () => {
    if (!confirm('Sign out all other sessions? You will stay signed in on this device.')) return
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
      toast.success('Other sessions signed out')
      // Refresh session list
      try {
        const { data } = await supabase.auth.getSession()
        const current: SessionInfo[] = []
        if (data.session) {
          const ua = navigator.userAgent
          const device = /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop'
          current.push({
            id: data.session.user?.id ?? 'current',
            device: `${device} — ${ua.slice(0, 40)}...`,
            location: 'Current location',
            created_at: new Date().toLocaleString(),
            last_active: 'Now',
            is_current: true,
          })
        }
        setSessions(current)
      } catch {
        setSessions([])
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out other sessions')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: This will permanently delete your account and all data. This action cannot be undone. Type "DELETE" to confirm.')) return
    toast.error('Account deletion is not yet implemented. Contact support.')
  }

  const activeFactors = mfaFactors.filter((f) => f.status === 'verified')

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-(--color-content)">Security</h2>
        <p className="text-sm text-(--color-content-secondary)">Manage your account security and data.</p>
      </div>

      {/* Password */}
      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <KeyRound className="h-4 w-4 text-(--color-content-secondary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--color-content)">Change password</p>
              <p className="text-xs text-(--color-content-tertiary)">Update your account password.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPw || !password || !confirmPassword} className="gap-2">
                {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Two-factor authentication */}
      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <ShieldCheck className="h-4 w-4 text-(--color-content-secondary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--color-content)">Two-factor authentication</p>
              <p className="text-xs text-(--color-content-tertiary)">
                {activeFactors.length > 0 ? `${activeFactors.length} method enabled` : 'Add an extra layer of security to your account.'}
              </p>
            </div>
          </div>

          {mfaLoading ? (
            <div className="flex items-center gap-2 text-xs text-(--color-content-tertiary)">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading MFA status...
            </div>
          ) : (
            <div className="space-y-3">
              {activeFactors.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-4 w-4 text-(--color-content-secondary)" />
                    <div>
                      <p className="text-sm font-medium text-(--color-content)">{f.friendly_name || 'Authenticator app'}</p>
                      <p className="text-xs text-(--color-content-tertiary)">TOTP</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnenrollMfa(f.id)}
                    disabled={unenrollingId === f.id}
                    className="text-(--color-danger) hover:bg-(--color-danger-bg)"
                  >
                    {unenrollingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Remove
                  </Button>
                </div>
              ))}

              {activeFactors.length === 0 && !qrCode && (
                <div className="rounded-md border border-dashed border-(--color-surface-border) bg-(--color-surface-raised) px-4 py-6 text-center">
                  <p className="text-sm text-(--color-content-secondary)">No 2FA methods set up yet</p>
                  <Button
                    onClick={handleEnrollMfa}
                    disabled={enrolling}
                    className="mt-3 gap-2"
                  >
                    {enrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                    Set up authenticator
                  </Button>
                </div>
              )}

              {qrCode && factorId && (
                <div className="space-y-4 rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) p-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-(--color-accent)" />
                    <p className="text-sm font-medium text-(--color-content)">Scan this QR code</p>
                  </div>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="MFA QR code" className="h-40 w-40 rounded-md border border-(--color-surface-border)" />
                  </div>
                  <p className="text-center text-xs text-(--color-content-tertiary)">
                    Use your authenticator app to scan the code, then enter the 6-digit code below.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="6-digit code"
                      maxLength={6}
                      className="flex-1 text-center tracking-widest"
                    />
                    <Button
                      onClick={handleVerifyMfa}
                      disabled={verifyCode.length < 6}
                      className=""
                    >
                      Verify
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setQrCode(null); setFactorId(null); setVerifyCode(''); setEnrolling(false) }}
                    className="w-full text-(--color-content-tertiary)"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface)">
              <Monitor className="h-4 w-4 text-(--color-content-secondary)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--color-content)">Active sessions</p>
              <p className="text-xs text-(--color-content-tertiary)">Manage where you are signed in.</p>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-xs text-(--color-content-tertiary)">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-(--color-content-secondary)">No active sessions found.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2.5',
                  s.is_current
                    ? 'border-(--color-accent-muted) bg-(--color-accent-muted)'
                    : 'border-(--color-surface-border) bg-(--color-surface-raised)'
                )}>
                  <div className="flex items-center gap-2.5">
                    {s.is_current ? <Monitor className="h-4 w-4 text-(--color-accent)" /> : <Globe className="h-4 w-4 text-(--color-content-secondary)" />}
                    <div>
                      <p className="text-sm font-medium text-(--color-content)">
                        {s.is_current ? 'This device' : s.device}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-(--color-content-tertiary)">
                        <Clock className="h-3 w-3" />
                        {s.is_current ? 'Active now' : s.last_active}
                      </div>
                    </div>
                  </div>
                  {s.is_current && (
                    <span className="rounded-full bg-(--color-accent) px-2 py-0.5 text-[10px] font-medium text-white">
                      Current
                    </span>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleRevokeAll}
                disabled={revokingId !== null}
                className="w-full border-(--color-surface-border) text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
              >
                {revokingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign out all other sessions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-(--color-surface-border)">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-(--color-danger-border) bg-(--color-danger-bg)">
              <ShieldAlert className="h-4 w-4 text-(--color-danger)" />
            </div>
            <div>
              <p className="text-sm font-medium text-(--color-danger)">Danger zone</p>
              <p className="text-xs text-(--color-content-tertiary)">Destructive and irreversible actions.</p>
            </div>
          </div>
          <p className="text-sm text-(--color-content-secondary)">
            Deleting your account will permanently remove all your data, including bills, debts, subscriptions, goals, and transaction history. This action cannot be undone.
          </p>
          <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Delete account</Button>
        </CardContent>
      </Card>
    </div>
  )
}
