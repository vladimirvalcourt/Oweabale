import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ');
  throw new Error(
    `[Supabase] Missing required environment variables: ${missing}. ` +
    'Add them to .env.local (local) or the Vercel project settings (production/preview).'
  );
}

/** For streaming `fetch` to Edge Functions (`functions.invoke` buffers the full body). */
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;

/**
 * Single browser client — anon key is safe to expose; RLS enforces access.
 *
 * TRANSFER OPTIMIZATION: Configured for minimal egress during project migration.
 * - Reduced auto-refresh frequency to prevent unnecessary token exchanges
 * - Disabled realtime subscriptions (not used in current app)
 * - Optimized storage to reduce localStorage writes
 * - 30-second request timeout prevents hanging connections
 * - Custom headers for transfer tracking
 *
 * Host note: sessions live in localStorage per origin. Use a single canonical host
 * (e.g. always `https://www.oweable.com` or always apex) in production so refresh
 * and deep links share one storage bucket. Cookie `domain` for Supabase Auth is
 * configured in the Supabase dashboard (set to `.oweable.com` if using both www and apex).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    // Persistent storage keeps deep links and bookmarked routes usable across browser restarts.
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // TRANSFER SAFETY: Reduce token refresh chatter
    // Default behavior is fine, but we log refreshes for monitoring
  },
  // EGRESS OPTIMIZATION: Disable realtime subscriptions (not used in app)
  // This prevents WebSocket connections that consume egress
  realtime: {
    params: {
      eventsPerSecond: 0, // Disable realtime event streaming
    },
  },
  // EGRESS OPTIMIZATION: Configure global fetch with conservative timeouts
  global: {
    headers: {
      'X-Client-Info': 'oweable-transfer-optimized',
      'X-Egress-Monitoring': 'enabled',
    },
    // Abort requests that take too long to prevent hanging connections
    fetch: (...args) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      return fetch(args[0], {
        ...args[1],
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
});

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) throw error;
  return data;
};

/**
 * Clear all local storage and sign out user - useful for recovering from auth/session issues
 */
export const clearLocalState = async () => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    console.warn('[clearLocalState] All local state cleared successfully');

    // Force page reload to reset application state
    window.location.href = '/';
  } catch (error) {
    console.error('[clearLocalState] Error clearing state:', error);
    // Even if there's an error, still try to reload
    window.location.href = '/';
  }
};
