import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrivacyScreenWhenHidden } from '../components/PrivacyScreenWhenHidden';
import { toast } from 'sonner';
import { track } from '../lib/analytics';
import { AdminMetricsBar } from './admin/components/AdminMetricsBar';
import { AdminUsersPanel } from './admin/components/AdminUsersPanel';
import { AdminControlsPanel } from './admin/components/AdminControlsPanel';
import { AdminSupportPanel } from './admin/components/AdminSupportPanel';
import type { EnrichedUser, PlaidHealthStats, ProfileRow, SupportTicket } from './admin/components/types';

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

        <AdminMetricsBar metrics={metricData} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminUsersPanel
            users={filteredProfiles}
            search={userSearch}
            onSearchChange={setUserSearch}
            getEnrichedProfile={getEnrichedProfile}
            primaryAdminEmail={PRIMARY_ADMIN_EMAIL}
            onDemoteAdmin={(userId) => void handleDemoteAdmin(userId)}
            onAdminAction={(action, userId) => void handleAdminAction(action, userId)}
          />

          <div className="space-y-6">
            <AdminControlsPanel
              isMaintenance={isMaintenance}
              isPlaidEnabled={isPlaidEnabled}
              broadcastMsg={broadcastMsg}
              isSavingBroadcast={isSavingBroadcast}
              onToggleMaintenance={() => void toggleMaintenance()}
              onTogglePlaid={() => void togglePlaid()}
              onBroadcastChange={setBroadcastMsg}
              onSaveBroadcast={() => void handleSendBroadcast()}
            />
            <AdminSupportPanel
              ticketsLoading={ticketsLoading}
              tickets={openTickets}
              resolvingTicketId={resolvingTicketId}
              plaidStats={plaidStats}
              onResolveTicket={(ticketId) => void resolveTicket(ticketId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
