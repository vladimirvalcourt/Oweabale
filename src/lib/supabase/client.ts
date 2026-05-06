import { createBrowserClient } from '@supabase/ssr'
import { supabasePublicKey, supabasePublicUrl } from './config'

let browserClient: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  browserClient ??= createBrowserClient(supabasePublicUrl, supabasePublicKey)
  return browserClient
}
