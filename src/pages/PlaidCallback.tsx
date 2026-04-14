import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLoader } from '../components/PageSkeleton';

/**
 * OAuth return landing page for Plaid.
 * We preserve Plaid query params and forward users to Settings Integrations,
 * where the Plaid controller resumes Link with `receivedRedirectUri`.
 */
export default function PlaidCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set('tab', 'integrations');
    navigate(`/settings?${params.toString()}`, { replace: true });
  }, [location.search, navigate]);

  return <AppLoader />;
}
