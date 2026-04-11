import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLoader } from '../components/PageSkeleton';
import { toast } from 'sonner';

/**
 * Handle Supabase OAuth callback and ensure session is hydrated before redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const handledOAuthErrorRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = params.get('error') ?? hashParams.get('error');
    const oauthDesc = params.get('error_description') ?? hashParams.get('error_description');
    if (oauthError && !handledOAuthErrorRef.current) {
      handledOAuthErrorRef.current = true;
      const msg = oauthDesc
        ? decodeURIComponent(oauthDesc.replace(/\+/g, ' '))
        : 'Sign-in was cancelled or failed.';
      toast.error(msg);
      navigate('/auth', { replace: true });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/auth', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AppLoader />;
}
