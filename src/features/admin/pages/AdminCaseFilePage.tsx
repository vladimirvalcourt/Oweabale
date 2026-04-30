import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Search,
  Shield,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/api/supabase';
import { useAdminPermissions } from '@/features/admin/shared';
import { useMemo } from 'react';
import { AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { cn } from '@/lib/utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SECTION = 'text-[11px] font-semibold uppercase tracking-wide text-content-tertiary mb-2 mt-6';

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type UserDetail = {
  profile: {
    id: string;
    email: string | null;
    is_admin: boolean;
    is_banned: boolean;
    has_completed_onboarding: boolean;
    created_at: string | null;
  };
  entitlements: Array<{
    id: string;
    feature_key: string;
    status: string;
    source: string;
    starts_at: string;
    ends_at: string | null;
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    stripe_subscription_id: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    amount_total: number;
    currency: string;
    status: string;
    product_key: string | null;
    created_at: string;
  }>;
  plaid_items: Array<{
    institution_name: string | null;
    last_sync_at: string | null;
    last_sync_error: string | null;
    item_login_required: boolean;
  }>;
  tickets: Array<{
    id: string;
    ticket_number: string;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
  }>;
  admin_notes: Array<{ id: string; note_type: string; body: string; created_at: string }>;
  lifecycle_events: Array<{ id: string; action: string; reason_code: string; reason: string; created_at: string }>;
  trial_events: Array<{ id: string; additional_days: number; new_trial_ends_at: string; reason: string; created_at: string }>;
  deletion_reviews: Array<{ id: string; status: string; reason_code: string; reason: string; created_at: string }>;
  compliance?: {
    user_id: string;
    kyc_status: string;
    aml_status: string;
    pep_sanctions_hit: boolean;
    risk_score: number;
    last_checked_at: string | null;
    updated_at: string | null;
  } | null;
};

type TimelineRow = { source: string; at: string; label: string; detail?: unknown };

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'active'
      ? 'text-emerald-700 border-emerald-500/30 dark:text-emerald-200'
      : s === 'trialing'
        ? 'text-sky-700 border-sky-500/30 dark:text-sky-200'
        : s === 'past_due'
          ? 'text-amber-700 border-amber-500/30 dark:text-amber-200'
          : 'text-content-muted border-surface-border';
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{status}</span>
  );
}

