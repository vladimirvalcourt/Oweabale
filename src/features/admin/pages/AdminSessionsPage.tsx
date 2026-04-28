import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Monitor, Smartphone } from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { useAdminPermissions } from '../shared';
import { AdminPageHeader, AdminPanel, AdminStatusBadge, adminDangerButtonClass } from '../shared/AdminUI';

type SessionUser = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
};

type UserSessionRow = {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  created_at: string;
  revoked_at: string | null;
};

function parseDeviceType(ua: string | null): 'Mobile' | 'Desktop' | 'Unknown' {
  if (!ua) return 'Unknown';
  if (/android|iphone|ipad|mobile/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (/edg\//i.test(ua)) return 'Edge'; // edg/ matches "Edg/xx.x" in Edge UA strings
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Unknown';
}

function parseOS(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/ios|iphone|ipad/i.test(ua)) return 'iOS';
  return 'Unknown';
}

export default function AdminSessionsPage() {
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
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

  const { data: sessionRows = [] } = useQuery({
    queryKey: ['admin', 'sessions', 'device-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('id, user_id, ip_address, user_agent, device_type, browser, os, created_at, revoked_at')
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) return [] as UserSessionRow[];
      return (data ?? []) as UserSessionRow[];
    },
  });

  const sessionsByUser = sessionRows.reduce<Record<string, UserSessionRow[]>>((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push(row);
    return acc;
  }, {});

  const canManageSessions = hasPermission('users.manage');
  const activeSessionCount = sessionRows.filter((row) => !row.revoked_at).length;
  const usersWithSessions = Object.keys(sessionsByUser).length;

  async function revokeSessions(userId: string) {
    if (!canManageSessions) return;
    if (!window.confirm('Revoke all sessions for this user? They will be signed out immediately.')) return;
    setRevokingUserId(userId);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'revoke_sessions', targetUserId: userId, revokeScope: 'global' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // Also mark rows in user_sessions as revoked
      await supabase
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null);
    }
    setRevokingUserId(null);
    await qc.invalidateQueries({ queryKey: ['admin', 'sessions'] });
  }

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Users"
        title="Security sessions"
        description="Inspect user sign-in context, device hints, and revoke sessions through the existing admin action."
        metrics={[
          { label: 'Users loaded', value: users.length },
          { label: 'Active sessions', value: activeSessionCount },
          { label: 'Users with devices', value: usersWithSessions },
          { label: 'Permission', value: canManageSessions ? 'Can revoke' : 'Read only', tone: canManageSessions ? 'good' : 'warn' },
        ]}
      />
      {!canManageSessions ? <p className="mb-4 text-xs text-amber-700 dark:text-amber-200">You do not have permission to revoke sessions.</p> : null}
      <AdminPanel title="Session inventory" description="Device data comes from the app-tracked user_sessions table and may differ from provider-side auth sessions.">
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading sessions...</p> : null}
        {error ? <p className="p-4 text-xs text-rose-700 dark:text-rose-200">Failed to load user sessions.</p> : null}
        {!isLoading && !error && users.length === 0 ? <p className="p-4 text-xs text-content-muted">No sessions found.</p> : null}
        {!isLoading && !error && users.length > 0 ? (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Last Sign-in</th>
                  <th className="px-3 py-2 font-medium">IP Address</th>
                  <th className="px-3 py-2 font-medium">Device</th>
                  <th className="px-3 py-2 font-medium">Browser / OS</th>
                  <th className="px-3 py-2 font-medium">Sessions</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const userSessions = sessionsByUser[u.id] ?? [];
                  const latestSession = userSessions[0];
                  const deviceType = latestSession?.device_type ?? parseDeviceType(latestSession?.user_agent ?? null);
                  const browser = latestSession?.browser ?? parseBrowser(latestSession?.user_agent ?? null);
                  const os = latestSession?.os ?? parseOS(latestSession?.user_agent ?? null);
                  const isExpanded = expandedUserId === u.id;

                  return (
                    <>
                      <tr key={u.id} className="border-t border-surface-border/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                              className="text-content-tertiary hover:text-content-secondary"
                              aria-label={isExpanded ? 'Collapse history' : 'Expand history'}
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                            <Link
                              to={`/admin/user/${u.id}`}
                              className="text-content-secondary hover:text-brand-cta hover:underline"
                            >
                              {u.email ?? u.id}
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-content-secondary">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-3 py-2 font-mono text-content-tertiary">
                          {latestSession?.ip_address ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-content-secondary">
                          <span className="inline-flex items-center gap-1">
                            {deviceType === 'Mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {deviceType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-content-tertiary">
                          {browser !== 'Unknown' ? browser : '—'} / {os !== 'Unknown' ? os : '—'}
                        </td>
                        <td className="px-3 py-2 text-content-secondary">{userSessions.length}</td>
                        <td className="px-3 py-2 text-content-tertiary">
                          <AdminStatusBadge tone={u.banned_until ? 'danger' : 'good'}>{u.banned_until ? 'Banned' : 'Active'}</AdminStatusBadge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={!canManageSessions || revokingUserId === u.id}
                            onClick={() => void revokeSessions(u.id)}
                            className={adminDangerButtonClass}
                          >
                            {revokingUserId === u.id ? 'Revoking...' : 'Revoke sessions'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && userSessions.length > 0 ? (
                        <tr key={`${u.id}-history`} className="border-t border-surface-border/30 bg-surface-base/50">
                          <td colSpan={8} className="px-4 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                              Session history (last {Math.min(userSessions.length, 5)})
                            </p>
                            <div className="space-y-1.5">
                              {userSessions.slice(0, 5).map((sess) => (
                                <div key={sess.id} className="flex items-center gap-4 border border-surface-border px-3 py-1.5 text-[11px]">
                                  <span className="text-content-muted">{new Date(sess.created_at).toLocaleString()}</span>
                                  <span className="font-mono text-content-tertiary">{sess.ip_address ?? '—'}</span>
                                  <span className="text-content-secondary">
                                    {sess.browser ?? parseBrowser(sess.user_agent)} / {sess.os ?? parseOS(sess.user_agent)}
                                  </span>
                                  {sess.revoked_at ? (
                                    <span className="text-rose-700 dark:text-rose-200">Revoked</span>
                                  ) : (
                                    <span className="text-emerald-400">Active</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanel>
    </section>
  );
}
