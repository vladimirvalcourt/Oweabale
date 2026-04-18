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
import { AdminReliabilityPanel } from './admin/components/AdminReliabilityPanel';
import { AdminBillingPanel } from './admin/components/AdminBillingPanel';
import { AdminPlaidDrilldown } from './admin/components/AdminPlaidDrilldown';
import { AdminUserModal } from './admin/components/AdminUserModal';
import { AdminChurnPanel } from './admin/components/AdminChurnPanel';
import { AdminGrowthChart } from './admin/components/AdminGrowthChart';
import { AdminRevenueChart } from './admin/components/AdminRevenueChart';
import { AdminWebhooksPanel } from './admin/components/AdminWebhooksPanel';
import { AdminFeatureFlagsPanel } from './admin/components/AdminFeatureFlagsPanel';
import { AdminExportBar } from './admin/components/AdminExportBar';
import type {
  AdminAuditEntry,
  BillingStats,
  ChurnStats,
  EnrichedUser,
  PlaidHealthStats,
  PlaidItemRow,
  ProfileRow,
  StripeHealthStats,
  SupportTicket,
  UserSubscription,
} from './admin/components/types';

const PRIMARY_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();
const STRIPE_DASHBOARD_URL = (import.meta.env.VITE_STRIPE_DASHBOARD_URL ?? '').trim();
const PROFILE_PAGE_SIZE = 200;

