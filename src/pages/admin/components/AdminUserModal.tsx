import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  userId: string | null;
  onClose: () => void;
  invokeAdminActions: (body: Record<string, unknown>) => Promise<{ data: any; error: any }>;
  primaryAdminEmail: string;
}

interface UserDetail {
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
}

const SECTION_HEADER = 'text-xs font-semibold text-content-primary uppercase tracking-wide mb-2 mt-4';

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtUsd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SUB_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  past_due: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  canceled: 'bg-surface-elevated text-content-muted border-surface-border',
  unpaid: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    SUB_STATUS_COLORS[status.toLowerCase()] ??
    'bg-surface-elevated text-content-secondary border-surface-border';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${cls}`}>
      {status}
    </span>
  );
}

export function AdminUserModal({ userId, onClose, invokeAdminActions, primaryAdminEmail }: Props) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    if (!userId) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    invokeAdminActions({ action: 'user_detail', targetUserId: userId }).then(({ data, error: err }) => {
      if (cancelled) return;
      setLoading(false);
      if (err) {
        setError(typeof err === 'string' ? err : (err as any)?.message ?? 'Failed to load user.');
      } else {
        setDetail((data?.user_detail ?? data) as UserDetail);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userId, onClose]);

  if (!userId) return null;

  const handleImpersonate = async () => {
    if (!userId) return;
    setImpersonating(true);
    const { data, error: err } = await invokeAdminActions({ action: 'impersonate', targetUserId: userId });
    setImpersonating(false);
    if (err) {
      toast.error(typeof err === 'string' ? err : (err as any)?.message ?? 'Impersonation failed.');
      return;
    }
    const link = data?.magic_link as string | undefined;
    if (link) {
      window.open(link, '_blank', 'noopener');
      toast.success('Magic link opened in new tab.');
    } else {
      toast.error('No magic link returned.');
    }
  };

  const isOwnAccount =
    (detail?.profile.email?.trim().toLowerCase() ?? '') === primaryAdminEmail.trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-raised rounded-lg border border-surface-border p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-content-muted hover:text-content-primary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-content-muted text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading user…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-10 text-center text-rose-400 text-xs">{error}</div>
        )}

        {/* Content */}
        {!loading && !error && detail && (
          <>
            {/* Header */}
            <div className="pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-content-primary text-sm">
                  {detail.profile.email ?? '(no email)'}
                </span>
                {detail.profile.is_admin && (
                  <span className="inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium bg-white/[0.06] text-content-secondary border-surface-border">
                    Admin
                  </span>
                )}
                {detail.profile.is_banned && (
                  <span className="inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium bg-rose-500/15 text-rose-300 border-rose-500/30">
                    Banned
                  </span>
                )}
              </div>
              <p className="text-xs text-content-muted mt-0.5">{detail.profile.id}</p>
              <p className="text-xs text-content-tertiary mt-0.5">
                Member since {fmtDate(detail.profile.created_at)}
              </p>
            </div>

            {/* Impersonate */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleImpersonate}
                disabled={isOwnAccount || impersonating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {impersonating && <Loader2 className="w-3 h-3 animate-spin" />}
                Impersonate User
              </button>
            </div>

            {/* Entitlements & Subscriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <p className={SECTION_HEADER}>Entitlements</p>
                {detail.entitlements.length === 0 ? (
                  <p className="text-xs text-content-muted">No active entitlements.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.entitlements.map((ent) => (
                      <li key={ent.id} className="rounded-lg border border-surface-border bg-surface-elevated p-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-content-primary font-medium">{ent.feature_key}</span>
                          <StatusBadge status={ent.status} />
                        </div>
                        <div className="text-content-muted mt-0.5">
                          Source: {ent.source}
                          {ent.ends_at ? ` · Ends ${fmtDate(ent.ends_at)}` : ''}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className={SECTION_HEADER}>Subscriptions</p>
                {detail.subscriptions.length === 0 ? (
                  <p className="text-xs text-content-muted">No subscriptions.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {detail.subscriptions.map((sub) => (
                      <li key={sub.id} className="rounded-lg border border-surface-border bg-surface-elevated p-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={sub.status} />
                          {sub.cancel_at_period_end && (
                            <span className="text-[10px] text-amber-300">(cancels at period end)</span>
                          )}
                        </div>
                        <div className="text-content-muted mt-0.5 font-mono">
                          {sub.stripe_subscription_id.slice(0, 20)}
                        </div>
                        {(sub.current_period_start || sub.current_period_end) && (
                          <div className="text-content-muted mt-0.5">
                            {fmtDate(sub.current_period_start)} – {fmtDate(sub.current_period_end)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Payment History */}
            <p className={SECTION_HEADER}>Payment History</p>
            {detail.payments.length === 0 ? (
              <p className="text-xs text-content-muted">No payments.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-content-tertiary border-b border-surface-border">
                      <th className="py-2 text-left font-medium">Date</th>
                      <th className="py-2 text-left font-medium">Product</th>
                      <th className="py-2 text-left font-medium">Amount</th>
                      <th className="py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.map((p) => (
                      <tr key={p.id} className="border-b border-surface-border/60">
                        <td className="py-2 pr-3 text-content-tertiary">{fmtDate(p.created_at)}</td>
                        <td className="py-2 pr-3 text-content-secondary">{p.product_key ?? '—'}</td>
                        <td className="py-2 pr-3 text-content-primary">{fmtUsd(p.amount_total)}</td>
                        <td className="py-2">
                          <span
                            className={
                              p.status === 'paid' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Plaid Connections */}
            <p className={SECTION_HEADER}>Plaid Connections</p>
            {detail.plaid_items.length === 0 ? (
              <p className="text-xs text-content-muted">No linked bank accounts.</p>
            ) : (
              <ul className="space-y-1.5">
                {detail.plaid_items.map((item, i) => {
                  const plaidStatus = item.item_login_required
                    ? 'Needs relink'
                    : item.last_sync_error
                    ? 'Error'
                    : 'OK';
                  const plaidStatusColor =
                    item.item_login_required
                      ? 'text-amber-300'
                      : item.last_sync_error
                      ? 'text-rose-400'
                      : 'text-emerald-400';
                  return (
                    <li
                      key={i}
                      className="rounded-lg border border-surface-border bg-surface-elevated p-2 text-xs flex flex-wrap items-center gap-3"
                    >
                      <span className="text-content-primary font-medium">
                        {item.institution_name ?? 'Unknown institution'}
                      </span>
                      <span className="text-content-muted">
                        {item.last_sync_at ? `Last sync ${fmtDate(item.last_sync_at)}` : 'Never synced'}
                      </span>
                      <span className={plaidStatusColor}>{plaidStatus}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Support Tickets */}
            <p className={SECTION_HEADER}>Support Tickets</p>
            {detail.tickets.length === 0 ? (
              <p className="text-xs text-content-muted">No tickets.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-content-tertiary border-b border-surface-border">
                      <th className="py-2 text-left font-medium">#</th>
                      <th className="py-2 text-left font-medium">Subject</th>
                      <th className="py-2 text-left font-medium">Status</th>
                      <th className="py-2 text-left font-medium">Priority</th>
                      <th className="py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-surface-border/60">
                        <td className="py-2 pr-3 text-content-muted font-mono">{ticket.ticket_number}</td>
                        <td className="py-2 pr-3 text-content-secondary max-w-[180px] truncate">
                          {ticket.subject}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="py-2 pr-3 text-content-tertiary capitalize">{ticket.priority}</td>
                        <td className="py-2 text-content-tertiary">{fmtDate(ticket.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
