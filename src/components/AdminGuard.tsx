import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AppLoader } from './PageSkeleton';

/**
 * AdminGuard — verifies is_admin + primary admin email on every mount.
 * Server-side admin-actions also enforces ADMIN_ALLOWED_EMAIL (defense in depth).
 */
export default function AdminGuard() {
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setStatus('denied'); return; }

      const allowed = import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase();
      const sessionEmail = user.email?.trim().toLowerCase();
      if (!allowed || !sessionEmail || sessionEmail !== allowed) {
        if (!cancelled) setStatus('denied');
        return;
      }

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
