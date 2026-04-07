import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // SECURITY FIX: JWT Expiry Drift / Idle Timeout Protection
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      if (session) {
        idleTimer = setTimeout(() => {
          supabase.auth.signOut();
        }, IDLE_TIMEOUT_MS);
      }
    };

    // Listen to standard user interaction events to keep session alive
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));
    
    // Initialize the timer
    resetIdleTimer();

    return () => {
      subscription.unsubscribe();
      clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [session?.user?.id]); // Re-bind timeout when user changes

  return { user, session, loading };
}
