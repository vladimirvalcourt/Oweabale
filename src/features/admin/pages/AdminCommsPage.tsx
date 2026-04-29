import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminDangerButtonClass, adminInputClass } from '../shared/AdminUI';
import { invokeAdminAction } from '../shared/adminActionClient';
import { cn } from '../../../lib/utils';

type CommsPayload = {
  templates: Array<Record<string, unknown>>;
  suppressions: Array<Record<string, unknown>>;
  queue: Array<Record<string, unknown>>;
};

const audiences = ['all', 'free', 'pro', 'lifetime', 'inactive_30d', 'needs_relink'];

export default function AdminCommsPage() {
  const qc = useQueryClient();
  const [key, setKey] = useState('operational_notice');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [testEmail, setTestEmail] = useState('');
  const [suppressionEmail, setSuppressionEmail] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('');

  const commsQuery = useQuery({
    queryKey: ['admin', 'comms'],
    queryFn: () => invokeAdminAction<CommsPayload>({ action: 'comms_templates_list' }),
  });

  const estimateQuery = useQuery({
    queryKey: ['admin', 'comms', 'estimate', audience],
    queryFn: () => invokeAdminAction<{ estimate: { raw_count: number; suppressed_count: number; sendable_count: number } }>({ action: 'comms_recipient_estimate', audience }),
  });

  const mutate = useMutation({
    mutationFn: (action: string) => invokeAdminAction<{ message: string }>({ action, key, subject, body, audience, testEmail, email: suppressionEmail, reason: suppressionReason }),
    onSuccess: async (data) => {
      toast.success(data.message);
      await qc.invalidateQueries({ queryKey: ['admin', 'comms'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payload = commsQuery.data;
  const estimate = estimateQuery.data?.estimate;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Comms"
        title="Communications governance"
        description="Manage templates, suppression, send previews, recipient estimates, and queued campaigns. Sends are queued, not blasted directly from the browser."
        metrics={[
          { label: 'Templates', value: payload?.templates.length ?? '—' },
          { label: 'Suppressions', value: payload?.suppressions.length ?? '—' },
          { label: 'Queue', value: payload?.queue.length ?? '—' },
          { label: 'Sendable', value: estimate?.sendable_count ?? '—' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminPanel title="Template and campaign" description="Save reusable templates, test-send to one address, then queue a governed campaign.">
          <div className="space-y-4 p-4">
            <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
              <input value={key} onChange={(event) => setKey(event.target.value)} className={adminInputClass} placeholder="template_key" />
              <select value={audience} onChange={(event) => setAudience(event.target.value)} className={adminInputClass}>
                {audiences.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="Subject" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} className={cn(adminInputClass, 'min-h-44 w-full')} placeholder="Email body. Include unsubscribe language for marketing campaigns." />
            <input value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="test@example.com" />
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" className={adminButtonClass} disabled={!subject || !body || mutate.isPending} onClick={() => mutate.mutate('comms_template_upsert')}>Save template</button>
              <button type="button" className={adminButtonClass} disabled={!subject || !body || !testEmail || mutate.isPending} onClick={() => mutate.mutate('comms_test_send')}>Queue test</button>
              <button type="button" className={adminDangerButtonClass} disabled={!subject || !body || mutate.isPending} onClick={() => mutate.mutate('comms_queue_campaign')}>Queue campaign</button>
            </div>
          </div>
          <div className="border-t border-surface-border p-4">
            <p className="ui-label mb-2">Preview</p>
            <iframe title="Comms preview" srcDoc={body} sandbox="" className="min-h-56 w-full border border-surface-border bg-white" style={{ colorScheme: 'light' }} />
          </div>
        </AdminPanel>

        <AdminPanel title="Recipient estimate and suppression" description="Suppression list is enforced by the queue model before sends are processed.">
          <div className="grid gap-2 p-4 sm:grid-cols-3">
            <AdminMetric label="Raw" value={estimate?.raw_count ?? '—'} />
            <AdminMetric label="Suppressed" value={estimate?.suppressed_count ?? '—'} tone={estimate?.suppressed_count ? 'warn' : 'default'} />
            <AdminMetric label="Sendable" value={estimate?.sendable_count ?? '—'} tone="good" />
          </div>
          <div className="space-y-3 border-y border-surface-border p-4">
            <input value={suppressionEmail} onChange={(event) => setSuppressionEmail(event.target.value)} className={cn(adminInputClass, 'w-full')} placeholder="suppress@example.com" />
            <textarea value={suppressionReason} onChange={(event) => setSuppressionReason(event.target.value)} className={cn(adminInputClass, 'min-h-20 w-full')} placeholder="Suppression reason or unsubscribe source" />
            <button type="button" className={adminButtonClass} disabled={!suppressionEmail || suppressionReason.length < 8 || mutate.isPending} onClick={() => mutate.mutate('comms_suppress_email')}>Suppress email</button>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 border border-surface-border bg-surface-base p-3 text-xs leading-5 text-content-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-content-tertiary" />
              Campaigns enter `admin_email_queue`. A sender worker can process them later with rate limits, unsubscribe links, and provider-specific retries.
            </div>
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <AdminPanel title="Templates" description="Recently edited templates.">
          {(payload?.templates ?? []).length === 0 ? <AdminEmptyState icon={Mail} title="No templates" description="Save a template to start building governed comms." /> : (
            <div className="divide-y divide-surface-border">
              {(payload?.templates ?? []).map((row) => <div key={String(row.id)} className="p-3 text-xs"><p className="font-semibold text-content-primary">{String(row.key)}</p><p className="text-content-muted">{String(row.subject)}</p></div>)}
            </div>
          )}
        </AdminPanel>
        <AdminPanel title="Queue" description="Queued tests and campaigns.">
          {(payload?.queue ?? []).length === 0 ? <AdminEmptyState icon={Send} title="Queue empty" description="Test sends and campaigns appear here." /> : (
            <div className="divide-y divide-surface-border">
              {(payload?.queue ?? []).map((row) => <div key={String(row.id)} className="flex items-center justify-between gap-3 p-3 text-xs"><span className="font-semibold text-content-primary">{String(row.subject)}</span><AdminStatusBadge>{String(row.status)}</AdminStatusBadge></div>)}
            </div>
          )}
        </AdminPanel>
        <AdminPanel title="Suppressions" description="Recent suppression entries.">
          {(payload?.suppressions ?? []).length === 0 ? <AdminEmptyState icon={ShieldCheck} title="No suppressions" description="Suppressed emails appear here." /> : (
            <div className="divide-y divide-surface-border">
              {(payload?.suppressions ?? []).map((row) => <div key={String(row.id)} className="p-3 text-xs"><p className="font-semibold text-content-primary">{String(row.email)}</p><p className="text-content-muted">{String(row.reason)}</p></div>)}
            </div>
          )}
        </AdminPanel>
      </div>
    </section>
  );
}
