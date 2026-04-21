import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAdminPermissions } from '../shared/useAdminPermissions';

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
  const qc = useQueryClient();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AudienceFilter>('all');
  const [isSending, setIsSending] = useState(false);
  const [preview, setPreview] = useState(false);

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

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Body is required'); return; }
    if (body.trim().length < 30) { toast.error('Body must be at least 30 characters'); return; }
    if (!window.confirm(`Send this email blast to ${AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label}? This action cannot be undone.`)) return;

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'send_email_blast', subject: subject.trim(), body: body.trim(), audienceFilter: audience },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast.success(`Email blast queued for ${data?.recipient_count ?? '?'} recipients.`);
      setSubject('');
      setBody('');
      setAudience('all');
      await qc.invalidateQueries({ queryKey: ['admin', 'email-blasts'] });
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-brand-cta" />
          <h1 className="text-lg font-semibold text-content-primary">Email Blast Tool</h1>
        </div>
        <p className="mt-1 text-xs text-content-tertiary">
          Send announcements, re-engagement campaigns, or critical notifications to user segments.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Compose */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Compose</p>

          {!canSend ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
              You need super-admin or moderation.manage permission to send email blasts.
            </div>
          ) : null}

          {/* Audience */}
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-content-secondary">Audience</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAudience(opt.value)}
                  className={`rounded-lg border p-2 text-left transition-colors ${
                    audience === opt.value
                      ? 'border-brand-cta/60 bg-brand-cta/10 text-content-primary'
                      : 'border-surface-border bg-surface-raised text-content-secondary hover:border-surface-border/80'
                  }`}
                >
                  <p className="text-[11px] font-semibold">{opt.label}</p>
                  <p className="text-[10px] text-content-muted mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-content-secondary">
              Subject
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. New feature available for you!"
              className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
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
                className="text-[10px] text-brand-cta hover:underline"
              >
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div
                className="min-h-32 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Hello {{first_name}}, &#10;&#10;We wanted to let you know..."
                className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary"
              />
            )}
            <p className="mt-1 text-[10px] text-content-muted">
              Use <code className="bg-surface-elevated px-1 rounded">{'{{first_name}}'}</code> for personalization. HTML is supported.
            </p>
          </div>

          <button
            type="button"
            disabled={!canSend || isSending}
            onClick={() => void handleSend()}
            className="interactive-press inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-cta bg-brand-cta px-4 py-2.5 text-sm font-semibold text-surface-base disabled:opacity-40"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSending ? 'Sending…' : 'Send blast'}
          </button>
        </div>

        {/* Blast history */}
        <div className="glass-card rounded-2xl p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Sent blasts</p>
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
                <div key={blast.id} className="rounded-lg border border-surface-border bg-surface-raised p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-content-primary truncate">{blast.subject}</p>
                    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] capitalize ${
                      blast.status === 'sent'
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : blast.status === 'failed'
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                          : 'border-surface-border text-content-muted'
                    }`}>{blast.status}</span>
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
      </div>
    </section>
  );
}
