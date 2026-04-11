import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const VISIBILITY_REFETCH_MS = 45_000;

function dataSyncDevLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

/**
 * Loads server data only after auth has settled (`authLoading === false` and `userId` exists).
 * Uses a ref to avoid calling `fetchData` twice for the same user in one mount cycle when
 * React re-runs effects with stable deps.
 */
export function useDataSync({
  authUserId,
  authLoading,
}: {
  authUserId: string | null;
  authLoading: boolean;
}) {
  const fetchData = useStore((s) => s.fetchData);
  const clearLocalData = useStore((s) => s.clearLocalData);
  const hadSessionRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const lastVisibilityFetchRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;

    if (authUserId) {
      hadSessionRef.current = true;
      if (lastFetchedUserIdRef.current === authUserId) return;
      lastFetchedUserIdRef.current = authUserId;
      dataSyncDevLog('[useDataSync] triggering fetchData for user:', authUserId);
      // Same-frame loading gate as fetchData (effect runs after paint; this minimizes the onboarding flash).
      useStore.setState({ isLoading: true });
      void fetchData(authUserId);
      return;
    }

    lastFetchedUserIdRef.current = null;
    if (hadSessionRef.current) {
      hadSessionRef.current = false;
      clearLocalData();
    }
  }, [authLoading, authUserId, fetchData, clearLocalData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        hadSessionRef.current = false;
        lastFetchedUserIdRef.current = null;
        clearLocalData();
      }
    });
    return () => subscription.unsubscribe();
  }, [clearLocalData]);

  useEffect(() => {
    if (authLoading || !authUserId) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityFetchRef.current < VISIBILITY_REFETCH_MS) return;
      lastVisibilityFetchRef.current = now;
      dataSyncDevLog('[useDataSync] visibility refetch for user:', authUserId);
      void fetchData(authUserId, { background: true });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [authLoading, authUserId, fetchData]);
}
