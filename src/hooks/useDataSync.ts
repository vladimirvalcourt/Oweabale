import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { useAuth } from './useAuth';

/**
 * useDataSync Hook
 * 
 * Orchestrates the synchronization between Supabase Auth and the global Zustand store.
 * Handles initial data fetching, auth state changes, and prevents duplicate listeners or 
 * memory leaks during Vite HMR (Hot Module Replacement).
 */
export function useDataSync() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { fetchData, clearLocalData } = useStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    // If auth is still loading, do nothing
    if (authLoading) return;

    // Handle Sign-In / Initial Load
    if (authUser && !isInitialized.current) {
      console.log('[DataSync] User authenticated, fetching data...', authUser.id);
      fetchData(authUser.id);
      isInitialized.current = true;
    }

    // Handle Sign-Out
    if (!authUser && isInitialized.current) {
      console.log('[DataSync] User signed out, clearing store...');
      clearLocalData();
      isInitialized.current = false;
    }
  }, [authUser, authLoading, fetchData, clearLocalData]);

  // Sync logic for Vite HMR resilience
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchData(session.user.id);
        isInitialized.current = true;
      } else if (event === 'SIGNED_OUT') {
        clearLocalData();
        isInitialized.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchData, clearLocalData]);

  return { isReady: !authLoading };
}
