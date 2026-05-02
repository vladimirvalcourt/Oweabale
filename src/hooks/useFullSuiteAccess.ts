import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/api/supabase';
import { hasFullSuiteAccess } from '@/app/constants/fullSuiteAccess';

type FullSuiteAccessState = {
  isLoading: boolean;
  hasFullSuite: boolean;
  isAdmin: boolean;
};

export function useFullSuiteAccess() {
  const [state, setState] = useState<FullSuiteAccessState>({
    isLoading: true,
    hasFullSuite: false,
    isAdmin: false,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ isLoading: false, hasFullSuite: false, isAdmin: false });
        return;
      }
    } catch (authError) {
      console.error('[useFullSuiteAccess] Auth error:', authError);
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

    const profile = profileRes.data;
    const isAdmin = profile?.is_admin === true;

    setState({
      isLoading: false,
      isAdmin,
      hasFullSuite: hasFullSuiteAccess({
        isAdmin,
        entitlement: entitlementRes.data,
        subscription: subscriptionRes.data,
        profile,
      }),
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
