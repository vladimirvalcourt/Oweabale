import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  showWarning: boolean;
  timeLeft: number;
  extendSession: () => void;
}

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Mount once — get initial session and subscribe to auth changes.
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('[useAuth] Session check failed:', error);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // lastActivity lives outside the effect so extendSession can reset it without
  // triggering a re-render or re-mounting the idle effect.
  const lastActivityRef = { current: Date.now() };

  const extendSession = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
  };

  // Idle timeout management — depends only on session so it mounts once per
  // login and is NOT re-created when showWarning toggles (which was resetting
  // lastActivity every time the warning appeared).
  useEffect(() => {
    if (!session) {
      return;
    }

    lastActivityRef.current = Date.now();

    const resetIdleTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const checkTimeout = () => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
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
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    
    const interval = setInterval(checkTimeout, 1000);

    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [session]); // Only re-mount when session changes, NOT when showWarning changes

  return { user, session, loading, showWarning, timeLeft, extendSession };
}
