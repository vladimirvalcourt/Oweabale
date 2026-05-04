import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { invokeAdminAction } from '@/features/admin/shared/adminActionClient';
import { cn } from '@/lib/utils';

type Governance = {
  roles: Array<{ id: string; key: string; label: string }>;
  permissions: Array<{ id: string; key: string; label: string }>;
  role_permissions: Array<{ role_id: string; permission_id: string }>;
  user_roles: Array<{ user_id: string; role_id: string; created_at: string; profile: { email: string | null; is_admin: boolean } | null }>;
  invites: Array<{ id: string; email: string; role_id: string; status: string; expires_at: string; created_at: string }>;
};

export default function AdminGovernancePage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [target, setTarget] = useState('');
  const [roleKey, setRoleKey] = useState('support_agent');

  const snapshotQuery = useQuery({
    queryKey: ['admin', 'governance'],
    queryFn: () => invokeAdminAction<Governance>({ action: 'governance_snapshot' }),
  });

  const mutate = useMutation({
    mutationFn: (action: string) => invokeAdminAction<{ message: string; token?: string }>({ action, email, target, roleKey }),
    onSuccess: async (data) => {
      toast.success(data.token ? `${data.message} Token copied to console for local handoff.` : data.message);
      if (data.token) console.warn('[admin-invite-token]', data.token);
      await qc.invalidateQueries({ queryKey: ['admin', 'governance'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = snapshotQuery.data;
  const roleById = Object.fromEntries((data?.roles ?? []).map((role) => [role.id, role]));
  const permissionById = Object.fromEntries((data?.permissions ?? []).map((permission) => [permission.id, permission]));

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Governance"
        title="Admin governance"
        description="Review roles, permission coverage, invites, and assignment changes. Role mutation is restricted to super admins through admin-actions."
        metrics={[
          { label: 'Roles', value: data?.roles.length ?? '—' },
          { label: 'Permissions', value: data?.permissions.length ?? '—' },
          { label: 'Assignments', value: data?.user_roles.length ?? '—' },
          { label: 'Invites', value: data?.invites.length ?? '—' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel title="Roles and permissions" description="This is the permission audit view operators should use before asking for access changes.">
          {snapshotQuery.isLoading ? <p className="p-4 text-xs text-content-muted">Loading governance...</p> : null}
          {!snapshotQuery.isLoading && !data ? <AdminEmptyState icon={ShieldCheck} title="No governance snapshot" description="RBAC data could not be loaded." /> : null}
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {(data?.roles ?? []).map((role) => {
              const permissionIds = new Set((data?.role_permissions ?? []).filter((rp) => rp.role_id === role.id).map((rp) => rp.permission_id));
              return (
                <div key={role.id} className="border border-surface-border bg-surface-base p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-content-primary">{role.label}</p>
                    <AdminStatusBadge tone={role.key === 'super_admin' ? 'danger' : 'default'}>{role.key}</AdminStatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(data?.permissions ?? []).filter((permission) => permissionIds.has(permission.id)).map((permission) => (
                      <span key={permission.id} className="border border-surface-border px-1.5 py-0.5 text-[10px] text-content-tertiary">{permission.key}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AdminPanel>

        <AdminPanel title="Invite and assign" description="Invite creation stores a hashed token; no email is sent until a mailer is connected.">
          <div className="space-y-4 p-4">
            <input value={email} onChange={(event) => setEmail(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="admin@example.com for invite" />
            <input value={target} onChange={(event) => setTarget(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="Existing admin email or UUID for role mutation" />
            <select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} className={cn(adminInputClass, 'w-full')}>
              {(data?.roles ?? []).map((role) => <option key={role.key} value={role.key}>{role.label}</option>)}
            </select>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" className={adminButtonClass} disabled={!email || mutate.isPending} onClick={() => mutate.mutate('admin_invite_create')}>Invite</button>
              <button type="button" className={adminButtonClass} disabled={!target || mutate.isPending} onClick={() => mutate.mutate('admin_role_assign')}>Assign</button>
              <button type="button" className={adminDangerButtonClass} disabled={!target || mutate.isPending} onClick={() => mutate.mutate('admin_role_remove')}>Remove</button>
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminPanel title="Current assignments" description="MFA status is not available from the current schema, so this view shows role state and legacy admin flag.">
          <div className="divide-y divide-surface-border">
            {(data?.user_roles ?? []).map((row) => (
              <div key={`${row.user_id}-${row.role_id}`} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div>
                  <p className="font-semibold text-content-primary">{row.profile?.email ?? row.user_id}</p>
                  <p className="text-content-muted">MFA status unavailable · legacy admin {row.profile?.is_admin ? 'yes' : 'no'}</p>
                </div>
                <AdminStatusBadge>{roleById[row.role_id]?.key ?? row.role_id}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Invites" description="Pending admin invitations and their expiration window.">
          <div className="divide-y divide-surface-border">
            {(data?.invites ?? []).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div>
                  <p className="font-semibold text-content-primary">{invite.email}</p>
                  <p className="text-content-muted">Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                </div>
                <AdminStatusBadge tone={invite.status === 'pending' ? 'warn' : 'default'}>{roleById[invite.role_id]?.key ?? invite.status}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Permission audit" description="Flat list for quick diffing during incident review.">
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.permissions ?? []).map((permission) => (
            <AdminMetric key={permission.id} label={permission.key} value={permissionById[permission.id]?.label ?? permission.label} />
          ))}
        </div>
        <div className="border-t border-surface-border p-4 text-xs text-content-muted">
          <KeyRound className="mb-2 h-4 w-4" />
          Role changes are intentionally rate-limited and self-role changes are rejected server-side.
        </div>
      </AdminPanel>
    </section>
  );
}
