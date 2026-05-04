import { useEffect, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/api/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  /** True until INITIAL_SESSION (or fallback getSession) has resolved. */
  authLoading: boolean;
  /** Alias for `authLoading`. */
  loading: boolean;
  showWarning: boolean;
  timeLeft: number;
  extendSession: () => void;
}

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_THRESHOLD_MS = 2 * 60 * 1000;

function authDevLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.warn(...args);
}

/**
 * Hydrate from `getSession()` first so redirect guards never run before storage is read,
 * then subscribe for sign-in/out and token refresh.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: { session: initial } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(initial);
      setUser(initial?.user ?? null);
      setAuthLoading(false);
      authDevLog('[useAuth] getSession resolved, user:', initial?.user?.id ?? 'none');
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (cancelled) return;

        // First paint already used `getSession()`; this avoids double-firing INITIAL_SESSION
        // before the async read completes.
        if (event === 'INITIAL_SESSION') {
          // Ensure authLoading is unblocked even when getSession() is slow or has already run.
          setAuthLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          authDevLog('[useAuth] SIGNED_OUT');
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          authDevLog('[useAuth] TOKEN_REFRESHED');
        }

        if (event === 'SIGNED_IN') {
          authDevLog('[useAuth] SIGNED_IN, user:', newSession?.user?.id ?? 'none');
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setAuthLoading(false);
      }
    );

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const lastActivityRef = useRef(0);

  const extendSession = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  };

  useEffect(() => {
    if (!session) return;

    lastActivityRef.current = Date.now();

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = IDLE_TIMEOUT_MS - elapsed;

      if (remaining <= 0) {
        supabase.auth.signOut();
        setShowWarning(false);
      } else if (remaining <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        setTimeLeft(Math.floor(remaining / 1000));
      } else {
        setShowWarning(false);
      }
    };

    // Include pointerdown/click/wheel/focusin so typing, tapping, wheel-scrolling, and focusing fields
    // count as activity (avoids surprise sign-out while using forms or chat).
    const events = [
      'mousedown',
      'pointerdown',
      'click',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'focusin',
    ] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));

    // 10s granularity is more than sufficient: warning threshold is 2 minutes.
    // 1s was firing 3,600 times/hour per tab — unnecessary CPU cost.
    const interval = setInterval(checkTimeout, 10_000);

    return () => {
      clearInterval(interval);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [session]);

  return {
    user,
    session,
    authLoading,
    loading: authLoading,
    showWarning,
    timeLeft,
    extendSession,
  };
}
