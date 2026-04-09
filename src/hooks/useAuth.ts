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

  const extendSession = () => {
    setShowWarning(false);
    // This will trigger the reset in the effect below because it refreshes the activity timestamp
  };

  // Idle timeout management
  useEffect(() => {
    if (!session) {
      setShowWarning(false);
      return;
    }

    let lastActivity = Date.now();
    let interval: ReturnType<typeof setInterval>;

    const resetIdleTimer = () => {
      lastActivity = Date.now();
    };

    const checkTimeout = () => {
      const now = Date.now();
      const elapsed = now - lastActivity;
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
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    
    interval = setInterval(checkTimeout, 1000);

    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [session, showWarning]); // Re-bind if session or warning changes

  return { user, session, loading, showWarning, timeLeft, extendSession };
}
