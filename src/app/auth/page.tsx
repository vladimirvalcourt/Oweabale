'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, LockKeyhole } from 'lucide-react'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error

      if (!data?.url) {
        throw new Error('Failed to start Google sign in')
      }

      // Always continue OAuth in the top-level browsing context.
      // This avoids iframe + browser-error-page origin mismatches.
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = data.url
          return
        }
      } catch {
        // Cross-origin access to `window.top` can throw; fall back below.
      }
      window.location.href = data.url
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--color-surface)">
      <header className="border-b border-(--color-surface-border) px-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] text-(--color-content)">
            OWEABLE
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-(--color-surface-border) bg-(--color-surface-raised)">
              <LockKeyhole className="h-5 w-5 text-(--color-content-secondary)" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-(--color-content)">
              Sign in to Oweable
            </h1>
            <p className="mt-2 text-sm text-(--color-content-secondary)">
              Start your 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="mt-8">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-4 py-3 text-sm font-medium text-(--color-content) hover:bg-(--color-surface-border) transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-(--color-content-tertiary)">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-(--color-content-secondary)">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-(--color-content-secondary)">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
