import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, subscription_tier')
        .eq('id', user.id)
        .maybeSingle();

      const isAdmin = profile?.is_admin === true;
      const hasFullSuite = isAdmin || profile?.subscription_tier === 'full_suite';

      setState({ isLoading: false, isAdmin, hasFullSuite });
    } catch {
      setState({ isLoading: false, hasFullSuite: false, isAdmin: false });
    }
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
