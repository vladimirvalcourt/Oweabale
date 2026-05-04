import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/api/supabase';
import { useStore } from '@/store';

const VISIBILITY_REFETCH_MS = 45_000;

function dataSyncDevLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.warn(...args);
}

/**
 * Automatically sync user data from Supabase based on authentication state.
 *
 * This hook implements a three-tier synchronization strategy:
 *
 * **1. Initial Load:** When user signs in, fetches all data immediately
 * - Triggers when `authLoading` becomes false and `authUserId` is available
 * - Loading spinner is managed by `fetchData` internally (isLoading: true)
 * - Prevents duplicate fetches using `lastFetchedUserIdRef`
 *
 * **2. Sign Out Cleanup:** When user signs out, clears local store
 * - Listens to Supabase auth state changes
 * - Calls `clearLocalData()` to remove sensitive information
 * - Resets tracking refs to allow fresh load on next login
 *
 * **3. Background Refresh:** On tab visibility change (every 45s)
 * - Fetches data silently when user returns to tab
 * - Rate-limited to once per 45 seconds to avoid excessive API calls
 * - Updates data without showing loading spinner (`background: true`)
 *
 * **Why this pattern?**
 * - Ensures data is always fresh without manual refresh
 * - Prevents stale data after sign-in/sign-out cycles
 * - Optimizes for perceived performance (loading states only when needed)
 * - Handles edge cases: rapid sign-in/out, multiple tabs, browser sleep
 *
 * @param authUserId - Current authenticated user ID (from useAuth hook)
 * @param authLoading - Whether authentication state is still resolving
 *
 * @example
 * ```ts
 * // In App.tsx or root layout component
 * const { user, loading } = useAuth();
 * useDataSync({ authUserId: user?.id ?? null, authLoading: loading });
 * ```
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
  const authInitializedRef = useRef(false);
  const handledUserIdsRef = useRef(new Set<string>());

  // Store stable references to prevent infinite loops
  const fetchDataRef = useRef(fetchData);
  const clearLocalDataRef = useRef(clearLocalData);

  // Update refs when methods change
  useEffect(() => {
    fetchDataRef.current = fetchData;
    clearLocalDataRef.current = clearLocalData;
  }, [fetchData, clearLocalData]);

  // Initialize auth state on mount - wait for Supabase to resolve session
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Wait for Supabase to resolve the current session
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          authInitializedRef.current = true;
          console.warn('[useDataSync] Auth initialized, session:', session ? 'present' : 'none');

          // If there's already a session on mount, handle it immediately
          if (session?.user?.id && !handledUserIdsRef.current.has(session.user.id)) {
            handledUserIdsRef.current.add(session.user.id);
            console.warn('[useDataSync] Initial session found, fetching data for:', session.user.id);
            console.warn('[useDataSync] Calling fetchData for initial session');
            void fetchDataRef.current(session.user.id);
            console.warn('[useDataSync] fetchData called, waiting for response...');
          } else {
            console.warn('[useDataSync] No session or user already handled');
            console.warn('[useDataSync] Session:', !!session, 'User ID:', session?.user?.id, 'Already handled:', handledUserIdsRef.current.has(session?.user?.id || ''));
          }
        }
      } catch (error) {
        console.error('[useDataSync] Auth initialization error:', error);
        if (mounted) {
          authInitializedRef.current = true; // Mark as initialized even on error to prevent blocking
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Main effect removed - auth is now handled by onAuthStateChange listener and initial getSession()
  // This prevents race conditions and duplicate fetchData calls

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.warn('[useDataSync] Auth state changed:', event, 'Session:', session ? 'present' : 'null');

      // Skip INITIAL_SESSION - already handled in mount effect
      if (event === 'INITIAL_SESSION') {
        console.warn('[useDataSync] Skipping INITIAL_SESSION - already handled in mount');
        return;
      }

      if (event === 'SIGNED_IN' && session?.user?.id) {
        // Deduplicate: only fetch once per user ID
        if (handledUserIdsRef.current.has(session.user.id)) {
          console.warn('[useDataSync] User already handled, skipping duplicate:', session.user.id);
          return;
        }

        console.warn('[useDataSync] User signed in, fetching data for:', session.user.id);
        handledUserIdsRef.current.add(session.user.id);
        void fetchDataRef.current(session.user.id);
      }

      if (event === 'SIGNED_OUT') {
        console.warn('[useDataSync] User signed out, clearing data');
        hadSessionRef.current = false;
        lastFetchedUserIdRef.current = null;
        handledUserIdsRef.current.clear(); // Clear handled users on sign out
        clearLocalDataRef.current();
      }
    });
    return () => subscription.unsubscribe();
  }, []); // Removed clearLocalData from deps

  useEffect(() => {
    if (authLoading || !authUserId) return;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityFetchRef.current < VISIBILITY_REFETCH_MS) return;
      lastVisibilityFetchRef.current = now;
      dataSyncDevLog('[useDataSync] visibility refetch for user:', authUserId);
      void fetchDataRef.current(authUserId, { background: true });
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [authLoading, authUserId]); // Removed fetchData from deps
}
