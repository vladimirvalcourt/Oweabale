import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/api/supabase';
import { toast } from 'sonner';
import { TransitionLink } from '../components/common';
import { useSEO } from '../hooks';
import { runAfterPaint } from '../lib/utils';
import { BrandWordmark } from '../components/common';
import { CheckCircle2, LockKeyhole, ReceiptText, WalletCards } from 'lucide-react';

type AuthPageProps = {
  mode?: 'signin' | 'signup';
};

export default function AuthPage({ mode = 'signin' }: AuthPageProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const isSignupMode = mode === 'signup';
  const location = useLocation();

  useSEO({
    title: isSignupMode ? 'Create your free account — Oweable' : 'Sign in — Oweable',
    description: isSignupMode
      ? 'Create your free Oweable account to start your financial OS with no credit card required.'
      : 'Sign in to Oweable with Google. Secure access to your financial OS for freelancers, gig workers, and the self-employed.',
    canonical: isSignupMode ? 'https://www.oweable.com/onboarding' : 'https://www.oweable.com/auth',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const redirectTarget = new URLSearchParams(location.search).get('redirect');
      const callbackRedirect =
        redirectTarget && redirectTarget.startsWith('/')
          ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTarget)}`
          : `${window.location.origin}/auth/callback`;
      const { error } = await runAfterPaint('auth_google_signin', async () =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: callbackRedirect,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        }),
      );

      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to sign in with Google';
      toast.error(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-brand-violet/25">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-surface-border-subtle bg-surface-base/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <TransitionLink to="/" className="group flex items-center gap-2 text-content-primary">
            <BrandWordmark
              logoClassName="h-5 w-5 rounded-[4px]"
              textClassName="text-xl font-medium normal-case tracking-[-0.035em] text-content-primary"
            />
          </TransitionLink>
          <TransitionLink to="/pricing" className="text-sm text-content-secondary/72 transition-colors hover:text-content-primary">
            Pricing
          </TransitionLink>
        </div>
      </header>

      <main className="mx-auto grid min-h-screen max-w-[1280px] gap-12 px-5 pb-16 pt-36 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <section className="max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-surface-border-subtle bg-white/[0.025] px-3 py-1 text-xs text-content-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-indigo" aria-hidden />
            Free to start · Google sign-in
          </p>

          <h1 className="mt-7 text-5xl font-medium leading-none tracking-[-0.055em] text-content-primary sm:text-6xl">
            {isSignupMode ? 'Create your account.' : 'Welcome back.'}
          </h1>
          <p className="mt-6 text-base leading-7 text-content-tertiary">
            One secure entry point for your Pay List, debt plan, subscriptions, and cash checks. New accounts are created automatically.
          </p>

          <motion.button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="mt-10 flex h-11 w-full items-center justify-center gap-3 rounded-md bg-content-primary px-4 text-sm font-medium tracking-normal text-surface-base transition-[background-color,transform] hover:bg-content-secondary disabled:cursor-not-allowed disabled:opacity-50 focus-app"
          >
            {googleLoading ? (
              <span>Redirecting…</span>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </motion.button>

          <div className="mt-8 flex items-center gap-3 border-t border-surface-border-subtle pt-8">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-violet" aria-hidden />
            <p className="text-sm text-content-secondary">
              New here? Signing in creates your account automatically.
            </p>
          </div>

          <p className="mt-12 text-xs leading-relaxed text-content-muted">
            By continuing, you agree to our{' '}
            <TransitionLink to="/terms" className="text-content-tertiary underline underline-offset-2 hover:text-content-primary">Terms</TransitionLink>
            {' '}and{' '}
            <TransitionLink to="/privacy" className="text-content-tertiary underline underline-offset-2 hover:text-content-primary">Privacy Policy</TransitionLink>.
          </p>
        </section>

        <section className="hidden lg:block">
          <div className="overflow-hidden rounded-[10px] border border-surface-border bg-white/[0.018] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_40px_160px_rgba(0,0,0,0.42)]">
            <div className="flex h-12 items-center justify-between border-b border-surface-border-subtle bg-surface-raised/70 px-5">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-[4px] border border-surface-border bg-white/[0.04]" />
                <span className="text-sm font-medium text-content-primary">Oweable</span>
                <span className="text-content-muted">/</span>
                <span className="text-sm text-content-tertiary">Account setup</span>
              </div>
              <span className="text-xs text-content-muted">Secure session</span>
            </div>
            <div className="grid min-h-[460px] grid-cols-[240px_1fr]">
              <aside className="border-r border-surface-border-subtle bg-surface-raised/36 p-5">
                {[
                  ['Pay List', ReceiptText],
                  ['Cash overview', WalletCards],
                  ['Private access', LockKeyhole],
                ].map(([label, Icon], index) => {
                  const IconComponent = Icon as typeof ReceiptText;
                  return (
                    <div key={label as string} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${index === 2 ? 'bg-white/[0.055] text-content-primary' : 'text-content-tertiary'}`}>
                      <IconComponent className="h-4 w-4" />
                      {label as string}
                    </div>
                  );
                })}
              </aside>
              <div className="p-10">
                <p className="text-sm text-content-muted">AUTH-014</p>
                <h2 className="mt-8 text-2xl font-medium tracking-[-0.03em] text-content-primary">Start with one secure account</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-content-tertiary">
                  Connect the basics first. Oweable keeps the onboarding path short, then lets the dashboard handle the deeper setup.
                </p>
                <div className="mt-10 divide-y divide-white/[0.06] rounded-[8px] border border-surface-border-subtle bg-surface-base/50">
                  {['Google OAuth redirect', 'Trial profile activation', 'Dashboard routing'].map((item, index) => (
                    <div key={item} className="flex items-center justify-between px-4 py-4">
                      <span className="text-sm text-content-secondary">{item}</span>
                      <span className="rounded-md border border-surface-border-subtle px-2 py-1 text-xs text-content-muted">
                        {index === 0 ? 'Ready' : index === 1 ? 'Auto' : 'Next'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
