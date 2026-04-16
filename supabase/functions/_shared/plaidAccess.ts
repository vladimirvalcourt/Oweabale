import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type AdminClient = ReturnType<typeof createClient>;

export async function hasPaidFullSuiteAccess(
  supabaseAdmin: AdminClient,
  userId: string,
): Promise<boolean> {
  const [entRes, subRes] = await Promise.all([
    supabaseAdmin
      .from('entitlements')
      .select('status, ends_at')
      .eq('user_id', userId)
      .eq('feature_key', 'full_suite')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('billing_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ent = entRes.data;
  const sub = subRes.data;

  const entitlementActive =
    ent?.status === 'active' &&
    (!ent.ends_at || Number.isNaN(new Date(ent.ends_at).getTime()) || new Date(ent.ends_at).getTime() >= Date.now());
  const subscriptionActive = sub?.status === 'active' || sub?.status === 'trialing';

  return entitlementActive || subscriptionActive;
}

