import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

type AdminRolesPayload = {
  roles: { id: string; key: string; label: string }[];
  permissions: { id: string; key: string; label: string }[];
  role_permissions: { role_id: string; permission_id: string }[];
  user_roles: { user_id: string; role_id: string }[];
};

export function useAdminPermissions() {
  const currentUserQuery = useQuery({
    queryKey: ['admin', 'rbac', 'current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 60_000,
  });

  const isAdminProfileQuery = useQuery({
    queryKey: ['admin', 'rbac', 'is-admin-profile', currentUserQuery.data],
    enabled: !!currentUserQuery.data,
    queryFn: async () => {
      const userId = currentUserQuery.data;
      if (!userId) return false;
      const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
      if (error) return false;
      return data?.is_admin === true;
    },
    staleTime: 60_000,
  });

  const query = useQuery({
    queryKey: ['admin', 'rbac', 'permissions'],
    queryFn: async (): Promise<AdminRolesPayload> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { roles: [], permissions: [], role_permissions: [], user_roles: [] };
      }
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'admin_roles_permissions' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return (data ?? { roles: [], permissions: [], role_permissions: [], user_roles: [] }) as AdminRolesPayload;
    },
    staleTime: 60_000,
  });

  const contextQuery = useQuery({
    queryKey: ['admin', 'rbac', 'context'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { is_admin: false, is_super_admin: false, roles: [], permissions: [] } as {
          is_admin: boolean;
          is_super_admin: boolean;
          roles: string[];
          permissions: string[];
        };
      }
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'rbac_context' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return (data ?? { is_admin: false, is_super_admin: false, roles: [], permissions: [] }) as {
        is_admin: boolean;
        is_super_admin: boolean;
        roles: string[];
        permissions: string[];
      };
    },
    staleTime: 30_000,
  });

  const permissionSet = useMemo(() => {
    const payload = query.data;
    const userId = currentUserQuery.data;
    if (!payload || !userId) return new Set<string>();
    const roleIds = new Set(payload.user_roles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id));
    const permissionIds = new Set(payload.role_permissions.filter((rp) => roleIds.has(rp.role_id)).map((rp) => rp.permission_id));
    return new Set(payload.permissions.filter((p) => permissionIds.has(p.id)).map((p) => p.key));
  }, [query.data, currentUserQuery.data]);

  const contextPermissionSet = useMemo(
    () => new Set(contextQuery.data?.permissions ?? []),
    [contextQuery.data?.permissions],
  );

  const hasPermission = (permissionKey: string) => {
    if (contextQuery.data?.is_super_admin) return true;
    if (contextPermissionSet.has(permissionKey)) return true;
    return permissionSet.has(permissionKey);
  };

  return {
    ...query,
    permissionSet,
    hasPermission,
    isAdminProfile: isAdminProfileQuery.data === true,
    isSuperAdmin: contextQuery.data?.is_super_admin === true,
    contextPermissions: contextPermissionSet,
    isLoading: query.isLoading || isAdminProfileQuery.isLoading || contextQuery.isLoading,
  };
}
