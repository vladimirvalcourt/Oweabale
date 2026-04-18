import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';
import { runAfterPaint } from '../lib/interaction';

type AuthPageProps = {
  mode?: 'signin' | 'signup';
};

export default function AuthPage({ mode = 'signin' }: AuthPageProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-content-primary/15 flex flex-col">
      <nav
        className={`fixed top-0 z-50 w-full border-b py-4 transition-colors duration-300 ${
          scrolled
            ? 'border-surface-border bg-black/55 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
          <TransitionLink to="/" className="brand-header-text flex items-center gap-2 text-content-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-cta" aria-hidden />
            Oweable
          </TransitionLink>
          <div className="flex items-center gap-6 text-sm text-content-tertiary">
            <TransitionLink to="/pricing" className="hover:text-content-primary transition-colors">
              Pricing
            </TransitionLink>
            <TransitionLink to="/" className="hover:text-content-primary transition-colors">
              Home
            </TransitionLink>
          </div>
        </div>
      </nav>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% 38%, rgba(255,255,255,0.05) 0%, transparent 55%)',
          }}
          aria-hidden
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-xl border border-surface-border bg-surface-raised/90 p-1 shadow-none backdrop-blur-sm">
            <div className="rounded-[10px] border border-surface-border bg-surface-elevated px-8 py-10 sm:px-10 sm:py-12">
              <div className="mb-8 inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-medium text-content-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                {isSignupMode ? 'Start free' : 'Secure sign-in'}
              </div>

              <h1 className="text-3xl font-medium tracking-[-0.03em] text-content-primary sm:text-4xl">
                {isSignupMode ? 'Create your free account' : 'Welcome back'}
              </h1>
              <p className="mt-3 max-w-md text-base font-medium leading-relaxed text-content-secondary">
                {isSignupMode
                  ? 'Start your financial OS - no credit card required'
                  : 'Sign in to manage debt, bills, and your full financial picture in one place.'}
              </p>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={googleLoading}
                className="mt-10 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-brand-cta px-4 py-3 text-sm font-medium text-surface-base shadow-none transition-colors hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-50 focus-app"
              >
                {googleLoading ? (
                  <span className="text-content-secondary">Redirecting…</span>
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    {isSignupMode ? 'Sign Up Free' : 'Sign In'}
                  </>
                )}
              </button>

              {isSignupMode ? (
                <p className="mt-4 text-center text-xs text-content-tertiary">
                  Already have an account?{' '}
                  <TransitionLink to="/auth" className="underline underline-offset-2 hover:text-content-primary">
                    Sign in
                  </TransitionLink>
                </p>
              ) : null}

              <p className="mt-8 text-center text-xs leading-relaxed text-content-tertiary">
                Authentication is handled by Google Identity. Oweable does not receive your Google password.
              </p>

              <p className="mt-8 text-center text-xs leading-relaxed text-content-muted">
                By continuing, you agree to our{' '}
                <TransitionLink
                  to="/terms"
                  className="text-content-tertiary underline underline-offset-2 hover:text-content-primary"
                >
                  Terms
                </TransitionLink>{' '}
                and{' '}
                <TransitionLink
                  to="/privacy"
                  className="text-content-tertiary underline underline-offset-2 hover:text-content-primary"
                >
                  Privacy Policy
                </TransitionLink>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
