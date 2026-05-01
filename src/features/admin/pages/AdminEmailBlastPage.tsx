import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/api/supabase';
import { useAdminPermissions } from '@/features/admin/shared';
import { AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { cn } from '@/lib/utils';

type AudienceFilter = 'all' | 'free' | 'pro' | 'lifetime' | 'inactive_30d' | 'needs_relink';

type BlastRow = {
  id: string;
  subject: string;
  audience_filter: string;
  recipient_count: number;
  sent_at: string;
  status: string;
};

const AUDIENCE_OPTIONS: { value: AudienceFilter; label: string; description: string }[] = [
  { value: 'all', label: 'All users', description: 'Every registered user' },
  { value: 'free', label: 'Free tier only', description: 'Users without an active paid subscription' },
  { value: 'pro', label: 'Pro subscribers', description: 'Users with active Pro subscription' },
  { value: 'lifetime', label: 'Lifetime members', description: 'Lifetime entitlement holders' },
  { value: 'inactive_30d', label: 'Inactive 30d+', description: 'Haven\'t signed in for 30+ days' },
  { value: 'needs_relink', label: 'Bank relink needed', description: 'Plaid item_login_required = true' },
];

export default function AdminEmailBlastPage() {
  const { hasPermission, isSuperAdmin } = useAdminPermissions();
  const canSend = isSuperAdmin || hasPermission('moderation.manage');
  const backendEnabled = false;

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [preview, setPreview] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const { data: blasts = [], isLoading } = useQuery({
    queryKey: ['admin', 'email-blasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_email_blasts')
        .select('id, subject, audience_filter, recipient_count, sent_at, status')
        .order('sent_at', { ascending: false })
        .limit(50);
      if (error) return [] as BlastRow[];
      return (data ?? []) as BlastRow[];
    },
  });

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Comms"
        title="Campaign composer"
        description="Send targeted operational or marketing broadcasts with preview, permission checks, and a deliberate final confirmation."
        metrics={[
          { label: 'History', value: blasts.length },
          { label: 'Permission', value: canSend ? 'Can compose' : 'Read only', tone: canSend ? 'good' : 'warn' },
          { label: 'Sender', value: backendEnabled ? 'Enabled' : 'Disabled', tone: backendEnabled ? 'good' : 'warn' },
          { label: 'Preview', value: preview ? 'Open' : 'Edit' },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <AdminPanel title="Compose" description="Preview first. Broad sends are treated as controlled actions.">
          <div className="space-y-4 p-5">

            {!canSend ? (
              <div className="border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] p-3 text-xs text-[var(--color-status-warning-text)] dark:text-[var(--color-status-warning-text-dark)]">
                You need super-admin or moderation.manage permission to send email blasts.
              </div>
            ) : null}
            <div className="border border-[var(--color-status-warning-border)] bg-[var(--color-status-warning-bg)] p-3 text-xs leading-5 text-[var(--color-status-warning-text)] dark:text-[var(--color-status-warning-text-dark)]">
              Sending is disabled until the backend has a real queued sender with suppression lists,
              unsubscribe enforcement, recipient estimates, rate limits, and audit records.
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-content-secondary">Audience</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAudience(opt.value)}
                    className={`border bg-surface-base p-2 text-left transition-colors ${audience === opt.value
                        ? 'border-content-primary text-content-primary'
                        : 'border-surface-border text-content-secondary hover:border-content-primary hover:text-content-primary'
                      }`}
                  >
                    <p className="text-[11px] font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-content-muted mt-0.5">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-medium text-content-secondary">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short, specific subject"
                className={cn(adminInputClass, 'w-full')}
                maxLength={150}
              />
            </div>

            {/* Body */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[11px] font-medium text-content-secondary">Body (plain text or HTML)</label>
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  className={cn(adminButtonClass, 'px-2 py-1 text-[10px]')}
                >
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {preview ? (
                <iframe
                  srcDoc={body}
                  sandbox=""
                  title="Email preview"
                  className="min-h-52 w-full border border-surface-border bg-white"
                  style={{ colorScheme: 'light' }}
                />
              ) : (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  placeholder="Hello {{first_name}}, &#10;&#10;We wanted to let you know..."
                  className={cn(adminInputClass, 'w-full text-content-secondary')}
                />
              )}
              <p className="mt-1 text-[10px] text-content-muted">
                Use <code className="border border-surface-border px-1">{'{{first_name}}'}</code> for personalization. HTML is supported.
              </p>
            </div>

            <label className="flex items-start gap-2 border border-surface-border bg-surface-base p-3 text-xs text-content-secondary">
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              <span>I reviewed the audience, subject, preview, and compliance risk for this broadcast.</span>
            </label>

            <button
              type="button"
              disabled
              className={cn(adminDangerButtonClass, 'w-full py-2.5 text-sm')}
            >
              Send disabled until backend sender is implemented
            </button>
          </div>
        </AdminPanel>

        <AdminPanel title="Governance and history" description="Recipient counts come from the existing send record after the backend processes the campaign.">
          <div className="grid grid-cols-2 gap-2 p-4">
            <AdminMetric label="Draft state" value={subject || body ? 'Dirty' : 'Clean'} />
            <AdminMetric label="Review gate" value={reviewConfirmed ? 'Confirmed' : 'Open'} tone={reviewConfirmed ? 'good' : 'warn'} />
          </div>
          <div className="border-y border-surface-border bg-surface-base p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-content-tertiary" />
              <p className="text-xs leading-5 text-content-secondary">
                Suppression lists, unsubscribe enforcement, and rate limits must be enforced by the existing backend sender. This UI does not invent recipient estimates.
              </p>
            </div>
          </div>
          <div className="p-5">
            {isLoading ? <p className="text-xs text-content-muted">Loading history…</p> : null}
            {!isLoading && blasts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CheckCircle className="h-8 w-8 text-content-muted" />
                <p className="text-xs text-content-muted">No blasts sent yet.</p>
              </div>
            ) : null}
            {!isLoading && blasts.length > 0 ? (
              <div className="space-y-2">
                {blasts.map((blast) => (
                  <div key={blast.id} className="border border-surface-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-content-primary truncate">{blast.subject}</p>
                      <AdminStatusBadge tone={blast.status === 'sent' ? 'good' : blast.status === 'failed' ? 'danger' : 'default'}>{blast.status}</AdminStatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-content-tertiary">
                      <span>{blast.audience_filter}</span>
                      <span>{blast.recipient_count} recipients</span>
                      <span>{new Date(blast.sent_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </AdminPanel>
      </div>
    </section>
  );
}
