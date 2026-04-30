import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RadioTower } from 'lucide-react';
import { toast } from 'sonner';
import { AdminEmptyState, AdminMetric, AdminPageHeader, AdminPanel, AdminStatusBadge, adminButtonClass, adminInputClass } from '@/features/admin/shared/AdminUI';
import { invokeAdminAction } from '@/features/admin/shared/adminActionClient';
import { cn } from '@/lib/utils';

type IncidentPayload = {
  settings: {
    maintenance_mode: boolean;
    plaid_enabled: boolean;
    broadcast_message: string;
    feature_flags: Record<string, unknown>;
  } | null;
  replay_queue: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
};

export default function AdminIncidentPage() {
  const qc = useQueryClient();
  const [flagKey, setFlagKey] = useState('');
  const [flagValue, setFlagValue] = useState(true);
  const [broadcast, setBroadcast] = useState('');
  const [sourceEventId, setSourceEventId] = useState('');
  const [provider, setProvider] = useState('stripe');
  const [reason, setReason] = useState('');

  const incidentQuery = useQuery({
    queryKey: ['admin', 'incident'],
    queryFn: () => invokeAdminAction<IncidentPayload>({ action: 'platform_controls_get' }),
  });

  const settings = incidentQuery.data?.settings;
  const featureFlags = useMemo(() => settings?.feature_flags ?? {}, [settings?.feature_flags]);

  const updateControls = useMutation({
    mutationFn: (body: Record<string, unknown>) => invokeAdminAction({ action: 'platform_controls_update', ...body }),
    onSuccess: async () => {
      toast.success('Incident controls updated.');
      await qc.invalidateQueries({ queryKey: ['admin', 'incident'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const replayMutation = useMutation({
    mutationFn: () => invokeAdminAction({ action: 'webhook_replay_enqueue', provider, sourceEventId, reason }),
    onSuccess: async () => {
      toast.success('Webhook replay queued.');
      setSourceEventId('');
      await qc.invalidateQueries({ queryKey: ['admin', 'incident'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Incident"
        title="Incident controls"
        description="Operate feature flags, maintenance and broadcast controls, and webhook replay requests from one audited console."
        metrics={[
          { label: 'Maintenance', value: settings?.maintenance_mode ? 'On' : 'Off', tone: settings?.maintenance_mode ? 'danger' : 'good' },
          { label: 'Plaid', value: settings?.plaid_enabled === false ? 'Disabled' : 'Enabled', tone: settings?.plaid_enabled === false ? 'warn' : 'good' },
          { label: 'Flags', value: Object.keys(featureFlags).length },
          { label: 'Replay queue', value: incidentQuery.data?.replay_queue.length ?? '—' },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AdminPanel title="Platform controls" description="These map to platform_settings and are written through admin-actions.">
          {!settings && !incidentQuery.isLoading ? <AdminEmptyState icon={RadioTower} title="No platform settings row" description="Run migrations or seed platform settings before using incident controls." /> : null}
          {settings ? (
            <div className="space-y-4 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className={adminButtonClass} onClick={() => updateControls.mutate({ maintenanceMode: !settings.maintenance_mode })}>
                  {settings.maintenance_mode ? 'Disable' : 'Enable'} maintenance
                </button>
                <button type="button" className={adminButtonClass} onClick={() => updateControls.mutate({ plaidEnabled: !settings.plaid_enabled })}>
                  {settings.plaid_enabled === false ? 'Enable' : 'Disable'} Plaid
                </button>
              </div>
              <textarea value={broadcast || settings.broadcast_message || ''} onChange={(event) => setBroadcast(event.target.value)} className={cn(adminInputClass, 'min-h-24 w-full')} placeholder="Maintenance or broadcast message" />
              <button type="button" className={adminButtonClass} onClick={() => updateControls.mutate({ broadcastMessage: broadcast })}>Save broadcast</button>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <input value={flagKey} onChange={(event) => setFlagKey(event.target.value)} className={adminInputClass} placeholder="feature_flag_key" />
                <select value={String(flagValue)} onChange={(event) => setFlagValue(event.target.value === 'true')} className={adminInputClass}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
                <button type="button" className={adminButtonClass} disabled={!flagKey} onClick={() => updateControls.mutate({ featureFlags: { [flagKey]: flagValue } })}>Set flag</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(featureFlags).map(([key, value]) => <span key={key} className="border border-surface-border px-2 py-1 text-[10px] text-content-tertiary">{key}: {String(value)}</span>)}
              </div>
            </div>
          ) : null}
        </AdminPanel>

        <AdminPanel title="Webhook replay request" description="Replay requests are queued for operator review instead of directly replaying unknown payloads.">
          <div className="space-y-4 p-4">
            <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr]">
              <select value={provider} onChange={(event) => setProvider(event.target.value)} className={adminInputClass}>
                <option value="stripe">Stripe</option>
                <option value="plaid">Plaid</option>
                <option value="risc_google">Google RISC</option>
                <option value="other">Other</option>
              </select>
              <input value={sourceEventId} onChange={(event) => setSourceEventId(event.target.value)} className={adminInputClass} placeholder="source event id" />
            </div>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={cn(adminInputClass, 'min-h-24 w-full')} placeholder="Reason and expected replay outcome" />
            <button type="button" className={adminButtonClass} disabled={!sourceEventId || reason.length < 8 || replayMutation.isPending} onClick={() => replayMutation.mutate()}>Queue replay</button>
          </div>
          <div className="border-t border-surface-border p-4">
            <p className="ui-label mb-2">Recent Stripe webhooks</p>
            <div className="space-y-2">
              {(incidentQuery.data?.webhooks ?? []).map((row) => (
                <div key={String(row.id)} className="flex items-center justify-between gap-3 border border-surface-border bg-surface-base p-2 text-xs">
                  <span className="text-content-secondary">{String(row.event_type)}</span>
                  <span className="text-content-muted">{String(row.stripe_event_id)}</span>
                </div>
              ))}
            </div>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Replay queue" description="Queued work is visible here for incident follow-up.">
        {(incidentQuery.data?.replay_queue ?? []).length === 0 ? <AdminEmptyState icon={AlertTriangle} title="No replay requests" description="Replay requests will appear here after they are queued." /> : (
          <div className="divide-y divide-surface-border">
            {(incidentQuery.data?.replay_queue ?? []).map((row) => (
              <div key={String(row.id)} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div>
                  <p className="font-semibold text-content-primary">{String(row.provider)} · {String(row.source_event_id)}</p>
                  <p className="mt-1 text-content-muted">{String(row.reason)}</p>
                </div>
                <AdminStatusBadge tone={String(row.status) === 'failed' ? 'danger' : 'default'}>{String(row.status)}</AdminStatusBadge>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </section>
  );
}
