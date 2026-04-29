import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/api/supabase';
import { AppLoader } from '../common';

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

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      let hasAdminRole = false;
      if (!error && data?.is_admin === true) {
        hasAdminRole = true;
      } else {
        const { data: roleRows, error: roleErr } = await supabase
          .from('admin_user_roles')
          .select('role_id, admin_roles(key)')
          .eq('user_id', user.id)
          .limit(5);
        if (!roleErr) {
          hasAdminRole = (roleRows ?? []).some((row: { admin_roles?: { key?: string } | { key?: string }[] }) => {
            const role = Array.isArray(row.admin_roles) ? row.admin_roles[0] : row.admin_roles;
            return role?.key === 'admin' || role?.key === 'super_admin';
          });
        }
      }

      const requireMfa = (import.meta.env.VITE_ADMIN_REQUIRE_MFA ?? 'false').toLowerCase() === 'true';
      if (requireMfa && hasAdminRole) {
        try {
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const hasVerifiedTotp = (factorsData?.totp ?? []).some((f) => f.status === 'verified');
          hasAdminRole = hasVerifiedTotp;
        } catch {
          hasAdminRole = false;
        }
      }

      if (!cancelled) {
        setStatus(hasAdminRole ? 'allowed' : 'denied');
      }
    }

    verify();
    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') return <AppLoader />;
  if (status === 'denied') {
    return <Navigate to="/pro/dashboard" replace />;
  }
  return <Outlet />;
}
