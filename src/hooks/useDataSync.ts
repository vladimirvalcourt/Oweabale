import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const VISIBILITY_REFETCH_MS = 45_000;

/**
 * Keeps Zustand in sync with Supabase for the signed-in user.
 *
 * - **On load / refresh:** When `authLoading` becomes false and we have a user id,
 *   we call `fetchData(userId)` so bills and all financial rows load from the DB.
 *   Financial data is not persisted in localStorage (see store `partialize`); the
 *   server is the source of truth.
 * - **After sign-out:** Clears local UI state only (not the database).
 * - **Tab focus:** Optionally refetches (throttled) when the tab becomes visible so
 *   long-lived sessions see updates made elsewhere.
 */
export function useDataSync({
  authUserId,
  authLoading,
}: {
  authUserId: string | null;
  authLoading: boolean;
}) {
  const { fetchData, clearLocalData } = useStore();
  const hadSessionRef = useRef(false);
  const lastVisibilityFetchRef = useRef(0);

  // Primary path: refetch whenever auth finishes and we know the user id
  // (matches the pattern: useEffect(() => { if (user) fetch(); }, [user])).
  useEffect(() => {
    if (authLoading) return;

    if (authUserId) {
      hadSessionRef.current = true;
      void fetchData(authUserId);
      return;
    }

    // Only clear when transitioning from signed-in → signed-out (not on every
    // landing-page visit for anonymous users).
    if (hadSessionRef.current) {
      hadSessionRef.current = false;
      clearLocalData();
    }
  }, [authLoading, authUserId, fetchData, clearLocalData]);

  // Secondary path: explicit sign-out from other tabs / Supabase client
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hadSessionRef.current = false;
        clearLocalData();
      }
    });
    return () => subscription.unsubscribe();
  }, [clearLocalData]);

  // Refetch when returning to the tab (throttled) — helps long sessions without full reload.
  useEffect(() => {
    if (authLoading || !authUserId) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityFetchRef.current < VISIBILITY_REFETCH_MS) return;
      lastVisibilityFetchRef.current = now;
      void fetchData(authUserId);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [authLoading, authUserId, fetchData]);
}
