import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type FullSuiteAccessState = {
  isLoading: boolean;
  hasFullSuite: boolean;
  isAdmin: boolean;
};

function isEntitlementActive(row: { status: string; ends_at: string | null } | null | undefined) {
  if (!row || row.status !== 'active') return false;
  if (!row.ends_at) return true;
  const end = new Date(row.ends_at).getTime();
  if (Number.isNaN(end)) return true;
  return end >= Date.now();
}

function isSubscriptionLive(row: { status: string } | null | undefined) {
  return row?.status === 'active' || row?.status === 'trialing';
}

export function useFullSuiteAccess() {
  const [state, setState] = useState<FullSuiteAccessState>({
    isLoading: true,
    hasFullSuite: false,
    isAdmin: false,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState({ isLoading: false, hasFullSuite: false, isAdmin: false });
      return;
    }

    const [profileRes, entitlementRes, subscriptionRes] = await Promise.all([
      supabase.from('profiles').select('is_admin, plan, trial_ends_at, trial_expired').eq('id', user.id).maybeSingle(),
      supabase
        .from('entitlements')
        .select('status, ends_at')
        .eq('user_id', user.id)
        .eq('feature_key', 'full_suite')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('billing_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const isAdmin = profileRes.data?.is_admin === true;
    const hasEntitlement = isEntitlementActive(entitlementRes.data);
    const hasLiveSubscription = isSubscriptionLive(subscriptionRes.data);
    
    // Check if user is on active trial
    const profile = profileRes.data;
    const isOnTrial = 
      profile?.plan === 'trial' && 
      !profile?.trial_expired && 
      profile?.trial_ends_at && 
      new Date(profile.trial_ends_at).getTime() > Date.now();

    setState({
      isLoading: false,
      isAdmin,
      hasFullSuite: isAdmin || hasEntitlement || hasLiveSubscription || isOnTrial,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await refresh();
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