export default function AdminCaseFilePage() {
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAdminPermissions();
  const canReadUsers = hasPermission('users.read');
  const primaryAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? '';

  // UUID lookup
  const [lookupDraft, setLookupDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [emailSearchLoading, setEmailSearchLoading] = useState(false);
  const [emailSearchError, setEmailSearchError] = useState<string | null>(null);

  const [impersonationReason, setImpersonationReason] = useState('');

  const userId = userIdParam?.trim() ?? '';
  const validUser = UUID_RE.test(userId);

  const detailQuery = useQuery({
    queryKey: ['admin', 'case-file', 'detail', userId],
    enabled: validUser && canReadUsers,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'user_detail', targetUserId: userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return (data as { user_detail?: UserDetail })?.user_detail ?? null;
    },
  });

  const timelineQuery = useQuery({
    queryKey: ['admin', 'case-file', 'timeline', userId],
    enabled: validUser && canReadUsers,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'user_timeline', targetUserId: userId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return ((data as { timeline?: TimelineRow[] })?.timeline ?? []) as TimelineRow[];
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'impersonate', targetUserId: userId, reason: impersonationReason.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data as { magic_link_url?: string; secure_handoff?: boolean };
    },
    onSuccess: (data) => {
      const url = data?.magic_link_url;
      if (typeof url === 'string' && url.length > 0) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('Magic link opened in a new tab. Session is audited and expires in 15 minutes.');
        void qc.invalidateQueries({ queryKey: ['admin', 'case-file'] });
      } else {
        toast.error('Impersonation handoff URL missing.');
      }
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? 'Impersonation failed.');
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'revoke_sessions', targetUserId: userId, revokeScope: 'global' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sessions revoked globally for this user.');
      void qc.invalidateQueries({ queryKey: ['admin', 'case-file', userId] });
    },
    onError: (e: Error) => {
      toast.error(e?.message ?? 'Failed to revoke sessions.');
    },
  });

  const detail = detailQuery.data;
  const isOwnAccount =
    (detail?.profile.email?.trim().toLowerCase() ?? '') === primaryAdminEmail && primaryAdminEmail.length > 0;

  const timeline = useMemo(() => (timelineQuery.data ?? []).slice(0, 60), [timelineQuery.data]);

  const openLookup = () => {
    const id = lookupDraft.trim();
    if (!UUID_RE.test(id)) {
      toast.error('Enter a valid user UUID.');
      return;
    }
    navigate(`/admin/user/${id}`);
  };

  const handleEmailSearch = async () => {
    const email = emailDraft.trim().toLowerCase();
    if (!email) {
      toast.error('Enter an email address.');
      return;
    }
    setEmailSearchLoading(true);
    setEmailSearchError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      if (error) throw error;
      if (!data?.id) {
        setEmailSearchError('No user found with that email');
        return;
      }
      setLookupDraft(data.id);
      navigate(`/admin/user/${data.id}`);
    } catch (err) {
      setEmailSearchError((err as Error).message ?? 'Search failed');
    } finally {
      setEmailSearchLoading(false);
    }
  };

  if (!canReadUsers) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-content-tertiary">
        You do not have permission to view user case files.
      </section>
    );
  }

  if (!userIdParam) {
    return (
      <section className="mx-auto max-w-xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <div className="border border-surface-border p-6">
          <div className="mb-4 flex items-center gap-2 text-content-primary">
            <UserRound className="h-5 w-5" />
            <h1 className="text-lg font-semibold">User case file</h1>
          </div>
          <p className="text-xs text-content-tertiary">
            Paste a user id (UUID) or search by email to open billing, Plaid, compliance, and timeline in one place.
          </p>

          {/* UUID search */}
          <label className="mt-4 block text-[11px] font-medium text-content-secondary">
            User UUID
            <input
              value={lookupDraft}
              onChange={(e) => setLookupDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openLookup()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="focus-app-field mt-1 w-full border border-surface-border px-3 py-2 font-mono text-xs text-content-primary"
            />
          </label>
          <button
            type="button"
            onClick={() => openLookup()}
            className="interactive-press interactive-focus mt-3 w-full border border-content-primary py-2 text-xs font-semibold text-content-primary"
          >
            Open case file
          </button>

          <div className="mt-5 border-t border-surface-border pt-4">
            <p className="mb-2 text-[11px] font-medium text-content-tertiary uppercase tracking-wide">Or search by email</p>
            <div className="flex gap-2">
              <input
                value={emailDraft}
                onChange={(e) => { setEmailDraft(e.target.value); setEmailSearchError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && void handleEmailSearch()}
                placeholder="user@example.com"
                type="email"
                className="focus-app-field flex-1 border border-surface-border px-3 py-2 text-xs text-content-primary"
              />
              <button
                type="button"
                disabled={emailSearchLoading}
                onClick={() => void handleEmailSearch()}
                className="interactive-press interactive-focus inline-flex items-center gap-1 border border-surface-border px-3 py-2 text-xs text-content-secondary disabled:opacity-50"
              >
                {emailSearchLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </button>
            </div>
            {emailSearchError ? (
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-200">{emailSearchError}</p>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] text-content-muted">
            Tip: from <Link className="text-brand-cta underline-offset-2 hover:underline" to="/admin/data">Data → Profiles</Link>, use{' '}
            <span className="font-medium text-content-secondary">Case file</span> on a row.
          </p>
        </div>
      </section>
    );
  }

  if (!validUser) {
    return (
      <section className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-rose-700 dark:text-rose-200">Invalid user id in URL.</p>
        <Link to="/admin/user" className="mt-3 inline-block text-xs text-brand-cta hover:underline">
          ← Back to lookup
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Users"
        title="Operator case file"
        description="Consolidated account investigation for support, security, billing, Plaid, and compliance. Controlled actions stay isolated and audited."
        actions={
          <>
          <Link
            to="/admin/user"
            className={cn(adminButtonClass, 'py-1.5')}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> User lookup
          </Link>
          <Link
            to="/admin"
            className={cn(adminButtonClass, 'py-1.5')}
          >
            <Shield className="h-3.5 w-3.5" /> Overview & controls
          </Link>
          <Link
            to="/admin/sessions"
            className={cn(adminButtonClass, 'py-1.5')}
          >
            Sessions
          </Link>
          <Link
            to="/admin/compliance"
            className={cn(adminButtonClass, 'py-1.5')}
          >
            Compliance
          </Link>
          <Link
            to="/admin/telemetry"
            className={cn(adminButtonClass, 'py-1.5')}
          >
            Telemetry
          </Link>
          </>
        }
        metrics={[
          { label: 'Status', value: detail?.profile?.is_banned ? 'Banned' : 'Active', tone: detail?.profile?.is_banned ? 'danger' : 'good' },
          { label: 'Admin', value: detail?.profile?.is_admin ? 'Yes' : 'No', tone: detail?.profile?.is_admin ? 'warn' : 'default' },
          { label: 'Entitlements', value: detail?.entitlements?.length ?? '—' },
          { label: 'Risk', value: detail?.compliance?.risk_score ?? '—', tone: (detail?.compliance?.risk_score ?? 0) >= 75 ? 'danger' : 'default' },
        ]}
      />

      {detailQuery.isLoading || timelineQuery.isLoading ? (
        <div className="flex items-center gap-2 border border-surface-border p-8 text-xs text-content-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading case file…
        </div>
      ) : null}

      {detailQuery.error ? (
        <p className="border border-rose-500/30 p-4 text-xs text-rose-200">
          {(detailQuery.error as Error)?.message ?? 'Failed to load user.'}
        </p>
      ) : null}

      {!detailQuery.isLoading && detail?.profile ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <AdminPanel>
            <div className="sticky top-0 z-10 -mx-0 border-b border-surface-border bg-surface-raised/95 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-content-primary">{detail.profile.email ?? '(no email)'}</span>
              {detail.profile.is_admin ? (
                <AdminStatusBadge tone="warn">Admin</AdminStatusBadge>
              ) : null}
              {detail.profile.is_banned ? (
                <AdminStatusBadge tone="danger">Banned</AdminStatusBadge>
              ) : null}
              {detail.profile.has_completed_onboarding ? <AdminStatusBadge tone="good">Onboarded</AdminStatusBadge> : <AdminStatusBadge>Setup open</AdminStatusBadge>}
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-content-muted">
              <span className="max-w-full truncate" title={detail.profile.id}>
                {detail.profile.id}
              </span>
              <button
                type="button"
                className="interactive-focus inline-flex items-center gap-1 rounded border border-surface-border px-1.5 py-0.5 text-[10px] text-content-tertiary hover:text-content-secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(detail.profile.id);
                  toast.success('User id copied');
                }}
              >
                <ClipboardCopy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="text-xs text-content-tertiary">Member since {fmtDate(detail.profile.created_at)}</p>
            </div>
            <div className="space-y-1 p-5">

            {isSuperAdmin ? (
              <div className="mt-4 border border-amber-500/35 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">Super-admin actions</p>
                <p className="mt-1 text-[11px] text-content-secondary">
                  Impersonation signs you in as this user in a new tab (full app access). Use a dedicated browser profile
                  for stricter isolation. Every handoff is audited; magic links are single-use.
                </p>
                <textarea
                  value={impersonationReason}
                  onChange={(e) => setImpersonationReason(e.target.value)}
                  rows={2}
                  placeholder="Reason (min. 8 characters, stored in audit log)"
                  className={cn(adminInputClass, 'mt-2 w-full text-content-secondary')}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isOwnAccount || impersonateMutation.isPending}
                    onClick={() => {
                      if (impersonationReason.trim().length < 8) {
                        toast.error('Add an impersonation reason (at least 8 characters).');
                        return;
                      }
                      if (!window.confirm('Open a magic link to sign in as this user in a new tab?')) return;
                      impersonateMutation.mutate();
                    }}
                    className="interactive-press inline-flex items-center gap-1 border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-100"
                  >
                    {impersonateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Impersonate (magic link)
                  </button>
                  <button
                    type="button"
                    disabled={revokeSessionsMutation.isPending}
                    onClick={() => {
                      if (!window.confirm('Revoke all Supabase sessions for this user globally?')) return;
                      revokeSessionsMutation.mutate();
                    }}
                    className={cn(adminDangerButtonClass, 'py-1.5 text-[11px]')}
                  >
                    {revokeSessionsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Revoke sessions
                  </button>
                </div>
              </div>
            ) : null}

            <p className={SECTION}>Entitlements</p>
            {detail.entitlements.length === 0 ? (
              <p className="text-xs text-content-muted">No entitlements.</p>
            ) : (
              <ul className="space-y-2">
                {detail.entitlements.map((ent) => (
                  <li key={ent.id} className="border border-surface-border p-2 text-xs">
                    <span className="font-medium text-content-primary">{ent.feature_key}</span>{' '}
                    <StatusBadge status={ent.status} />
                    <span className="mt-1 block text-content-muted">
                      {ent.source}
                      {ent.ends_at ? ` · ends ${fmtDate(ent.ends_at)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className={SECTION}>Billing</p>
            <p className="mb-1 text-[11px] text-content-muted">Recent subscriptions</p>
            {detail.subscriptions.length === 0 ? (
              <p className="text-xs text-content-muted">No subscriptions.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {detail.subscriptions.map((s) => (
                  <li key={s.id} className="border border-surface-border px-2 py-1.5">
                    <StatusBadge status={s.status} />
                    <span className="ml-2 text-content-muted">{s.stripe_subscription_id}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-1 mt-3 text-[11px] text-content-muted">Recent payments</p>
            {detail.payments.length === 0 ? (
              <p className="text-xs text-content-muted">No payments.</p>
            ) : (
              <ul className="space-y-1 text-xs text-content-secondary">
                {detail.payments.map((p) => (
                  <li key={p.id}>
                    {fmtUsd(p.amount_total)} {p.currency?.toUpperCase()} · {p.status} · {fmtDate(p.created_at)}
                  </li>
                ))}
              </ul>
            )}

            <p className={SECTION}>Plaid</p>
            {detail.plaid_items.length === 0 ? (
              <p className="text-xs text-content-muted">No Plaid items.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {detail.plaid_items.map((it, i) => (
                  <li key={i} className="border border-surface-border p-2">
                    <span className="font-medium text-content-primary">{it.institution_name ?? 'Institution'}</span>
                    {it.item_login_required ? (
                      <span className="ml-2 text-amber-700 dark:text-amber-200">Needs relink</span>
                    ) : null}
                    {it.last_sync_error ? (
                      <span className="mt-1 block text-rose-200/90">{String(it.last_sync_error)}</span>
                    ) : null}
                    <span className="mt-0.5 block text-content-muted">Last sync {fmtDate(it.last_sync_at)}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className={SECTION}>Support tickets</p>
            {detail.tickets.length === 0 ? (
              <p className="text-xs text-content-muted">No tickets.</p>
            ) : (
              <ul className="space-y-1 text-xs text-content-secondary">
                {detail.tickets.map((t) => (
                  <li key={t.id}>
                    #{t.ticket_number} · {t.subject} · {t.status}
                  </li>
                ))}
              </ul>
            )}

            <p className={SECTION}>Admin risk notes</p>
            {detail.admin_notes.length === 0 ? (
              <p className="text-xs text-content-muted">No admin notes.</p>
            ) : (
              <ul className="space-y-2 text-xs text-content-secondary">
                {detail.admin_notes.map((note) => (
                  <li key={note.id} className="border border-surface-border p-2">
                    <span className="font-semibold text-content-primary">{note.note_type}</span>
                    <p className="mt-1">{note.body}</p>
                    <p className="mt-1 text-[10px] text-content-muted">{fmtDate(note.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}

            <p className={SECTION}>Lifecycle and billing ops</p>
            {[...detail.lifecycle_events, ...detail.trial_events, ...detail.deletion_reviews].length === 0 ? (
              <p className="text-xs text-content-muted">No lifecycle, deletion, or trial-extension events.</p>
            ) : (
              <ul className="space-y-2 text-xs text-content-secondary">
                {detail.lifecycle_events.map((event) => (
                  <li key={event.id} className="border border-surface-border p-2">
                    {event.action} · {event.reason_code}
                    <p className="mt-1 text-content-muted">{event.reason}</p>
                  </li>
                ))}
                {detail.trial_events.map((event) => (
                  <li key={event.id} className="border border-surface-border p-2">
                    Trial +{event.additional_days} days · ends {fmtDate(event.new_trial_ends_at)}
                    <p className="mt-1 text-content-muted">{event.reason}</p>
                  </li>
                ))}
                {detail.deletion_reviews.map((review) => (
                  <li key={review.id} className="border border-surface-border p-2">
                    Deletion review · {review.status} · {review.reason_code}
                    <p className="mt-1 text-content-muted">{review.reason}</p>
                  </li>
                ))}
              </ul>
            )}

            {detail.compliance ? (
              <>
                <p className={SECTION}>Compliance snapshot</p>
                <div className="border border-surface-border p-3 text-xs text-content-secondary">
                  <p>KYC: {detail.compliance.kyc_status}</p>
                  <p>AML: {detail.compliance.aml_status}</p>
                  <p>Risk score: {detail.compliance.risk_score}</p>
                  <p>PEP / sanctions hit: {detail.compliance.pep_sanctions_hit ? 'Yes' : 'No'}</p>
                  <p className="text-content-muted">Updated {fmtDate(detail.compliance.updated_at)}</p>
                </div>
              </>
            ) : null}

            <p className={SECTION}>Timeline</p>
            {timeline.length === 0 ? (
              <p className="text-xs text-content-muted">No timeline events.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
                {timeline.map((row, idx) => (
                  <li key={idx} className="border-l-2 border-surface-border pl-2">
                    <span className="text-content-muted">{fmtDate(row.at)}</span>
                    <span className="ml-2 text-[10px] uppercase text-content-tertiary">{row.source}</span>
                    <p className="text-content-secondary">{row.label}</p>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </AdminPanel>

          <aside className="space-y-3 border border-surface-border bg-surface-raised/60 p-4 text-xs text-content-secondary">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Runbooks</p>
            <ul className="list-inside list-disc space-y-1 text-[11px] text-content-muted">
              <li>Plaid relink: confirm item_login_required, then user reconnects from app.</li>
              <li>Billing: compare Stripe dashboard with subscriptions above.</li>
              <li>After impersonation, sign out or close the tab to return to your admin session.</li>
            </ul>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