export default function AdminDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPlaidEnabled, setIsPlaidEnabled] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [subMap, setSubMap] = useState<Record<string, UserSubscription>>({});

  const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const [plaidStats, setPlaidStats] = useState<PlaidHealthStats | null>(null);
  const [plaidItems, setPlaidItems] = useState<PlaidItemRow[]>([]);
  const [stripeHealth, setStripeHealth] = useState<StripeHealthStats | null>(null);
  const [auditFeed, setAuditFeed] = useState<AdminAuditEntry[]>([]);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [platformSettingsId, setPlatformSettingsId] = useState<string | null>(null);
  const [platformSettingsForFlags, setPlatformSettingsForFlags] = useState<{
    feature_flags?: Record<string, boolean>;
  } | null>(null);
  const [churnStats, setChurnStats] = useState<ChurnStats | null>(null);
  const [growthChart, setGrowthChart] = useState<{ week: string; signups: number }[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ month: string; revenue_cents: number }[]>([]);
  const [webhookRows, setWebhookRows] = useState<
    { id: string; stripe_event_id: string; event_type: string; processed_at: string }[]
  >([]);
  const [profilesTotalCount, setProfilesTotalCount] = useState<number | null>(null);
  const [profilesLoadingMore, setProfilesLoadingMore] = useState(false);

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
    setChurnStats(null);
    setGrowthChart([]);
    setRevenueChart([]);
    setWebhookRows([]);

    const { data: settings, error: settingsErr } = await supabase
      .from('platform_settings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (settingsErr) {
      toast.error(`Platform settings failed: ${settingsErr.message}`);
    }
    if (settings) {
      setPlatformSettingsId(settings.id);
      setBroadcastMsg(settings.broadcast_message || '');
      setIsMaintenance(settings.maintenance_mode || false);
      setIsPlaidEnabled(settings.plaid_enabled !== false);
      const raw = 'feature_flags' in settings ? (settings as { feature_flags?: unknown }).feature_flags : undefined;
      const flags: Record<string, boolean> =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? Object.fromEntries(
              Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean') as [
                string,
                boolean,
              ][],
            )
          : {};
      setPlatformSettingsForFlags({ feature_flags: flags });
    } else {
      setPlatformSettingsId(null);
      setPlatformSettingsForFlags({ feature_flags: {} });
      if (!settingsErr) {
        toast.error('No platform_settings row found. Add one or run migrations.', { id: 'no-platform-settings' });
      }
    }

    const { data: profileData, error: profileErr, count: profileCount } = await supabase
      .from('profiles')
      .select('id, email, is_admin, is_banned, has_completed_onboarding, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(0, PROFILE_PAGE_SIZE - 1);

    if (profileErr) {
      toast.error(`Failed to load users: ${profileErr.message}`);
    } else if (profileData) {
      setProfiles(profileData as ProfileRow[]);
      setProfilesTotalCount(typeof profileCount === 'number' ? profileCount : null);
    }

    // Fire all admin-actions fetches in parallel
    const [
      enrichedRes,
      plaidStatsRes,
      healthRes,
      auditRes,
      billingStatsRes,
      billingByUserRes,
      plaidItemsRes,
      churnRes,
      growthRes,
      revenueRes,
      webhookRes,
    ] = await Promise.all([
      invokeAdminActions({ action: 'list' }),
      invokeAdminActions({ action: 'plaid_stats' }),
      invokeAdminActions({ action: 'health' }),
      invokeAdminActions({ action: 'audit_feed' }),
      invokeAdminActions({ action: 'billing_stats' }),
      invokeAdminActions({ action: 'billing_by_user' }),
      invokeAdminActions({ action: 'plaid_items_list' }),
      invokeAdminActions({ action: 'churn_stats' }),
      invokeAdminActions({ action: 'growth_chart' }),
      invokeAdminActions({ action: 'revenue_chart' }),
      invokeAdminActions({ action: 'webhook_list' }),
    ]);

    if (enrichedRes.error) toast.error(`Auth enrichment failed: ${enrichedRes.error.message}`);
    else if (enrichedRes.data?.users) setEnrichedUsers(enrichedRes.data.users as EnrichedUser[]);

    if (plaidStatsRes.error) toast.error(`Plaid stats failed: ${plaidStatsRes.error.message}`);
    else if (plaidStatsRes.data?.plaid_stats) setPlaidStats(plaidStatsRes.data.plaid_stats as PlaidHealthStats);

    if (healthRes.error) toast.error(`Billing health failed: ${healthRes.error.message}`);
    else if (healthRes.data?.stripe_health) setStripeHealth(healthRes.data.stripe_health as StripeHealthStats);

    if (auditRes.error) toast.error(`Audit feed failed: ${auditRes.error.message}`);
    else if (Array.isArray(auditRes.data?.audit_feed)) setAuditFeed(auditRes.data.audit_feed as AdminAuditEntry[]);

    if (billingStatsRes.error) toast.error(`Billing stats failed: ${billingStatsRes.error.message}`);
    else if (billingStatsRes.data?.billing_stats) setBillingStats(billingStatsRes.data.billing_stats as BillingStats);

    if (billingByUserRes.error) toast.error(`Billing by user failed: ${billingByUserRes.error.message}`);
    else if (billingByUserRes.data?.billing_by_user) setSubMap(billingByUserRes.data.billing_by_user as Record<string, UserSubscription>);

    if (plaidItemsRes.error) toast.error(`Plaid items failed: ${plaidItemsRes.error.message}`);
    else if (Array.isArray(plaidItemsRes.data?.plaid_items)) setPlaidItems(plaidItemsRes.data.plaid_items as PlaidItemRow[]);

    if (churnRes.error) toast.error(`Churn stats failed: ${churnRes.error.message}`);
    else if (churnRes.data?.churn_stats) setChurnStats(churnRes.data.churn_stats as ChurnStats);

    if (growthRes.error) toast.error(`Growth chart failed: ${growthRes.error.message}`);
    else if (Array.isArray(growthRes.data?.growth_chart)) setGrowthChart(growthRes.data.growth_chart as { week: string; signups: number }[]);

    if (revenueRes.error) toast.error(`Revenue chart failed: ${revenueRes.error.message}`);
    else if (Array.isArray(revenueRes.data?.revenue_chart))
      setRevenueChart(revenueRes.data.revenue_chart as { month: string; revenue_cents: number }[]);

    if (webhookRes.error) toast.error(`Webhooks failed: ${webhookRes.error.message}`);
    else if (Array.isArray(webhookRes.data?.webhooks))
      setWebhookRows(
        webhookRes.data.webhooks as { id: string; stripe_event_id: string; event_type: string; processed_at: string }[],
      );

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

  const loadMoreProfiles = useCallback(async () => {
    if (profilesLoadingMore || profilesTotalCount === null || profiles.length >= profilesTotalCount) return;
    setProfilesLoadingMore(true);
    const from = profiles.length;
    const to = from + PROFILE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, is_banned, has_completed_onboarding, created_at')
      .order('created_at', { ascending: false })
      .range(from, to);
    setProfilesLoadingMore(false);
    if (error) {
      toast.error(`Failed to load more users: ${error.message}`);
      return;
    }
    if (data?.length) setProfiles((prev) => [...prev, ...(data as ProfileRow[])]);
  }, [profilesLoadingMore, profilesTotalCount, profiles.length]);

  const handleSetFeatureFlag = useCallback(
    async (scope: 'global', key: string, value: boolean) => {
      const { error } = await invokeAdminActions({
        action: 'set_feature_flag',
        flagScope: scope,
        flagKey: key,
        flagValue: value,
      });
      if (error) {
        toast.error(`Feature flag failed: ${error.message}`);
        return;
      }
      setPlatformSettingsForFlags((prev) => ({
        feature_flags: { ...(prev?.feature_flags ?? {}), [key]: value },
      }));
      toast.success('Feature flag updated.');
    },
    [invokeAdminActions],
  );

  useEffect(() => {
    void loadAll();

    const ticketSub = supabase
      .channel('admin-tickets-lean')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'support_tickets' }, () => {
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

  const handlePromoteAdmin = async (userId: string) => {
    toast.loading('Granting admin access…', { id: 'promote-admin' });
    const { data, error } = await invokeAdminActions({ action: 'promote_admin', targetUserId: userId });
    if (error) {
      toast.error(`Failed to grant admin: ${error.message}`, { id: 'promote-admin' });
      return;
    }
    toast.success(typeof data?.message === 'string' ? data.message : 'Admin access granted.', { id: 'promote-admin' });
    track('admin_role_changed', { granted: true });
    void loadAll();
  };

  const handleGrantRevoke = async (action: 'grant' | 'revoke', userId: string) => {
    const adminAction = action === 'grant' ? 'grant_entitlement' : 'revoke_entitlement';
    toast.loading(action === 'grant' ? 'Granting Full Suite…' : 'Revoking Full Suite…', { id: 'grant-revoke' });
    const { data, error } = await invokeAdminActions({ action: adminAction, targetUserId: userId });
    if (error) {
      toast.error(`Failed: ${error.message}`, { id: 'grant-revoke' });
      return;
    }
    toast.success(typeof data?.message === 'string' ? data.message : 'Done.', { id: 'grant-revoke' });
    void loadAll();
  };

  const handleBulkAction = async (
    action: 'ban' | 'unban' | 'grant_entitlement' | 'revoke_entitlement',
    userIds: string[],
  ) => {
    toast.loading(`Applying bulk ${action} to ${userIds.length} user(s)…`, { id: 'bulk-action' });
    const { data, error } = await invokeAdminActions({ action: 'bulk_action', bulkAction: action, targetUserIds: userIds });
    if (error) {
      toast.error(`Bulk action failed: ${error.message}`, { id: 'bulk-action' });
      return;
    }
    toast.success(typeof data?.message === 'string' ? data.message : 'Bulk action completed.', { id: 'bulk-action' });
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
    if (!platformSettingsId) {
      toast.error('Platform settings row not found.');
      return;
    }
    const newValue = !isMaintenance;
    const { error } = await supabase
      .from('platform_settings')
      .update({ maintenance_mode: newValue })
      .eq('id', platformSettingsId);
    if (error) {
      toast.error('Failed to update maintenance mode.');
      return;
    }
    setIsMaintenance(newValue);
    toast.success(newValue ? 'Maintenance enabled.' : 'Maintenance disabled.');
  };

  const togglePlaid = async () => {
    if (!platformSettingsId) {
      toast.error('Platform settings row not found.');
      return;
    }
    const newValue = !isPlaidEnabled;
    const { error } = await supabase
      .from('platform_settings')
      .update({ plaid_enabled: newValue })
      .eq('id', platformSettingsId);
    if (error) {
      toast.error('Failed to update bank syncing.');
      return;
    }
    setIsPlaidEnabled(newValue);
    toast.success(newValue ? 'Bank syncing enabled.' : 'Bank syncing disabled.');
  };

  const handleSendBroadcast = async () => {
    if (!platformSettingsId) {
      toast.error('Platform settings row not found.');
      return;
    }
    setIsSavingBroadcast(true);
    const { error } = await supabase
      .from('platform_settings')
      .update({ broadcast_message: broadcastMsg.trim() === '' ? null : broadcastMsg })
      .eq('id', platformSettingsId);
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
            <h1 className="text-xl font-medium text-content-primary sm:text-2xl">Admin dashboard</h1>
            <p className="text-xs text-content-tertiary mt-1">Lean operator view: users, support, and platform controls</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAll()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-xs text-content-secondary hover:text-content-primary hover:bg-surface-raised disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <TransitionLink to="/" className="inline-flex items-center gap-1 text-xs text-content-tertiary hover:text-content-primary">
              <ArrowLeft className="w-3 h-3" /> Back
            </TransitionLink>
          </div>
        </div>

        <AdminMetricsBar metrics={metricData} />

        <AdminExportBar profiles={profiles} billingStats={billingStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdminRevenueChart data={revenueChart} />
          <AdminGrowthChart data={growthChart} />
          <AdminChurnPanel stats={churnStats} />
          <AdminWebhooksPanel webhooks={webhookRows} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AdminUsersPanel
            users={filteredProfiles}
            search={userSearch}
            onSearchChange={setUserSearch}
            getEnrichedProfile={getEnrichedProfile}
            primaryAdminEmail={PRIMARY_ADMIN_EMAIL}
            subMap={subMap}
            profilesTotalCount={profilesTotalCount}
            profilesLoadingMore={profilesLoadingMore}
            onLoadMoreProfiles={() => void loadMoreProfiles()}
            onPromoteAdmin={(userId) => void handlePromoteAdmin(userId)}
            onDemoteAdmin={(userId) => void handleDemoteAdmin(userId)}
            onAdminAction={(action, userId) => void handleAdminAction(action, userId)}
            onViewUser={setViewingUserId}
            onGrantRevoke={(action, userId) => void handleGrantRevoke(action, userId)}
            onBulkAction={(action, userIds) => void handleBulkAction(action, userIds)}
          />

          <div className="space-y-6">
            <AdminBillingPanel stats={billingStats} stripeDashboardUrl={STRIPE_DASHBOARD_URL || undefined} />
            <AdminFeatureFlagsPanel platformSettings={platformSettingsForFlags} onSetFeatureFlag={handleSetFeatureFlag} />
            <AdminReliabilityPanel stripeHealth={stripeHealth} auditFeed={auditFeed} />
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

        <AdminPlaidDrilldown items={plaidItems} />
      </div>

      <AdminUserModal
        userId={viewingUserId}
        onClose={() => setViewingUserId(null)}
        invokeAdminActions={invokeAdminActions}
        primaryAdminEmail={PRIMARY_ADMIN_EMAIL}
      />
    </div>
  );
}
