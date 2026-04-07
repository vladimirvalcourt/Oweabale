import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLoader } from '../components/PageSkeleton';

/**
 * Handle Supabase OAuth callback and ensure session is hydration before redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/auth', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AppLoader />;
}
