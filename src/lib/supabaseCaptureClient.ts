import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Anon Supabase client scoped to a mobile capture session. Sends `x-session-token`
 * on every REST request so RLS can match `document_capture_sessions.token` without
 * relying on USING(true). Uses in-memory auth storage so the desktop session does
 * not override anon RLS on shared browsers.
 */
export function createCaptureSupabaseClient(sessionToken: string): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('[capture] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
    global: {
      headers: {
        'x-session-token': sessionToken,
      },
    },
  });
}
