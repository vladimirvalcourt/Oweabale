import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function AuthPage() {
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Cold radial charge — subtle atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 85% 55% at 50% 42%, rgba(255, 255, 255, 0.06) 0%, transparent 52%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255, 255, 255, 0.04) 0%, transparent 45%)',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm auth-login-electric-wrap">
        <div className="auth-login-electric-inner px-6 py-10 sm:px-8 sm:py-12">
          <span className="auth-login-conduit auth-login-conduit--left" aria-hidden />
          <span className="auth-login-conduit auth-login-conduit--right" aria-hidden />
          <div className="relative z-10">
        {/* Logo / wordmark */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 border-2 border-white/25 flex items-center justify-center">
              <div className="w-2 h-2 bg-content-secondary" />
            </div>
            <span className="font-mono text-xs text-content-tertiary tracking-[0.2em] uppercase">
              Oweable
            </span>
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-content-primary [text-shadow:0_1px_0_rgba(255,255,255,0.06)]">
            Sign in to Oweable
          </h1>
          <p className="font-mono text-xs text-content-tertiary uppercase tracking-[0.2em] mt-2">
            Your financial OS — Secure access only.
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="mb-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-mono text-sm font-bold text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 focus-app"
        >
          {googleLoading ? (
            <span className="text-xs tracking-widest uppercase">Redirecting…</span>
          ) : (
            <>
              {/* Google "G" logo */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
              Sign in with Google
            </>
          )}
        </button>

        {/* Support Note */}
        <p className="font-mono text-[11px] text-content-tertiary text-center mb-10 uppercase tracking-[0.1em] leading-relaxed">
          Enterprise encryption and biometric auth <br />
          handled by Google Identity Services.
        </p>

        {/* Legal */}
        <p className="font-mono text-[10px] text-content-muted text-center mt-6 leading-relaxed uppercase tracking-wider">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-content-tertiary hover:text-white underline underline-offset-2">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-content-tertiary hover:text-white underline underline-offset-2">Privacy Policy</a>.
        </p>
          </div>
        </div>
      </div>
    </div>
  );
}
