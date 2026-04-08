import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { AppLoader } from '../components/PageSkeleton';

/**
 * Handle Supabase OAuth callback. Prefetches user data before navigating so
 * the dashboard renders with data instead of showing a loading spinner.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { fetchData } = useStore();

  useEffect(() => {
    const prefetchAndNavigate = (userId: string) => {
      // Fire fetchData immediately — don't await so navigation is not blocked.
      // By the time the dashboard renders, data is already in flight or done.
      fetchData(userId);
      navigate('/dashboard', { replace: true });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        prefetchAndNavigate(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        prefetchAndNavigate(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        navigate('/auth', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchData]);

  return <AppLoader />;
}
