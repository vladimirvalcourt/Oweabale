import { useEffect, useRef, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  if (import.meta.env.DEV) console.log(...args);
}

/**
 * Auth state is driven by `onAuthStateChange` (INITIAL_SESSION, SIGNED_IN,
 * TOKEN_REFRESHED, SIGNED_OUT). A delayed `getSession()` fallback covers edge
 * cases where INITIAL_SESSION is slow to emit.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const initialResolveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const applySession = (s: Session | null, source: string) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setAuthLoading(false);
      if (source === 'INITIAL_SESSION' || source === 'getSession-fallback') {
        authDevLog('[useAuth] session resolved, user:', s?.user?.id ?? 'none');
        if (source === 'getSession-fallback') {
          authDevLog('[useAuth] (via getSession fallback — INITIAL_SESSION was slow)');
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (cancelled) return;

        if (event === 'INITIAL_SESSION') {
          initialResolveRef.current = true;
          applySession(newSession, 'INITIAL_SESSION');
          return;
        }

        if (event === 'SIGNED_OUT') {
          authDevLog('[useAuth] SIGNED_OUT');
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          initialResolveRef.current = false;
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

    const fallback = window.setTimeout(() => {
      if (cancelled || initialResolveRef.current) return;
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (cancelled || initialResolveRef.current) return;
        initialResolveRef.current = true;
        applySession(s, 'getSession-fallback');
      });
    }, 1500);

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
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

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));

    const interval = setInterval(checkTimeout, 1000);

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
