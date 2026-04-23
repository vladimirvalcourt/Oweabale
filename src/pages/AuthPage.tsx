import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { TransitionLink } from '../components/TransitionLink';
import { useSEO } from '../hooks/useSEO';
import { runAfterPaint } from '../lib/interaction';
import { BrandWordmark } from '../components/BrandWordmark';
import { ThemeToggle } from '../components/ThemeToggle';
import { CheckCircle2 } from 'lucide-react';

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
    <div className="flex min-h-screen bg-black text-content-primary font-sans selection:bg-content-primary/15">
      
      {/* Left Side - Auth Form */}
      <div className="flex w-full flex-col lg:w-[45%] xl:w-[40%] relative z-10 border-r border-surface-border bg-surface-base">
        
        {/* Nav Header */}
        <div className="flex items-center justify-between px-8 py-6 md:px-12">
          <TransitionLink to="/" className="group flex items-center gap-2">
            <BrandWordmark textClassName="text-sm font-semibold uppercase tracking-[0.1em] text-content-primary" />
          </TransitionLink>
          <ThemeToggle />
        </div>

        {/* Auth Container */}
        <div className="flex flex-1 flex-col justify-start px-6 sm:px-8 md:px-12 lg:px-16 max-w-xl w-full pt-12 pb-20">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-content-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Free · No credit card required
          </div>

          <h1 className="text-left text-4xl font-semibold tracking-tight text-content-primary sm:text-5xl">
            Welcome to Oweable
          </h1>
          <p className="mt-4 text-left text-base leading-relaxed text-content-secondary max-w-sm">
            Sign in or create your account — it's the same button. One click gets you started.
          </p>

          <motion.button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={googleLoading}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="mt-10 flex h-[48px] w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-zinc-900 px-4 text-sm font-medium tracking-wide text-surface-base shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all duration-200 hover:border-white/30 hover:bg-zinc-800 hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-50 focus-app"
          >
            {googleLoading ? (
              <span className="text-content-secondary">Redirecting…</span>
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

          <div className="mt-8 flex items-center gap-3 border-t border-surface-border pt-8">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
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
        </div>
      </div>

    </div>
  );
}
