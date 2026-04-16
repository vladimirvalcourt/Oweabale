import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TransitionLink } from '../components/TransitionLink';
import {
  Terminal, Users, Database, Activity, ShieldCheck, ShieldAlert, Cpu, Network,
  ArrowLeft, Key, Zap, CheckCircle2, TrendingUp, Radio, LifeBuoy, Bot,
  Landmark, BookOpen, Clock, AlertTriangle, Coins, Search, RefreshCw,
  XCircle, ChevronRight, ThumbsUp, Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { PrivacyScreenWhenHidden } from '../components/PrivacyScreenWhenHidden';
import { toast } from 'sonner';
import { track } from '../lib/analytics';

interface EnrichedUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string | null;
  banned_until: string | null;
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

interface UserFeedback {
  id: string;
  user_id: string;
  type: 'general' | 'feature_request' | 'bug';
  rating: number | null;
  message: string;
  created_at: string;
  userEmail?: string;
}

interface ActivityEntry {
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SYS';
  message: string;
}

const PRIMARY_ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();

export default function AdminDashboard() {
  const [systemTime, setSystemTime] = useState(new Date());
  const [taxDeduction, setTaxDeduction] = useState('14600');
  const [taxBracket, setTaxBracket] = useState('37.0');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPlaidEnabled, setIsPlaidEnabled] = useState(true);
  const [plaidStats, setPlaidStats] = useState<PlaidHealthStats | null>(null);
  const [plaidStatsLoading, setPlaidStatsLoading] = useState(false);

  const [isSavingTax, setIsSavingTax] = useState(false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');

  const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);

  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [categoryWord, setCategoryWord] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [isSavingCategoryFix, setIsSavingCategoryFix] = useState(false);

  const addLog = useCallback((level: ActivityEntry['level'], message: string) => {
    const entry: ActivityEntry = {
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    setActivityLog(prev => [...prev.slice(-99), entry]);
  }, []);

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

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll activity log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activityLog]);

  // Load everything on mount
  useEffect(() => {
    loadAll();

    // Realtime: new support tickets
    const ticketSub = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
        const t = payload.new as SupportTicket;
        setOpenTickets(prev => [t, ...prev]);
        addLog('WARN', `New support ticket: ${t.ticket_number} — ${t.subject}`);
      })
      .subscribe();

    // Realtime: new user signups via profiles insert
    const userSub = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as ProfileRow;
        setProfiles(prev => [p, ...prev]);
        addLog('INFO', `New user signed up: ${p.email || p.id.slice(0, 8)}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketSub);
      supabase.removeChannel(userSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    addLog('SYS', 'Loading platform data...');

    // Platform settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    if (settings) {
      setTaxDeduction(settings.tax_standard_deduction?.toString() || '14600');
      setTaxBracket(settings.tax_top_bracket?.toString() || '37.0');
      setBroadcastMsg(settings.broadcast_message || '');
      setIsMaintenance(settings.maintenance_mode || false);
      setIsPlaidEnabled(settings.plaid_enabled !== false);
      addLog('INFO', 'Platform settings loaded.');
    }

    // Profiles
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, is_admin, is_banned, has_completed_onboarding, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (profileErr) {
      addLog('ERROR', `Profiles load failed: ${profileErr.message}`);
    } else if (profileData) {
      setProfiles(profileData as ProfileRow[]);
      addLog('INFO', `${profileData.length} users loaded.`);
    }

    // Enriched users (last login, banned status from Auth)
    const { data: enriched, error: enrichedErr } = await invokeAdminActions({ action: 'list' });
    if (enrichedErr) {
      addLog('WARN', `Auth enrichment failed: ${enrichedErr.message}`);
    } else if (enriched?.users) {
      setEnrichedUsers(enriched.users as EnrichedUser[]);
      addLog('INFO', 'Auth user data enriched.');
    }

    const { data: plaidData, error: plaidStatsErr } = await invokeAdminActions({ action: 'plaid_stats' });
    if (plaidStatsErr) {
      addLog('WARN', `Plaid stats failed: ${plaidStatsErr.message}`);
    } else if (plaidData?.plaid_stats) {
      setPlaidStats(plaidData.plaid_stats as PlaidHealthStats);
      addLog('INFO', 'Plaid link health loaded.');
    }

    // Support tickets (open/in-progress)
    setTicketsLoading(true);
    const { data: tickets, error: ticketErr } = await supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['Open', 'In Progress'])
      .order('created_at', { ascending: false });
    setTicketsLoading(false);

    if (ticketErr) {
      addLog('ERROR', `Tickets load failed: ${ticketErr.message}`);
    } else if (tickets) {
      // Enrich with emails from profiles
      const profileMap: Record<string, string> = {};
      profileData?.forEach(p => { if (p.email) profileMap[p.id] = p.email; });
      const enrichedTickets = (tickets as SupportTicket[]).map(t => ({
        ...t,
        userEmail: profileMap[t.user_id] || t.user_id.slice(0, 8),
      }));
      setOpenTickets(enrichedTickets);
      addLog('INFO', `${enrichedTickets.length} open ticket(s) loaded.`);
    }

    // User feedback
    setFeedbackLoading(true);
    const { data: feedbackData, error: feedbackErr } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setFeedbackLoading(false);
    if (feedbackErr) {
      addLog('ERROR', `Feedback load failed: ${feedbackErr.message}`);
    } else if (feedbackData) {
      const profileMap: Record<string, string> = {};
      profileData?.forEach(p => { if (p.email) profileMap[p.id] = p.email; });
      setUserFeedback((feedbackData as UserFeedback[]).map(f => ({
        ...f,
        userEmail: profileMap[f.user_id] || f.user_id.slice(0, 8),
      })));
      addLog('INFO', `${feedbackData.length} feedback submission(s) loaded.`);
    }

    // Pending ingestions count
    const { count } = await supabase
      .from('pending_ingestions')
      .select('*', { count: 'exact', head: true });
    setPendingCount(count ?? 0);

    addLog('SYS', 'Dashboard ready.');
  }

  const handleForceSync = async () => {
    addLog('SYS', 'Force sync initiated by admin...');
    await loadAll();
    toast.success('Platform data refreshed.');
    addLog('SYS', 'Force sync complete.');
  };

  const handleClearMemory = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success('Browser cache cleared. Refresh to see effect.');
    addLog('WARN', 'Admin cleared browser memory / local cache.');
  };

  const handleSaveCategoryFix = async () => {
    if (!categoryWord.trim() || !categoryName.trim()) {
      toast.error('Both word and category are required.');
      return;
    }
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) {
      toast.error('Not signed in.');
      return;
    }
    setIsSavingCategoryFix(true);
    const { error } = await supabase.from('categorization_rules').insert({
      user_id: adminUser.id,
      match_type: 'contains',
      match_value: categoryWord.trim().toLowerCase(),
      category: categoryName.trim(),
      priority: 10,
    });
    setIsSavingCategoryFix(false);
    if (error) {
      toast.error('Failed to save rule.');
      addLog('ERROR', `Category rule save failed: ${error.message}`);
    } else {
      toast.success(`Rule saved: "${categoryWord}" → "${categoryName}"`);
      addLog('INFO', `Category fix added: "${categoryWord}" → "${categoryName}"`);
      setCategoryWord('');
      setCategoryName('');
    }
  };

  const handleDemoteAdmin = async (userId: string) => {
    const { data, error } = await invokeAdminActions({
      action: 'set_admin',
      targetUserId: userId,
      isAdmin: false,
    });
    if (error) {
      toast.error('Failed to remove admin status.');
      addLog('ERROR', `Admin demote failed for user ${userId.slice(0, 8)}`);
    } else {
      setProfiles(prev => prev.map(p => (p.id === userId ? { ...p, is_admin: false } : p)));
      toast.success(typeof data?.message === 'string' ? data.message : 'Admin access removed.');
      addLog('WARN', `User ${userId.slice(0, 8)} admin status → false`);
      track('admin_role_changed', { granted: false });
    }
  };

  // Merge profiles with enriched auth data
  function getEnrichedProfile(profile: ProfileRow) {
    const auth = enrichedUsers.find(u => u.id === profile.id);
    return {
      ...profile,
      lastLogin: auth?.last_sign_in_at
        ? new Date(auth.last_sign_in_at).toLocaleDateString()
        : 'Never',
      joinedAt: profile.created_at
        ? new Date(profile.created_at).toLocaleDateString()
        : '—',
      isBannedAuth: auth?.banned_until && auth.banned_until !== 'none',
    };
  }

  const filteredProfiles = profiles.filter(p => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (p.email || '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  // Derived metrics
  const bannedCount = profiles.filter(p => p.is_banned).length;
  const inOnboardingCount = profiles.filter(p => !p.has_completed_onboarding).length;

  const metrics = [
    { label: 'TOTAL USERS', value: profiles.length > 0 ? profiles.length.toLocaleString() : '—', status: 'LIVE', color: 'text-emerald-500' },
    { label: 'OPEN TICKETS', value: openTickets.length > 0 ? openTickets.length.toString() : '0', status: ticketsLoading ? 'LOADING' : 'LIVE', color: openTickets.length > 0 ? 'text-amber-500' : 'text-emerald-500' },
    { label: 'BANNED USERS', value: bannedCount > 0 ? bannedCount.toString() : '0', status: 'LIVE', color: bannedCount > 0 ? 'text-rose-500' : 'text-content-tertiary' },
    { label: 'IN ONBOARDING', value: inOnboardingCount > 0 ? inOnboardingCount.toString() : '0', status: 'LIVE', color: 'text-indigo-400' },
  ];

  const refreshPlaidStats = useCallback(async () => {
    setPlaidStatsLoading(true);
    const { data, error } = await invokeAdminActions({ action: 'plaid_stats' });
    setPlaidStatsLoading(false);
    if (error) {
      toast.error(error.message);
      addLog('WARN', `Plaid stats refresh failed: ${error.message}`);
      return;
    }
    if (data?.plaid_stats) {
      setPlaidStats(data.plaid_stats as PlaidHealthStats);
      addLog('INFO', 'Plaid metrics refreshed.');
      toast.success('Plaid metrics refreshed.');
    }
  }, [addLog, invokeAdminActions]);

  const toggleMaintenance = async () => {
    const newValue = !isMaintenance;
    const { error } = await supabase.from('platform_settings').update({ maintenance_mode: newValue }).eq('id', '00000000-0000-0000-0000-000000000001');
    if (error) {
      toast.error('Failed to update Maintenance Mode.');
      addLog('ERROR', 'Maintenance mode toggle failed.');
    } else {
      setIsMaintenance(newValue);
      addLog('WARN', newValue ? 'Maintenance mode ENABLED.' : 'Maintenance mode DISABLED.');
      toast.success(newValue ? 'Maintenance Mode ENABLED. All traffic blocked.' : 'Maintenance Mode DISABLED. System online.');
    }
  };

  const togglePlaid = async () => {
    const newValue = !isPlaidEnabled;
    const { error } = await supabase.from('platform_settings').update({ plaid_enabled: newValue }).eq('id', '00000000-0000-0000-0000-000000000001');
    if (error) {
      toast.error('Failed to update Bank Syncing.');
    } else {
      setIsPlaidEnabled(newValue);
      addLog('INFO', newValue ? 'Plaid Bank Syncing re-enabled.' : 'Plaid Bank Syncing disabled globally.');
      toast.success(newValue ? 'Plaid Bank Syncing restored globally.' : 'Plaid Bank Syncing terminated globally.');
    }
  };

  const handleSaveTax = async () => {
    setIsSavingTax(true);
    const deductionNum = Number(taxDeduction.replace(/[^0-9.]/g, ''));
    const bracketNum = Number(taxBracket.replace(/[^0-9.]/g, ''));
    const { error } = await supabase.from('platform_settings').update({
      tax_standard_deduction: deductionNum,
      tax_top_bracket: bracketNum,
    }).eq('id', '00000000-0000-0000-0000-000000000001');
    setIsSavingTax(false);
    if (error) {
      toast.error('Failed to update: You do not have permissions or the database rejected it.');
      addLog('ERROR', 'Tax settings update rejected.');
    } else {
      addLog('INFO', `Tax settings updated: deduction=$${deductionNum}, bracket=${bracketNum}%`);
      toast.success('Global tax algorithm updated safely.');
    }
  };

  const handleSendBroadcast = async () => {
    setIsSavingBroadcast(true);
    const { error } = await supabase.from('platform_settings').update({
      broadcast_message: broadcastMsg.trim() === '' ? null : broadcastMsg,
    }).eq('id', '00000000-0000-0000-0000-000000000001');
    setIsSavingBroadcast(false);
    if (error) {
      toast.error('Failed to push broadcast.');
      addLog('ERROR', 'Broadcast push failed.');
    } else {
      addLog('INFO', broadcastMsg.trim() === '' ? 'Broadcast cleared.' : `Broadcast sent: "${broadcastMsg.trim().slice(0, 40)}"`);
      toast.success(broadcastMsg.trim() === '' ? 'Broadcast cleared from all screens.' : 'Broadcast published globally.');
    }
  };

  const handleAdminAction = async (action: 'ban' | 'unban' | 'delete', targetUserId: string) => {
    toast.loading(`Executing ${action}...`, { id: 'admin-action' });
    const { data, error } = await invokeAdminActions({ action, targetUserId });
    if (error) {
      toast.error(`Admin Action Failed: ${error.message}`, { id: 'admin-action' });
      addLog('ERROR', `Admin action '${action}' failed for ${targetUserId.slice(0, 8)}: ${error.message}`);
    } else {
      toast.success(data?.message || `Successfully executed ${action}.`, { id: 'admin-action' });
      addLog('WARN', `Admin: user ${targetUserId.slice(0, 8)} — ${action}`);
      if (action === 'delete') {
        setProfiles(prev => prev.filter(p => p.id !== targetUserId));
        setEnrichedUsers(prev => prev.filter(u => u.id !== targetUserId));
      } else if (action === 'ban') {
        setProfiles(prev => prev.map(p => p.id === targetUserId ? { ...p, is_banned: true } : p));
      } else if (action === 'unban') {
        setProfiles(prev => prev.map(p => p.id === targetUserId ? { ...p, is_banned: false } : p));
      }
    }
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
      addLog('ERROR', `Ticket resolve failed: ${error.message}`);
    } else {
      const ticket = openTickets.find(t => t.id === ticketId);
      setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
      addLog('INFO', `Ticket ${ticket?.ticket_number || ticketId.slice(0, 8)} resolved.`);
      toast.success('Ticket marked as Resolved.');
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'Urgent') return 'text-rose-400 bg-rose-500/10';
    if (p === 'Normal') return 'text-amber-400 bg-amber-500/10';
    return 'text-content-tertiary bg-white/5';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-content-secondary font-mono flex flex-col p-4 sm:p-8">
      <PrivacyScreenWhenHidden />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Terminal className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl text-white font-bold tracking-widest">Admin Dashboard</h1>
          </div>
          <p className="text-xs text-content-tertiary uppercase tracking-widest">Platform Owner Controls</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm font-bold text-emerald-500">{systemTime.toLocaleTimeString()}</p>
          <button
            onClick={loadAll}
            className="text-xs text-content-tertiary hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh All
          </button>
          <TransitionLink to="/" className="text-xs text-content-tertiary hover:text-white flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Main Site
          </TransitionLink>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">

        {/* Left Column */}
        <div className="lg:col-span-3 space-y-6">

          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0A0A0A] border border-white/10 p-5 rounded-sm relative overflow-hidden group hover:border-white/20 transition-colors"
              >
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:via-white/20" />
                <p className="text-[10px] text-content-tertiary mb-2">{m.label}</p>
                <p className={`text-2xl font-bold mb-1 ${m.color}`}>{m.value}</p>
                <p className="text-[9px] uppercase tracking-widest opacity-80" role="status" aria-label={`Metric status: ${m.status}`}>{m.status}</p>
              </motion.div>
            ))}
          </div>

          {/* Infrastructure Health */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6">
            <h2 className="text-xs font-bold text-content-tertiary mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> System Health Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Database className="w-3.5 h-3.5 text-content-tertiary" /> Main Database</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" role="status" aria-label="System status: Healthy" />
                </div>
                <div className="space-y-2 text-[11px] text-content-tertiary">
                  <div className="flex justify-between"><span>Processor Speed</span><span className="text-white">12% busy</span></div>
                  <div className="flex justify-between"><span>Memory Used</span><span className="text-white">4.1 / 16 GB</span></div>
                  <div className="flex justify-between"><span>Storage Speed</span><span className="text-white">8 MB/s</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[25%]" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-content-tertiary" /> Background Processing</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" role="status" aria-label="System status: Warning, high load" />
                </div>
                <div className="space-y-2 text-[11px] text-content-tertiary">
                  <div className="flex justify-between"><span>Tasks per minute</span><span className="text-white">342</span></div>
                  <div className="flex justify-between"><span>Average Wait Time</span><span className="text-amber-500">850ms</span></div>
                  <div className="flex justify-between"><span>Delayed Starts</span><span className="text-white">12</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[70%]" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-xs flex items-center gap-2"><Network className="w-3.5 h-3.5 text-content-tertiary" /> Network Firewall</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="space-y-2 text-[11px] text-content-tertiary">
                  <div className="flex justify-between"><span>Incoming Data</span><span className="text-white">2.4 Mbps</span></div>
                  <div className="flex justify-between"><span>Outgoing Data</span><span className="text-white">1.1 Mbps</span></div>
                  <div className="flex justify-between"><span>Blocked Hackers</span><span className="text-white">44 IPs</span></div>
                  <div className="w-full bg-white/5 h-1 mt-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[15%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={handleForceSync} className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 p-3 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all text-left">
              Force Global Sync Now
            </button>
            <button onClick={handleClearMemory} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-sm text-[11px] uppercase tracking-wider transition-all text-left">
              Clear Browser Cache
            </button>
            <button
              onClick={togglePlaid}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 p-3 rounded-sm text-[11px] uppercase tracking-wider transition-all text-left"
            >
              {isPlaidEnabled ? 'Turn off Bank Syncing' : 'Turn on Bank Syncing'}
            </button>
            <button
              onClick={toggleMaintenance}
              className={`p-3 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all text-left flex justify-between items-center ${isMaintenance ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30'}`}
            >
              <span>{isMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'}</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Advanced Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Business Overview */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-indigo-500/50 flex flex-col">
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" /> Business Overview
              </h2>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-[10px] text-content-tertiary uppercase tracking-widest mb-1">Monthly Revenue</p>
                  <p className="text-xl font-bold text-white">— <span className="text-[11px] text-content-muted font-normal">No billing integration yet</span></p>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-content-tertiary">Total Accounts</span>
                    <span className="text-white">{profiles.length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-content-tertiary">Completed Onboarding</span>
                    <span className="text-white">{profiles.filter(p => p.has_completed_onboarding).length}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-content-tertiary">Admins</span>
                    <span className="text-indigo-400">{profiles.filter(p => p.is_admin).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Global Broadcasts */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-amber-500/50 flex flex-col">
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mb-4">
                <Radio className="w-4 h-4" /> Message All Users
              </h2>
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] text-content-tertiary mb-2">Show a red warning banner to everyone on the app right now.</p>
                <textarea
                  className="w-full bg-black border border-white/10 p-2 text-[11px] text-white rounded-sm focus-app-field-amber resize-none h-16 mb-3 placeholder:text-content-muted"
                  placeholder="e.g., 'Expected downtime in 15 minutes.'"
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                />
                <button
                  onClick={handleSendBroadcast}
                  disabled={isSavingBroadcast}
                  className="w-full mt-auto bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 p-2 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-colors disabled:opacity-50"
                >
                  {isSavingBroadcast ? 'Sending...' : 'Send Message Now'}
                </button>
              </div>
            </div>

            {/* Support Tickets */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm border-t-2 border-t-rose-500/50 flex flex-col">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4" /> User Support Requests
                  {openTickets.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-sm">
                      {openTickets.length} open
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-3 flex-1 overflow-y-auto max-h-64 space-y-2">
                {ticketsLoading && (
                  <p className="text-[11px] text-content-muted p-2">Loading tickets...</p>
                )}
                {!ticketsLoading && openTickets.length === 0 && (
                  <p className="text-[11px] text-content-muted p-2">No open support tickets.</p>
                )}
                {openTickets.map(ticket => (
                  <div key={ticket.id} className="bg-black/40 border border-white/5 rounded-sm p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-content-tertiary">{ticket.ticket_number} · {ticket.userEmail}</p>
                        <p className="text-[11px] text-white font-bold truncate">{ticket.subject}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold shrink-0 ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-content-tertiary line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-content-muted">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => resolveTicket(ticket.id)}
                        disabled={resolvingTicketId === ticket.id}
                        className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {resolvingTicketId === ticket.id ? '...' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User Feedback */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm border-t-2 border-t-indigo-500/50 flex flex-col">
              <div className="p-5 border-b border-white/10">
                <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" /> User Feedback
                  {userFeedback.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-sm">
                      {userFeedback.length} total
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-3 flex-1 overflow-y-auto max-h-64 space-y-2">
                {feedbackLoading && (
                  <p className="text-[11px] text-content-muted p-2">Loading feedback...</p>
                )}
                {!feedbackLoading && userFeedback.length === 0 && (
                  <p className="text-[11px] text-content-muted p-2">No feedback submitted yet.</p>
                )}
                {userFeedback.map(fb => (
                  <div key={fb.id} className="bg-black/40 border border-white/5 rounded-sm p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-content-tertiary">{fb.userEmail} · {new Date(fb.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fb.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-2.5 h-2.5 ${s <= fb.rating! ? 'fill-amber-400 text-amber-400' : 'text-content-muted'}`} />
                            ))}
                          </div>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold ${
                          fb.type === 'bug' ? 'bg-rose-500/20 text-rose-400' :
                          fb.type === 'feature_request' ? 'bg-indigo-500/20 text-indigo-400' :
                          'bg-white/5 text-content-tertiary'
                        }`}>
                          {fb.type === 'feature_request' ? 'Feature' : fb.type === 'bug' ? 'Bug' : 'General'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-content-tertiary leading-relaxed">{fb.message}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Financial Core Overrides */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Tax Engine */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-emerald-500/50">
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mb-4">
                <Landmark className="w-4 h-4" /> Platform Tax Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-content-tertiary uppercase tracking-widest block mb-1">Standard Deduction Amount</label>
                  <input type="text" value={taxDeduction} onChange={(e) => setTaxDeduction(e.target.value)} className="w-full bg-black border border-white/10 px-3 py-2 text-[11px] text-emerald-400 font-mono rounded-sm focus-app-field-emerald" />
                </div>
                <div>
                  <label className="text-[10px] text-content-tertiary uppercase tracking-widest block mb-1">Highest Tax Bracket %</label>
                  <input type="text" value={taxBracket} onChange={(e) => setTaxBracket(e.target.value)} className="w-full bg-black border border-white/10 px-3 py-2 text-[11px] text-emerald-400 font-mono rounded-sm focus-app-field-emerald" />
                </div>
                <button
                  onClick={handleSaveTax}
                  disabled={isSavingTax}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 py-2 rounded-sm text-[11px] uppercase tracking-wider font-bold transition-all disabled:opacity-50"
                >
                  {isSavingTax ? 'Saving...' : 'Save Tax Settings'}
                </button>
              </div>
            </div>

            {/* Plaid Health */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-indigo-500/50">
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" /> Bank Connection Status
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-sm border border-white/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${isPlaidEnabled ? 'text-amber-500' : 'text-rose-500'}`} />
                    <span className={`text-[11px] font-bold ${isPlaidEnabled ? 'text-amber-400' : 'text-rose-400'}`}>Plaid Global API</span>
                  </div>
                  <button
                    onClick={togglePlaid}
                    className={`text-[10px] px-2 py-1 rounded-sm font-bold transition-colors ${isPlaidEnabled ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white'}`}
                  >
                    {isPlaidEnabled ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className="text-[10px] text-content-tertiary font-mono uppercase tracking-wider">Linked items</p>
                  <button
                    type="button"
                    onClick={refreshPlaidStats}
                    disabled={plaidStatsLoading}
                    className="text-[10px] px-2 py-1 rounded-sm font-bold bg-white/5 text-content-tertiary hover:bg-white/10 border border-white/10 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${plaidStatsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {plaidStats ? (
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-content-tertiary">
                    <dt className="text-content-muted">Items</dt>
                    <dd className="text-right text-content-secondary">{plaidStats.total_items}</dd>
                    <dt className="text-content-muted">Users</dt>
                    <dd className="text-right text-content-secondary">{plaidStats.distinct_users}</dd>
                    <dt className="text-content-muted">Sync errors</dt>
                    <dd className={`text-right ${plaidStats.items_with_sync_error > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {plaidStats.items_with_sync_error}
                    </dd>
                    <dt className="text-content-muted">Need relink</dt>
                    <dd className={`text-right ${plaidStats.items_needing_relink > 0 ? 'text-amber-400' : 'text-content-secondary'}`}>
                      {plaidStats.items_needing_relink}
                    </dd>
                    <dt className="text-content-muted">Never synced</dt>
                    <dd className="text-right text-content-secondary">{plaidStats.items_never_synced}</dd>
                    <dt className="text-content-muted">Stale 24h</dt>
                    <dd className="text-right text-content-secondary">{plaidStats.items_stale_24h}</dd>
                  </dl>
                ) : (
                  <p className="text-[10px] text-content-muted">No metrics yet — refresh or check admin-actions.</p>
                )}
              </div>
            </div>

            {/* AI / NLP */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 border-t-2 border-t-cyan-500/50 flex flex-col">
              <div className="mb-4">
                <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mb-2">
                  <Coins className="w-4 h-4" /> Smart Feature Daily Cost
                </h2>
                <div className="flex items-end justify-between border-b border-white/5 pb-2">
                  <span className="text-xl font-mono text-cyan-400">— <span className="text-[10px] text-content-tertiary">not connected</span></span>
                  <span className="text-[10px] text-content-tertiary">Limit: $50/day</span>
                </div>
                <div className="w-full bg-white/5 h-1 mt-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full w-0" />
                </div>
              </div>
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2 mt-4 mb-2">
                <BookOpen className="w-4 h-4" /> Fix Incorrect Categories
              </h2>
              <div className="flex gap-2 mb-2">
                <input type="text" value={categoryWord} onChange={e => setCategoryWord(e.target.value)} placeholder="Word (e.g. Starbucks)" className="w-1/2 bg-black border border-white/10 px-2 py-1.5 text-[10px] text-white font-mono rounded-sm focus-app-field-cyan" />
                <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Category (e.g. Food)" className="w-1/2 bg-black border border-white/10 px-2 py-1.5 text-[10px] text-white font-mono rounded-sm focus-app-field-cyan" />
              </div>
              <button onClick={handleSaveCategoryFix} disabled={isSavingCategoryFix} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-1.5 rounded-sm text-[10px] uppercase font-bold transition-all disabled:opacity-50">
                {isSavingCategoryFix ? 'Saving...' : 'Save Category Fix'}
              </button>
            </div>

            {/* Pending Queue */}
            <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-5 flex items-center justify-between lg:col-span-3 border-t-2 border-t-surface-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-full">
                  <Clock className="w-5 h-5 text-content-tertiary" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-content-tertiary">PENDING TRANSACTIONS TO PROCESS</h2>
                  <p className="text-[10px] text-content-tertiary mt-1">Number of transactions waiting to be added to user accounts.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-white tracking-widest">
                  {pendingCount === null ? '—' : pendingCount}
                </p>
                <p className={`text-[10px] font-bold uppercase ${pendingCount === null ? 'text-content-muted' : pendingCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {pendingCount === null ? 'Loading...' : pendingCount > 0 ? 'Awaiting Review' : 'All Clear'}
                </p>
              </div>
            </div>

          </div>

          {/* User Management */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-content-tertiary flex items-center gap-2">
                <Users className="w-4 h-4" /> User Controls List
                <span className="text-content-muted font-normal">({filteredProfiles.length} shown)</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted" />
                <input
                  type="text"
                  placeholder="Search email or ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-black border border-white/10 pl-7 pr-3 py-1.5 text-[11px] rounded-sm focus-app-field-indigo w-52 text-white placeholder:text-content-muted"
                />
              </div>
            </div>

            <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/10 text-content-tertiary">
                  <th className="pb-3 px-2 font-normal">Account</th>
                  <th className="pb-3 px-2 font-normal">Joined</th>
                  <th className="pb-3 px-2 font-normal">Onboarding</th>
                  <th className="pb-3 px-2 font-normal">Last Login</th>
                  <th className="pb-3 px-2 font-normal">Status</th>
                  <th className="pb-3 px-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-content-secondary">
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-2 text-center text-content-muted">
                      {userSearch ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
                {filteredProfiles.map(user => {
                  const enriched = getEnrichedProfile(user);
                  return (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-3 px-2">
                        <div>
                          <span className={user.is_admin ? 'text-indigo-400 font-bold' : ''}>
                            {user.email || user.id.slice(0, 12) + '...'}
                          </span>
                          {user.is_admin && <span className="ml-1.5 text-[9px] bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded-sm font-bold">ADMIN</span>}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-content-tertiary">{enriched.joinedAt}</td>
                      <td className="py-3 px-2">
                        {user.has_completed_onboarding
                          ? <span className="text-emerald-500">Complete</span>
                          : <span className="text-amber-500">In Progress</span>}
                      </td>
                      <td className="py-3 px-2 text-content-tertiary">{enriched.lastLogin}</td>
                      <td className="py-3 px-2">
                        {user.is_banned
                          ? <span className="text-rose-500 font-bold">Banned</span>
                          : <span className="text-emerald-500">Active</span>}
                      </td>
                      <td className="py-3 px-2 text-right space-x-1.5">
                        {user.is_admin ? (
                          <button
                            type="button"
                            onClick={() => void handleDemoteAdmin(user.id)}
                            disabled={
                              !PRIMARY_ADMIN_EMAIL ||
                              (user.email?.trim().toLowerCase() ?? '') === PRIMARY_ADMIN_EMAIL
                            }
                            className="px-2 py-1 rounded-sm font-bold transition-colors text-[10px] bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={
                              (user.email?.trim().toLowerCase() ?? '') === PRIMARY_ADMIN_EMAIL
                                ? 'Primary admin cannot be demoted here'
                                : 'Remove admin access'
                            }
                          >
                            Demote
                          </button>
                        ) : (
                          <span className="text-[10px] text-content-muted px-2">—</span>
                        )}
                        {user.is_banned ? (
                          <button
                            onClick={() => handleAdminAction('unban', user.id)}
                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 rounded-sm font-bold transition-colors"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdminAction('ban', user.id)}
                            className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-2 py-1 rounded-sm font-bold transition-colors"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => handleAdminAction('delete', user.id)}
                          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded-sm font-bold transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Column: Live Activity Log */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-sm flex flex-col h-full overflow-hidden relative">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40 xl:sticky top-0 sticky">
            <h2 className="text-[11px] font-bold text-content-tertiary flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> LIVE ACTIVITY LOG
            </h2>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono text-[11px] min-h-0">
            {activityLog.length === 0 && (
              <div className="flex gap-3 items-start border-l-2 border-emerald-500 pl-3 py-1 animate-pulse">
                <span className="text-emerald-500 shrink-0">Now</span>
                <span className="text-emerald-500 shrink-0 font-bold">[SYS]</span>
                <span className="text-emerald-400">Initializing...</span>
              </div>
            )}
            {activityLog.filter(log =>
              !logFilter.trim() ||
              log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
              log.level.toLowerCase().includes(logFilter.toLowerCase())
            ).map((log, idx) => (
              <div key={idx} className={`flex gap-3 items-start border-l-2 pl-3 py-1 ${
                log.level === 'ERROR' ? 'border-rose-500' :
                log.level === 'WARN' ? 'border-amber-500' :
                log.level === 'SYS' ? 'border-emerald-500' :
                'border-white/10'
              }`}>
                <span className="text-content-muted shrink-0">{log.time}</span>
                <span className={`shrink-0 font-bold ${
                  log.level === 'ERROR' ? 'text-rose-500' :
                  log.level === 'WARN' ? 'text-amber-500' :
                  log.level === 'SYS' ? 'text-emerald-500' :
                  'text-indigo-400'
                }`}>[{log.level}]</span>
                <span className="text-content-secondary break-words">{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div className="p-3 border-t border-white/5 bg-black/40">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">{'>'}</span>
              <input
                type="text"
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                placeholder="Filter log..."
                className="bg-transparent border-none w-full text-[11px] text-white focus-app placeholder:text-content-muted"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
