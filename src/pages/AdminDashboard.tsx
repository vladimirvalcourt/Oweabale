import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import { ArrowLeft, RefreshCw, LayoutDashboard, LineChart, Users, Landmark } from 'lucide-react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { supabase } from '../lib/supabase';
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
import { AdminFeedbackPanel } from './admin/components/AdminFeedbackPanel';
import { AdminBroadcastsPanel } from './admin/components/AdminBroadcastsPanel';
import { AdminUserDataPanel } from './admin/components/AdminUserDataPanel';
import { AdminIngestionQueuesPanel } from './admin/components/AdminIngestionQueuesPanel';
import { useAdminPermissions } from '../features/admin/shared/useAdminPermissions';
import { getAdminActionErrorMessage } from '../lib/adminActionsInvoke';
import { getCustomIcon } from '../lib/customIcons';
import type {
  AdminAuditEntry,
  AdminBroadcastRow,
  AdminCaptureSession,
  AdminFeedbackEntry,
  AdminInsurancePolicy,
  AdminInvestmentAccount,
  AdminPendingIngestion,
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
  const OverviewIcon = getCustomIcon('overview');
  const ChartIcon = getCustomIcon('chart');
  const SupportIcon = getCustomIcon('support');
  const BillingIcon = getCustomIcon('billing');
  const { isSuperAdmin, hasPermission } = useAdminPermissions();
  const canBillingManage = isSuperAdmin || hasPermission('billing.manage');
  const canManagePlatform = isSuperAdmin || hasPermission('settings.platform');
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
  const [resolvedTickets, setResolvedTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);

  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const [plaidStats, setPlaidStats] = useState<PlaidHealthStats | null>(null);
  const [plaidItems, setPlaidItems] = useState<PlaidItemRow[]>([]);
  const [stripeHealth, setStripeHealth] = useState<StripeHealthStats | null>(null);
  const [auditFeed, setAuditFeed] = useState<AdminAuditEntry[]>([]);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
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
  const [feedbackEntries, setFeedbackEntries] = useState<AdminFeedbackEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [adminBroadcasts, setAdminBroadcasts] = useState<AdminBroadcastRow[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [investmentAccounts, setInvestmentAccounts] = useState<AdminInvestmentAccount[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<AdminInsurancePolicy[]>([]);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [pendingIngestions, setPendingIngestions] = useState<AdminPendingIngestion[]>([]);
  const [captureSessions, setCaptureSessions] = useState<AdminCaptureSession[]>([]);
  const [queuesLoading, setQueuesLoading] = useState(false);

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
    // Keep prior chart/webhook data until replacements arrive to avoid CLS (panels collapsing then expanding).

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

    if (enrichedRes.error) toast.error(`Auth enrichment failed: ${getAdminActionErrorMessage(enrichedRes)}`);
    else if (enrichedRes.data?.users) setEnrichedUsers(enrichedRes.data.users as EnrichedUser[]);

    if (plaidStatsRes.error) toast.error(`Plaid stats failed: ${getAdminActionErrorMessage(plaidStatsRes)}`);
    else if (plaidStatsRes.data?.plaid_stats) setPlaidStats(plaidStatsRes.data.plaid_stats as PlaidHealthStats);

    if (healthRes.error) toast.error(`Billing health failed: ${getAdminActionErrorMessage(healthRes)}`);
    else if (healthRes.data?.stripe_health) setStripeHealth(healthRes.data.stripe_health as StripeHealthStats);

    if (auditRes.error) toast.error(`Audit feed failed: ${getAdminActionErrorMessage(auditRes)}`);
    else if (Array.isArray(auditRes.data?.audit_feed)) setAuditFeed(auditRes.data.audit_feed as AdminAuditEntry[]);

    if (billingStatsRes.error) toast.error(`Billing stats failed: ${getAdminActionErrorMessage(billingStatsRes)}`);
    else if (billingStatsRes.data?.billing_stats) setBillingStats(billingStatsRes.data.billing_stats as BillingStats);

    if (billingByUserRes.error) toast.error(`Billing by user failed: ${getAdminActionErrorMessage(billingByUserRes)}`);
    else if (billingByUserRes.data?.billing_by_user) setSubMap(billingByUserRes.data.billing_by_user as Record<string, UserSubscription>);

    if (plaidItemsRes.error) toast.error(`Plaid items failed: ${getAdminActionErrorMessage(plaidItemsRes)}`);
    else if (Array.isArray(plaidItemsRes.data?.plaid_items)) setPlaidItems(plaidItemsRes.data.plaid_items as PlaidItemRow[]);

    if (churnRes.error) toast.error(`Churn stats failed: ${getAdminActionErrorMessage(churnRes)}`);
    else if (churnRes.data?.churn_stats) setChurnStats(churnRes.data.churn_stats as ChurnStats);

    if (growthRes.error) toast.error(`Growth chart failed: ${getAdminActionErrorMessage(growthRes)}`);
    else if (Array.isArray(growthRes.data?.growth_chart)) setGrowthChart(growthRes.data.growth_chart as { week: string; signups: number }[]);

    if (revenueRes.error) toast.error(`Revenue chart failed: ${getAdminActionErrorMessage(revenueRes)}`);
    else if (Array.isArray(revenueRes.data?.revenue_chart))
      setRevenueChart(revenueRes.data.revenue_chart as { month: string; revenue_cents: number }[]);

    if (webhookRes.error) toast.error(`Webhooks failed: ${getAdminActionErrorMessage(webhookRes)}`);
    else if (Array.isArray(webhookRes.data?.webhooks))
      setWebhookRows(
        webhookRes.data.webhooks as { id: string; stripe_event_id: string; event_type: string; processed_at: string }[],
      );

    setTicketsLoading(true);
    setFeedbackLoading(true);
    setBroadcastsLoading(true);
    setUserDataLoading(true);
    setQueuesLoading(true);
    const [
      { data: ticketsOpen, error: ticketOpenErr },
      { data: ticketsResolved, error: ticketResolvedErr },
      { data: feedbackRows, error: feedbackErr },
      { data: broadcastRows, error: broadcastErr },
      { data: investmentRows, error: investmentErr },
      { data: insuranceRows, error: insuranceErr },
      { data: pendingRows, error: pendingErr },
      { data: captureRows, error: captureErr },
    ] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('*')
        .in('status', ['Open', 'In Progress'])
        .order('created_at', { ascending: false }),
      supabase
        .from('support_tickets')
        .select('*')
        .eq('status', 'Resolved')
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase
        .from('user_feedback')
        .select('id, user_id, type, rating, message, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('admin_broadcasts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase
        .from('investment_accounts')
        .select('id, user_id, name, type, institution, balance, last_updated')
        .order('last_updated', { ascending: false })
        .limit(120),
      supabase
        .from('insurance_policies')
        .select('id, user_id, type, provider, premium, frequency, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(120),
      supabase
        .from('pending_ingestions')
        .select('id, user_id, type, status, source, created_at, storage_path')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('document_capture_sessions')
        .select('id, user_id, status, uploaded_file_url, expires_at, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100),
    ]);
    setTicketsLoading(false);
    setFeedbackLoading(false);
    setBroadcastsLoading(false);
    setUserDataLoading(false);
    setQueuesLoading(false);

    const profileMap: Record<string, string> = {};
    profileData?.forEach((p) => {
      if (p.email) profileMap[p.id] = p.email;
    });

    const allUserIds = new Set<string>();
    const collectUserIds = (rows: Array<{ user_id: string }> | null | undefined) => {
      rows?.forEach((row) => allUserIds.add(row.user_id));
    };
    collectUserIds((ticketsOpen ?? []) as Array<{ user_id: string }>);
    collectUserIds((ticketsResolved ?? []) as Array<{ user_id: string }>);
    collectUserIds((feedbackRows ?? []) as Array<{ user_id: string }>);
    collectUserIds((investmentRows ?? []) as Array<{ user_id: string }>);
    collectUserIds((insuranceRows ?? []) as Array<{ user_id: string }>);
    collectUserIds((pendingRows ?? []) as Array<{ user_id: string }>);
    collectUserIds((captureRows ?? []) as Array<{ user_id: string }>);

    const missingUserIds = [...allUserIds].filter((id) => !profileMap[id]);
    if (missingUserIds.length > 0) {
      const { data: extraProf, error: extraProfErr } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', missingUserIds);
      if (extraProfErr) toast.error(`User emails load failed: ${extraProfErr.message}`);
      extraProf?.forEach((p: { id: string; email: string | null }) => {
        if (p.email) profileMap[p.id] = p.email;
      });
    }
    const mapTicket = (t: SupportTicket) => ({
      ...t,
      userEmail: profileMap[t.user_id] || `${t.user_id.slice(0, 8)}…`,
    });

    if (ticketOpenErr) {
      toast.error(`Open tickets load failed: ${ticketOpenErr.message}`);
      setOpenTickets([]);
    } else {
      setOpenTickets((ticketsOpen ?? []).map(mapTicket));
    }
    if (ticketResolvedErr) {
      toast.error(`Resolved tickets load failed: ${ticketResolvedErr.message}`);
      setResolvedTickets([]);
    } else {
      setResolvedTickets((ticketsResolved ?? []).map(mapTicket));
    }

    if (broadcastErr) {
      toast.error(`Broadcasts load failed: ${broadcastErr.message}`);
      setAdminBroadcasts([]);
    } else {
      setAdminBroadcasts((broadcastRows ?? []) as AdminBroadcastRow[]);
    }

    if (investmentErr) {
      toast.error(`Investment accounts load failed: ${investmentErr.message}`);
      setInvestmentAccounts([]);
    } else {
      setInvestmentAccounts(
        ((investmentRows ?? []) as Omit<AdminInvestmentAccount, 'userEmail'>[]).map((row) => ({
          ...row,
          userEmail: profileMap[row.user_id] || `${row.user_id.slice(0, 8)}…`,
        })),
      );
    }

    if (insuranceErr) {
      toast.error(`Insurance policies load failed: ${insuranceErr.message}`);
      setInsurancePolicies([]);
    } else {
      setInsurancePolicies(
        ((insuranceRows ?? []) as Omit<AdminInsurancePolicy, 'userEmail'>[]).map((row) => ({
          ...row,
          userEmail: profileMap[row.user_id] || `${row.user_id.slice(0, 8)}…`,
        })),
      );
    }

    if (pendingErr) {
      toast.error(`Pending ingestions load failed: ${pendingErr.message}`);
      setPendingIngestions([]);
    } else {
      setPendingIngestions(
        ((pendingRows ?? []) as Omit<AdminPendingIngestion, 'userEmail'>[]).map((row) => ({
          ...row,
          userEmail: profileMap[row.user_id] || `${row.user_id.slice(0, 8)}…`,
        })),
      );
    }

    if (captureErr) {
      toast.error(`Capture sessions load failed: ${captureErr.message}`);
      setCaptureSessions([]);
    } else {
      setCaptureSessions(
        ((captureRows ?? []) as Omit<AdminCaptureSession, 'userEmail'>[]).map((row) => ({
          ...row,
          userEmail: profileMap[row.user_id] || `${row.user_id.slice(0, 8)}…`,
        })),
      );
    }

    if (feedbackErr) {
      toast.error(`Feedback load failed: ${feedbackErr.message}`);
      setFeedbackEntries([]);
    } else if (feedbackRows && feedbackRows.length > 0) {
      const ids = [...new Set(feedbackRows.map((r: { user_id: string }) => r.user_id))];
      const { data: profRows, error: profErr } = await supabase.from('profiles').select('id, email').in('id', ids);
      if (profErr) toast.error(`Feedback emails failed: ${profErr.message}`);
      const emailMap = Object.fromEntries(
        (profRows ?? []).map((p: { id: string; email: string | null }) => [p.id, p.email?.trim() || '']),
      );
      setFeedbackEntries(
        (feedbackRows as Omit<AdminFeedbackEntry, 'userEmail'>[]).map((r) => ({
          ...r,
          userEmail: emailMap[r.user_id] || `${r.user_id.slice(0, 8)}…`,
        })),
      );
    } else {
      setFeedbackEntries([]);
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
      const res = await invokeAdminActions({
        action: 'set_feature_flag',
        flagScope: scope,
        flagKey: key,
        flagValue: value,
      });
      if (res.error) {
        toast.error(`Feature flag failed: ${getAdminActionErrorMessage(res)}`);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_feedback' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_broadcasts' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_broadcasts' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'admin_broadcasts' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_accounts' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurance_policies' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_ingestions' }, () => {
        void loadAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_capture_sessions' }, () => {
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
    const res = await invokeAdminActions({ action, targetUserId });
    if (res.error) {
      toast.error(`Admin action failed: ${getAdminActionErrorMessage(res)}`, { id: 'admin-action' });
      return;
    }
    const { data } = res;
    toast.success(data?.message || `Successfully executed ${action}.`, { id: 'admin-action' });
    void loadAll();
  };

  const handleDemoteAdmin = async (userId: string) => {
    const res = await invokeAdminActions({ action: 'set_admin', targetUserId: userId, isAdmin: false });
    if (res.error) {
      toast.error(`Failed to remove admin status: ${getAdminActionErrorMessage(res)}`);
      return;
    }
    const { data } = res;
    toast.success(typeof data?.message === 'string' ? data.message : 'Admin access removed.');
    track('admin_role_changed', { granted: false });
    void loadAll();
  };

  const handlePromoteAdmin = async (userId: string) => {
    toast.loading('Granting admin access…', { id: 'promote-admin' });
    const res = await invokeAdminActions({ action: 'promote_admin', targetUserId: userId });
    if (res.error) {
      toast.error(`Failed to grant admin: ${getAdminActionErrorMessage(res)}`, { id: 'promote-admin' });
      return;
    }
    const { data } = res;
    toast.success(typeof data?.message === 'string' ? data.message : 'Admin access granted.', { id: 'promote-admin' });
    track('admin_role_changed', { granted: true });
    void loadAll();
  };

  const handleGrantRevoke = async (action: 'grant' | 'revoke', userId: string) => {
    const adminAction = action === 'grant' ? 'grant_entitlement' : 'revoke_entitlement';
    toast.loading(action === 'grant' ? 'Granting Full Suite…' : 'Revoking Full Suite…', { id: 'grant-revoke' });
    const res = await invokeAdminActions({ action: adminAction, targetUserId: userId });
    if (res.error) {
      toast.error(`Failed: ${getAdminActionErrorMessage(res)}`, { id: 'grant-revoke' });
      return;
    }
    const { data } = res;
    toast.success(typeof data?.message === 'string' ? data.message : 'Done.', { id: 'grant-revoke' });
    void loadAll();
  };

  const handleBulkAction = async (
    action: 'ban' | 'unban' | 'grant_entitlement' | 'revoke_entitlement',
    userIds: string[],
  ) => {
    toast.loading(`Applying bulk ${action} to ${userIds.length} user(s)…`, { id: 'bulk-action' });
    const bulkRes = await invokeAdminActions({ action: 'bulk_action', bulkAction: action, targetUserIds: userIds });
    if (bulkRes.error) {
      toast.error(`Bulk action failed: ${getAdminActionErrorMessage(bulkRes)}`, { id: 'bulk-action' });
      return;
    }
    const { data } = bulkRes;
    toast.success(typeof data?.message === 'string' ? data.message : 'Bulk action completed.', { id: 'bulk-action' });
    void loadAll();
  };

  const createAdminBroadcast = useCallback(
    async (payload: { title: string; content: string; type: 'info' | 'warning' | 'error' }) => {
      const { error } = await supabase.from('admin_broadcasts').insert(payload);
      if (error) {
        toast.error(`Broadcast failed: ${error.message}`);
        return false;
      }
      toast.success('Structured broadcast published.');
      void loadAll();
      return true;
    },
    [loadAll],
  );

  const deleteAdminBroadcast = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('admin_broadcasts').delete().eq('id', id);
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        return false;
      }
      toast.success('Broadcast removed.');
      void loadAll();
      return true;
    },
    [loadAll],
  );

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
    if (!canManagePlatform) return toast.error('You do not have permission to change maintenance mode.');
    const newValue = !isMaintenance;
    if (!window.confirm(`${newValue ? 'Enable' : 'Disable'} maintenance mode? This affects all users.`)) return;
    const res = await invokeAdminActions({
      action: 'update_platform_controls',
      maintenanceMode: newValue,
    });
    if (res.error) {
      toast.error(`Failed to update maintenance mode: ${getAdminActionErrorMessage(res)}`);
      return;
    }
    setIsMaintenance(newValue);
    toast.success(newValue ? 'Maintenance enabled.' : 'Maintenance disabled.');
  };

  const togglePlaid = async () => {
    if (!canManagePlatform) return toast.error('You do not have permission to change bank syncing.');
    const newValue = !isPlaidEnabled;
    if (!window.confirm(`${newValue ? 'Enable' : 'Disable'} bank syncing globally?`)) return;
    const res = await invokeAdminActions({
      action: 'update_platform_controls',
      plaidEnabled: newValue,
    });
    if (res.error) {
      toast.error(`Failed to update bank syncing: ${getAdminActionErrorMessage(res)}`);
      return;
    }
    setIsPlaidEnabled(newValue);
    toast.success(newValue ? 'Bank syncing enabled.' : 'Bank syncing disabled.');
  };

  const handleSendBroadcast = async () => {
    if (!canManagePlatform) return toast.error('You do not have permission to update the broadcast.');
    setIsSavingBroadcast(true);
    const res = await invokeAdminActions({
      action: 'update_platform_controls',
      broadcastMessage: broadcastMsg.trim() === '' ? null : broadcastMsg,
    });
    setIsSavingBroadcast(false);
    if (res.error) {
      toast.error(`Failed to update broadcast message: ${getAdminActionErrorMessage(res)}`);
      return;
    }
    toast.success(broadcastMsg.trim() ? 'Broadcast updated.' : 'Broadcast cleared.');
  };

  return (
    <div className="min-h-screen bg-surface-base p-4 text-content-secondary sm:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <section className="glass-card flex min-h-[9.5rem] flex-col rounded-2xl p-5 lg:col-span-8">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Command Center</p>
            <h1 className="mt-1 text-xl font-semibold leading-tight text-content-primary sm:text-2xl">Admin dashboard</h1>
            <p className="mt-2 max-w-2xl flex-1 text-xs leading-relaxed text-content-tertiary sm:text-sm">
              Scan platform health, triage user issues, and execute controls with clear separation between analytics and high-risk actions.
            </p>
          </section>
          <section className="glass-card flex min-h-[9.5rem] flex-col rounded-2xl p-4 lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Session Actions</p>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => void loadAll()}
                disabled={isRefreshing}
                className="interactive-press interactive-focus inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-base/80 px-3 py-2 text-xs text-content-secondary transition hover:bg-surface-raised hover:text-content-primary disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <TransitionLink
                to="/"
                className="interactive-press interactive-focus inline-flex items-center gap-1 rounded-lg border border-surface-border bg-surface-base/80 px-3 py-2 text-xs text-content-tertiary transition hover:text-content-primary"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </TransitionLink>
            </div>
          </section>
        </div>

        <section className="glass-card rounded-2xl p-4">
          <CollapsibleModule title="At a glance" icon={OverviewIcon} defaultOpen>
            <AdminMetricsBar metrics={metricData} />
          </CollapsibleModule>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="glass-card rounded-2xl p-4">
              <CollapsibleModule title="Exports & analytics" icon={ChartIcon} defaultOpen>
                <div className="space-y-6">
                  <AdminExportBar profiles={profiles} billingStats={billingStats} />
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <AdminRevenueChart data={revenueChart} />
                    <AdminGrowthChart data={growthChart} />
                    <AdminChurnPanel stats={churnStats} />
                    <AdminWebhooksPanel webhooks={webhookRows} />
                  </div>
                </div>
              </CollapsibleModule>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <CollapsibleModule title="Users & roles" icon={SupportIcon} defaultOpen>
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
                  isSuperAdmin={isSuperAdmin}
                  canBillingManage={canBillingManage}
                />
              </CollapsibleModule>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <CollapsibleModule title="Plaid connections" icon={BillingIcon} defaultOpen={false}>
                <AdminPlaidDrilldown items={plaidItems} />
              </CollapsibleModule>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <section className="glass-card rounded-2xl p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Operations</p>
              <div className="space-y-6">
                <AdminBillingPanel stats={billingStats} stripeDashboardUrl={STRIPE_DASHBOARD_URL || undefined} />
                <AdminFeatureFlagsPanel
                  platformSettings={platformSettingsForFlags}
                  onSetFeatureFlag={handleSetFeatureFlag}
                  canManagePlatform={canManagePlatform}
                />
                <AdminReliabilityPanel stripeHealth={stripeHealth} auditFeed={auditFeed} />
              </div>
            </section>

            <section className="rounded-2xl border border-rose-200/70 bg-rose-50/40 p-4 shadow-sm backdrop-blur transition-colors duration-200 hover:border-rose-300/80 dark:border-rose-500/30 dark:bg-rose-950/20">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Control Zone</p>
              <div className="space-y-6">
                <AdminControlsPanel
                  isMaintenance={isMaintenance}
                  isPlaidEnabled={isPlaidEnabled}
                  broadcastMsg={broadcastMsg}
                  isSavingBroadcast={isSavingBroadcast}
                  canManagePlatform={canManagePlatform}
                  onToggleMaintenance={() => void toggleMaintenance()}
                  onTogglePlaid={() => void togglePlaid()}
                  onBroadcastChange={setBroadcastMsg}
                  onSaveBroadcast={() => void handleSendBroadcast()}
                />
                <AdminBroadcastsPanel
                  loading={broadcastsLoading}
                  items={adminBroadcasts}
                  onCreate={(payload) => createAdminBroadcast(payload)}
                  onDelete={(id) => deleteAdminBroadcast(id)}
                />
              </div>
            </section>

            <section className="glass-card rounded-2xl p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Support & Feedback</p>
              <div className="space-y-6">
                <AdminSupportPanel
                  ticketsLoading={ticketsLoading}
                  tickets={openTickets}
                  resolvedTickets={resolvedTickets}
                  resolvingTicketId={resolvingTicketId}
                  plaidStats={plaidStats}
                  onResolveTicket={(ticketId) => void resolveTicket(ticketId)}
                />
                <AdminFeedbackPanel loading={feedbackLoading} items={feedbackEntries} />
              </div>
            </section>

            <section className="glass-card rounded-2xl p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Data Pipelines</p>
              <div className="space-y-6">
                <AdminUserDataPanel
                  loading={userDataLoading}
                  investmentAccounts={investmentAccounts}
                  insurancePolicies={insurancePolicies}
                />
                <AdminIngestionQueuesPanel
                  loading={queuesLoading}
                  pendingIngestions={pendingIngestions}
                  captureSessions={captureSessions}
                />
              </div>
            </section>
          </aside>
        </div>
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
