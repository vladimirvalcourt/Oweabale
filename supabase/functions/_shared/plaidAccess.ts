import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

export async function hasPaidFullSuiteAccess(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_admin === true) return true;
  return profile?.subscription_tier === 'full_suite';
}
