import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

/**
 * useDataSync Hook
 *
 * Self-contained sync between Supabase Auth and Zustand store.
 * Strategy:
 *   1. On mount, call getSession() immediately — this covers page refresh
 *      where the session is already in localStorage and available synchronously.
 *   2. Listen to onAuthStateChange for INITIAL_SESSION, SIGNED_IN, and
 *      TOKEN_REFRESHED — all three can fire on a cold load or refresh.
 *   3. On SIGNED_OUT, clear local state only (never touch DB).
 */
export function useDataSync() {
  const { fetchData, clearLocalData } = useStore();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Path 1: Immediate session check on mount.
    // Covers page refresh — session is in localStorage and resolves synchronously.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !hasFetched.current) {
        hasFetched.current = true;
        fetchData(session.user.id);
      }
    });

    // Path 2: Auth state change events.
    // Covers INITIAL_SESSION (fired on refresh), SIGNED_IN (fresh login),
    // TOKEN_REFRESHED (background token renewal).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        session?.user &&
        !hasFetched.current
      ) {
        hasFetched.current = true;
        fetchData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        clearLocalData();
        hasFetched.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Intentionally empty — runs once on mount, auth events handle the rest
}
