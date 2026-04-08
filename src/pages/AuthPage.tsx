import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileStatus = 'idle' | 'solved' | 'expired' | 'error';

export default function AuthPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>('idle');
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds

    const tryRender = () => {
      if (!containerRef.current) return;

      if (window.turnstile) {
        // Remove any existing widget first
        if (widgetIdRef.current) {
          try { window.turnstile!.remove(widgetIdRef.current); } catch {}
          widgetIdRef.current = null;
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: 'light',
          size: 'flexible',
          callback: (token: string) => {
            setTurnstileToken(token);
            setTurnstileStatus('solved');
          },
          'error-callback': () => {
            setTurnstileToken(null);
            setTurnstileStatus('error');
          },
          'expired-callback': () => {
            setTurnstileToken(null);
            setTurnstileStatus('expired');
          },
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryRender, 100);
      }
    };

    tryRender();

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    if (!turnstileToken || turnstileStatus !== 'solved') return;

    setGoogleLoading(true);
    try {
      const verifyRes = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken },
      });

      if (verifyRes.error || !verifyRes.data?.success) {
        toast.error('Security check failed. Please try again.');
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
        setTurnstileToken(null);
        setTurnstileStatus('idle');
        setGoogleLoading(false);
        return;
      }

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

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 border-2 border-brand-violet flex items-center justify-center">
              <div className="w-2 h-2 bg-brand-violet" />
            </div>
            <span className="font-mono text-xs text-zinc-500 tracking-[0.2em] uppercase">
              Oweable
            </span>
          </div>
          <h1 className="font-mono text-2xl text-white font-bold tracking-tight">
            Sign in to Oweable
          </h1>
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-[0.2em] mt-2">
            Your financial OS — Secure access only.
          </p>
        </div>

        {/* Turnstile widget */}
        <div ref={containerRef} className="mb-4" />
        {turnstileStatus === 'expired' && (
          <p className="font-mono text-[10px] text-yellow-500 mb-2 uppercase tracking-wider">
            Security check expired — please verify again.
          </p>
        )}
        {turnstileStatus === 'error' && (
          <p className="font-mono text-[10px] text-red-500 mb-2 uppercase tracking-wider">
            Security check failed — please refresh and try again.
          </p>
        )}

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || turnstileStatus !== 'solved'}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-mono text-sm font-bold py-4 px-4 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
        >
          {googleLoading ? (
            <span className="text-xs tracking-widest uppercase">Redirecting…</span>
          ) : (
            <>
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        {/* Support Note */}
        <p className="font-mono text-[11px] text-zinc-500 text-center mb-10 uppercase tracking-[0.1em] leading-relaxed">
          Enterprise encryption and biometric auth <br />
          handled by Google Identity Services.
        </p>

        {/* Legal */}
        <p className="font-mono text-[10px] text-zinc-600 text-center mt-6 leading-relaxed uppercase tracking-wider">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-zinc-400 hover:text-white underline underline-offset-2">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-zinc-400 hover:text-white underline underline-offset-2">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
