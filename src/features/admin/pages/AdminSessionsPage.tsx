import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAdminPermissions } from '../shared/useAdminPermissions';

type SessionUser = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

export default function AdminSessionsPage() {
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { hasPermission } = useAdminPermissions();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'sessions', 'users'],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return [];
      const { data, error: invokeError } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'list' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (invokeError) throw invokeError;
      return ((data?.users ?? []) as SessionUser[]).slice(0, 150);
    },
  });

  const canManageSessions = hasPermission('users.manage');

  async function revokeSessions(userId: string) {
    if (!canManageSessions) return;
    setRevokingUserId(userId);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'revoke_sessions', targetUserId: userId, revokeScope: 'global' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    setRevokingUserId(null);
    await qc.invalidateQueries({ queryKey: ['admin', 'sessions', 'users'] });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-lg font-semibold text-content-primary">Session Management</h1>
      {!canManageSessions ? <p className="mb-4 text-xs text-amber-300">You do not have permission to revoke sessions.</p> : null}
      <div className="rounded-xl border border-surface-border bg-surface-raised">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading sessions...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-300">Failed to load user sessions.</p> : null}
        {!isLoading && !error && users.length === 0 ? <p className="p-4 text-xs text-content-muted">No sessions found.</p> : null}
        {!isLoading && !error && users.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Last Sign-in</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-surface-border/50">
                    <td className="px-3 py-2 text-content-secondary">{u.email ?? u.id}</td>
                    <td className="px-3 py-2 text-content-secondary">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-3 py-2 text-content-tertiary">{u.banned_until ? 'Banned' : 'Active'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!canManageSessions || revokingUserId === u.id}
                        onClick={() => void revokeSessions(u.id)}
                        className="rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] text-rose-300 disabled:opacity-40"
                      >
                        {revokingUserId === u.id ? 'Revoking...' : 'Revoke sessions'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
