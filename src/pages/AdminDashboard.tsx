import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import {
  AlertTriangle,
  ArrowLeft,
  LifeBuoy,
  RefreshCw,
  Search,
  Shield,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrivacyScreenWhenHidden } from '../components/PrivacyScreenWhenHidden';
import { toast } from 'sonner';
import { track } from '../lib/analytics';

interface EnrichedUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
}

interface ProfileRow {
  id: string;
  email: string | null;
  is_admin: boolean;
  is_banned: boolean;
  has_completed_onboarding: boolean;
  created_at: string | null;
}

interface PlaidHealthStats {
  total_items: number;
  distinct_users: number;
  items_with_sync_error: number;
  items_needing_relink: number;
  items_never_synced: number;
  items_stale_24h: number;
}

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Normal' | 'Urgent';
  status: string;
  created_at: string;
  user_id: string;
  userEmail?: string;
}

const PRIMARY_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();

export default function AdminDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPlaidEnabled, setIsPlaidEnabled] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);

  const [plaidStats, setPlaidStats] = useState<PlaidHealthStats | null>(null);

  const invokeAdminActions = useCallback(async (body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { data: null, error: { message: 'Not signed in' } as { message: string } };
    }
    return supabase.functions.invoke('admin-actions', {
      body,
      headers: { Authorization: `Bearer ${token}` },
    });
  }, []);

  const loadAll = useCallback(async () => {
    setIsRefreshing(true);

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    if (settings) {
      setBroadcastMsg(settings.broadcast_message || '');
      setIsMaintenance(settings.maintenance_mode || false);
      setIsPlaidEnabled(settings.plaid_enabled !== false);
    }

    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, is_admin, is_banned, has_completed_onboarding, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (profileErr) {
      toast.error(`Failed to load users: ${profileErr.message}`);
    } else if (profileData) {
      setProfiles(profileData as ProfileRow[]);
    }

    const { data: enriched, error: enrichedErr } = await invokeAdminActions({ action: 'list' });
    if (enrichedErr) {
      toast.error(`Auth enrichment failed: ${enrichedErr.message}`);
    } else if (enriched?.users) {
      setEnrichedUsers(enriched.users as EnrichedUser[]);
    }

    const { data: plaidData, error: plaidStatsErr } = await invokeAdminActions({ action: 'plaid_stats' });
    if (plaidStatsErr) {
      toast.error(`Plaid stats failed: ${plaidStatsErr.message}`);
    } else if (plaidData?.plaid_stats) {
      setPlaidStats(plaidData.plaid_stats as PlaidHealthStats);
    }

    setTicketsLoading(true);
    const { data: tickets, error: ticketErr } = await supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['Open', 'In Progress'])
      .order('created_at', { ascending: false });
    setTicketsLoading(false);

    if (ticketErr) {
      toast.error(`Tickets load failed: ${ticketErr.message}`);
    } else if (tickets) {
      const profileMap: Record<string, string> = {};
      profileData?.forEach((p) => {
        if (p.email) profileMap[p.id] = p.email;
      });
      setOpenTickets(
        (tickets as SupportTicket[]).map((t) => ({
          ...t,
          userEmail: profileMap[t.user_id] || t.user_id.slice(0, 8),
        })),
      );
    }

    setIsRefreshing(false);
  }, [invokeAdminActions]);

  useEffect(() => {
    void loadAll();

    const ticketSub = supabase
      .channel('admin-tickets-lean')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        void loadAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketSub);
    };
  }, [loadAll]);

  const getEnrichedProfile = useCallback(
    (profile: ProfileRow) => {
      const auth = enrichedUsers.find((u) => u.id === profile.id);
      return {
        ...profile,
        lastLogin: auth?.last_sign_in_at ? new Date(auth.last_sign_in_at).toLocaleDateString() : 'Never',
        joinedAt: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—',
      };
    },
    [enrichedUsers],
  );

  const filteredProfiles = useMemo(() => {
    if (!userSearch.trim()) return profiles;
    const q = userSearch.toLowerCase();
    return profiles.filter((p) => (p.email || '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [profiles, userSearch]);

  const metricData = useMemo(() => {
    const adminCount = profiles.filter((p) => p.is_admin).length;
    const activeUsers = profiles.filter((p) => !p.is_banned).length;
    return {
      totalUsers: profiles.length,
      activeUsers,
      admins: adminCount,
      openTickets: openTickets.length,
      plaidItems: plaidStats?.total_items ?? null,
      plaidErrors: plaidStats?.items_with_sync_error ?? null,
    };
  }, [profiles, openTickets.length, plaidStats]);

  const handleAdminAction = async (action: 'ban' | 'unban' | 'delete', targetUserId: string) => {
    toast.loading(`Executing ${action}...`, { id: 'admin-action' });
    const { data, error } = await invokeAdminActions({ action, targetUserId });
    if (error) {
      toast.error(`Admin action failed: ${error.message}`, { id: 'admin-action' });
      return;
    }
    toast.success(data?.message || `Successfully executed ${action}.`, { id: 'admin-action' });
    void loadAll();
  };

  const handleDemoteAdmin = async (userId: string) => {
    const { data, error } = await invokeAdminActions({ action: 'set_admin', targetUserId: userId, isAdmin: false });
    if (error) {
      toast.error(`Failed to remove admin status: ${error.message}`);
      return;
    }
    toast.success(typeof data?.message === 'string' ? data.message : 'Admin access removed.');
    track('admin_role_changed', { granted: false });
    void loadAll();
  };

  const resolveTicket = async (ticketId: string) => {
    setResolvingTicketId(ticketId);
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'Resolved', updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    setResolvingTicketId(null);
    if (error) {
      toast.error('Failed to resolve ticket.');
      return;
    }
    toast.success('Ticket marked as resolved.');
    void loadAll();
  };

  const toggleMaintenance = async () => {
    const newValue = !isMaintenance;
    const { error } = await supabase
      .from('platform_settings')
      .update({ maintenance_mode: newValue })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    if (error) {
      toast.error('Failed to update maintenance mode.');
      return;
    }
    setIsMaintenance(newValue);
    toast.success(newValue ? 'Maintenance enabled.' : 'Maintenance disabled.');
  };

  const togglePlaid = async () => {
    const newValue = !isPlaidEnabled;
    const { error } = await supabase
      .from('platform_settings')
      .update({ plaid_enabled: newValue })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    if (error) {
      toast.error('Failed to update bank syncing.');
      return;
    }
    setIsPlaidEnabled(newValue);
    toast.success(newValue ? 'Bank syncing enabled.' : 'Bank syncing disabled.');
  };

  const handleSendBroadcast = async () => {
    setIsSavingBroadcast(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({ broadcast_message: broadcastMsg.trim() === '' ? null : broadcastMsg })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    setIsSavingBroadcast(false);
    if (error) {
      toast.error('Failed to update broadcast message.');
      return;
    }
    toast.success(broadcastMsg.trim() ? 'Broadcast updated.' : 'Broadcast cleared.');
  };

  const priorityClass = (priority: string) => {
    if (priority === 'Urgent') return 'text-rose-400 bg-rose-500/10';
    if (priority === 'Normal') return 'text-amber-400 bg-amber-500/10';
    return 'text-content-tertiary bg-white/5';
  };

  return (
    <div className="min-h-screen bg-surface-base text-content-secondary p-4 sm:p-8">
      <PrivacyScreenWhenHidden />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-surface-border pb-5">
          <div>
            <h1 className="text-xl text-content-primary font-bold">Admin Dashboard</h1>
            <p className="text-xs text-content-tertiary mt-1">Lean operator view: users, support, and platform controls</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border border-surface-border text-xs text-content-secondary hover:text-content-primary hover:bg-surface-raised disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <TransitionLink to="/" className="inline-flex items-center gap-1 text-xs text-content-tertiary hover:text-content-primary">
              <ArrowLeft className="w-3 h-3" /> Back
            </TransitionLink>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Users</p><p className="text-xl text-content-primary font-bold">{metricData.totalUsers}</p></div>
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Active</p><p className="text-xl text-emerald-400 font-bold">{metricData.activeUsers}</p></div>
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Admins</p><p className="text-xl text-indigo-400 font-bold">{metricData.admins}</p></div>
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Open Tickets</p><p className="text-xl text-amber-400 font-bold">{metricData.openTickets}</p></div>
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Plaid Items</p><p className="text-xl text-content-primary font-bold">{metricData.plaidItems ?? '—'}</p></div>
          <div className="border border-surface-border rounded-sm p-3 bg-surface-raised"><p className="text-[10px] text-content-tertiary uppercase">Plaid Errors</p><p className={`text-xl font-bold ${(metricData.plaidErrors ?? 0) > 0 ? 'text-rose-400' : 'text-content-primary'}`}>{metricData.plaidErrors ?? '—'}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-surface-border rounded-sm bg-surface-raised p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2"><Users className="w-4 h-4" /> Users</h2>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search email or id"
                  className="pl-7 pr-2 py-1.5 text-xs bg-surface-base border border-surface-border rounded-sm focus-app"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-content-tertiary border-b border-surface-border">
                    <th className="py-2 text-left">Account</th>
                    <th className="py-2 text-left">Joined</th>
                    <th className="py-2 text-left">Last Login</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((user) => {
                    const enriched = getEnrichedProfile(user);
                    return (
                      <tr key={user.id} className="border-b border-surface-border/60">
                        <td className="py-2 pr-2">
                          <span className={user.is_admin ? 'text-indigo-400 font-bold' : ''}>{user.email || user.id.slice(0, 12)}</span>
                        </td>
                        <td className="py-2 text-content-tertiary">{enriched.joinedAt}</td>
                        <td className="py-2 text-content-tertiary">{enriched.lastLogin}</td>
                        <td className="py-2">
                          {user.is_banned ? <span className="text-rose-400">Banned</span> : <span className="text-emerald-400">Active</span>}
                        </td>
                        <td className="py-2 text-right space-x-1">
                          {user.is_admin && (
                            <button
                              type="button"
                              onClick={() => void handleDemoteAdmin(user.id)}
                              disabled={!PRIMARY_ADMIN_EMAIL || (user.email?.trim().toLowerCase() ?? '') === PRIMARY_ADMIN_EMAIL}
                              className="px-2 py-1 rounded-sm text-[11px] bg-indigo-500/15 text-indigo-300 disabled:opacity-40"
                            >
                              Demote
                            </button>
                          )}
                          {user.is_banned ? (
                            <button type="button" onClick={() => void handleAdminAction('unban', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-emerald-500/15 text-emerald-300">Unban</button>
                          ) : (
                            <button type="button" onClick={() => void handleAdminAction('ban', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-rose-500/15 text-rose-300">Ban</button>
                          )}
                          <button type="button" onClick={() => void handleAdminAction('delete', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-red-500/20 text-red-300">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-content-muted">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
              <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4"><Shield className="w-4 h-4" /> Platform Controls</h2>
              <div className="space-y-3">
                <button type="button" onClick={toggleMaintenance} className="w-full text-left px-3 py-2 rounded-sm bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {isMaintenance ? 'Disable maintenance mode' : 'Enable maintenance mode'}
                </button>
                <button type="button" onClick={togglePlaid} className="w-full text-left px-3 py-2 rounded-sm bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {isPlaidEnabled ? 'Disable bank syncing' : 'Enable bank syncing'}
                </button>
                <textarea
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  rows={3}
                  placeholder="Broadcast message shown in app"
                  className="w-full bg-surface-base border border-surface-border rounded-sm p-2 text-xs focus-app"
                />
                <button
                  type="button"
                  onClick={handleSendBroadcast}
                  disabled={isSavingBroadcast}
                  className="w-full px-3 py-2 rounded-sm bg-amber-500/10 text-amber-300 border border-amber-500/20 disabled:opacity-50"
                >
                  {isSavingBroadcast ? 'Saving...' : 'Save broadcast'}
                </button>
              </div>
            </div>

            <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
              <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4"><LifeBuoy className="w-4 h-4" /> Open Support</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {ticketsLoading && <p className="text-xs text-content-muted">Loading tickets...</p>}
                {!ticketsLoading && openTickets.length === 0 && <p className="text-xs text-content-muted">No open tickets.</p>}
                {openTickets.map((ticket) => (
                  <div key={ticket.id} className="border border-surface-border rounded-sm p-2 bg-surface-base">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-content-primary font-semibold truncate">{ticket.subject}</p>
                        <p className="text-[10px] text-content-tertiary">{ticket.ticket_number} · {ticket.userEmail}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-semibold ${priorityClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-content-tertiary mt-1 line-clamp-2">{ticket.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-content-muted">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => void resolveTicket(ticket.id)}
                        disabled={resolvingTicketId === ticket.id}
                        className="text-[10px] px-2 py-1 rounded-sm bg-emerald-500/15 text-emerald-300 disabled:opacity-50"
                      >
                        {resolvingTicketId === ticket.id ? '...' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {plaidStats && plaidStats.items_with_sync_error > 0 && (
              <div className="border border-amber-500/20 rounded-sm bg-amber-500/5 p-4 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <p>
                  Plaid currently has {plaidStats.items_with_sync_error} item(s) with sync errors and {plaidStats.items_needing_relink} needing relink.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
