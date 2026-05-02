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

    console.log('[clearLocalState] All local state cleared successfully');

    // Force page reload to reset application state
    window.location.href = '/';
  } catch (error) {
    console.error('[clearLocalState] Error clearing state:', error);
    // Even if there's an error, still try to reload
    window.location.href = '/';
  }
};
