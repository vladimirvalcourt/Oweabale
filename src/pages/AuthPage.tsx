import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
    // No need to setGoogleLoading(false) on success — page redirects
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/dashboard` },
          });

    if (error) {
      toast.error(error.message);
    } else if (mode === 'signup') {
      toast.success('Check your email to confirm your account.');
    }
    setLoading(false);
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
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
            {mode === 'login'
              ? 'Your financial OS — back online.'
              : 'Start tracking your money like a pro.'}
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-mono text-sm font-bold py-3 px-4 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
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
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        {/* Email / Password form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div>
            <label className="block font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-card border border-surface-border text-white font-mono text-sm px-3 py-2.5 outline-none focus:border-brand-violet transition-colors placeholder-zinc-700"
            />
          </div>

          <div>
            <label className="block font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-card border border-surface-border text-white font-mono text-sm px-3 py-2.5 outline-none focus:border-brand-violet transition-colors placeholder-zinc-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-violet text-white font-mono text-xs font-bold tracking-widest uppercase py-3 hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="font-mono text-[10px] text-zinc-500 text-center mt-6">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-brand-violet hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-brand-violet hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Legal */}
        <p className="font-mono text-[8px] text-zinc-700 text-center mt-4 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-zinc-500 hover:text-white">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-zinc-500 hover:text-white">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
