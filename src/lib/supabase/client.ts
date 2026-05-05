import { createBrowserClient } from '@supabase/ssr'
import { supabasePublicKey, supabasePublicUrl } from './config'

export function createClient() {
  return createBrowserClient(supabasePublicUrl, supabasePublicKey)
}
