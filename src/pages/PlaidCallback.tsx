import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLoader } from '../components/PageSkeleton';
import { hasFullSuiteAccess } from '../lib/fullSuiteAccess';
import { supabase } from '../lib/supabaseClient';

/**
 * OAuth return landing page for Plaid.
 * We preserve Plaid query params and forward users to Settings Integrations,
 * where the Plaid controller resumes Link with `receivedRedirectUri`.
 */
export default function PlaidCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const route = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      const [profileRes, entitlementRes, subscriptionRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_admin, plan, trial_ends_at, trial_expired')
          .eq('id', user.id)
          .maybeSingle(),
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

      if (!mounted) return;
      const profile = profileRes.data;
      const hasFullSuite = hasFullSuiteAccess({
        isAdmin: profile?.is_admin === true,
        entitlement: entitlementRes.data,
        subscription: subscriptionRes.data,
        profile,
      });

      if (!hasFullSuite) {
        navigate('/pricing', { replace: true });
        return;
      }

      const params = new URLSearchParams(location.search);
      params.set('tab', 'integrations');
      navigate(`/settings?${params.toString()}`, { replace: true });
    };

    void route();
    return () => {
      mounted = false;
    };
  }, [location.search, navigate]);

  return <AppLoader message="Finishing bank link…" />;
}
