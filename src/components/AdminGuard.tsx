import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLoader } from './PageSkeleton';

/**
 * AdminGuard — verifies is_admin directly from Supabase on every mount.
 * Does NOT rely on sessionStorage or the Zustand store — both are
 * client-controlled and can be tampered with. The Supabase query is
 * protected by RLS so a user can only read their own profile row.
 * Privilege escalation via sessionStorage manipulation is impossible.
 */
export default function AdminGuard() {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setStatus('denied'); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!cancelled) {
        setStatus(!error && data?.is_admin === true ? 'allowed' : 'denied');
      }
    }

    verify();
    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') return <AppLoader />;
  if (status === 'denied') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
