import { Activity, AlertTriangle, Radio, RefreshCw, Webhook } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/api/supabase';
import { AdminEmptyState, AdminPageHeader, AdminPanel, AdminStatusBadge } from '@/features/admin/shared/AdminUI';

type TelemetryPayload = {
  telemetry: {
    plaid: {
      rate_limit_near: boolean;
      error_items: number;
      relink_items: number;
    };
    stripe: {
      webhook_events_24h: number;
      avg_webhook_spacing_ms: number | null;
    };
    edge: {
      admin_actions_last_hour: number;
    };
  };
};

export default function AdminTelemetryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'telemetry', 'overview'],
    queryFn: async (): Promise<TelemetryPayload> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          telemetry: {
            plaid: { rate_limit_near: false, error_items: 0, relink_items: 0 },
            stripe: { webhook_events_24h: 0, avg_webhook_spacing_ms: null },
            edge: { admin_actions_last_hour: 0 },
          },
        };
      }
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'telemetry_overview' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data as TelemetryPayload;
    },
    refetchInterval: 30_000,
  });

  const telemetry = data?.telemetry;
  const plaidWarning = Boolean(telemetry?.plaid.rate_limit_near || (telemetry?.plaid.error_items ?? 0) > 0 || (telemetry?.plaid.relink_items ?? 0) > 0);
  const stripeSpacing = telemetry?.stripe.avg_webhook_spacing_ms;
  const stripeWarning = typeof stripeSpacing === 'number' && stripeSpacing < 250;
  const edgeBurst = (telemetry?.edge.admin_actions_last_hour ?? 0) > 100;
  const warningCount = [plaidWarning, stripeWarning, edgeBurst].filter(Boolean).length;

  return (
    <section className="mx-auto max-w-[92rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Monitor"
        title="System telemetry"
        description="A compact operations view for Plaid health, Stripe webhook cadence, and admin edge activity using the existing telemetry endpoint."
        metrics={[
          { label: 'Warnings', value: warningCount, tone: warningCount > 0 ? 'warn' : 'good' },
          { label: 'Status', value: warningCount > 0 ? 'Attention' : 'Nominal', tone: warningCount > 0 ? 'warn' : 'good' },
          { label: 'Refresh', value: '30s' },
          { label: 'Source', value: 'admin-actions' },
        ]}
      />

      {isLoading ? <p className="text-xs text-content-muted">Loading telemetry...</p> : null}
      {error ? <p className="text-xs text-rose-700 dark:text-rose-200">Failed to load telemetry.</p> : null}

      {!isLoading && !error && telemetry ? (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AdminPanel title="Plaid sync health" description="Relink and sync failures are the fastest signal that users cannot refresh account data.">
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Radio className="h-5 w-5 text-content-tertiary" />
                  <AdminStatusBadge tone={plaidWarning ? 'danger' : 'good'}>{plaidWarning ? 'Warning' : 'Healthy'}</AdminStatusBadge>
                </div>
                <p className="text-3xl font-semibold tabular-nums text-content-primary">{telemetry.plaid.error_items}</p>
                <p className="text-xs text-content-tertiary">Items currently reporting sync errors.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-surface-border bg-surface-base p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Relink</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-content-primary">{telemetry.plaid.relink_items}</p>
                  </div>
                  <div className="border border-surface-border bg-surface-base p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Rate limit</p>
                    <p className="mt-1 text-sm font-semibold text-content-primary">{telemetry.plaid.rate_limit_near ? 'Near' : 'Normal'}</p>
                  </div>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel title="Stripe webhooks" description="Dense cadence can point to retries or billing event spikes.">
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Webhook className="h-5 w-5 text-content-tertiary" />
                  <AdminStatusBadge tone={stripeWarning ? 'warn' : 'good'}>{stripeWarning ? 'Dense cadence' : 'Normal'}</AdminStatusBadge>
                </div>
                <p className="text-3xl font-semibold tabular-nums text-content-primary">{telemetry.stripe.webhook_events_24h}</p>
                <p className="text-xs text-content-tertiary">Webhook events in the last 24 hours.</p>
                <div className="border border-surface-border bg-surface-base p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Avg spacing</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-content-primary">
                    {telemetry.stripe.avg_webhook_spacing_ms ?? '—'} ms
                  </p>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel title="Admin edge traffic" description="Shows whether operators are in routine maintenance or incident-response territory.">
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Activity className="h-5 w-5 text-content-tertiary" />
                  <AdminStatusBadge tone={edgeBurst ? 'warn' : 'default'}>{edgeBurst ? 'Elevated' : 'Baseline'}</AdminStatusBadge>
                </div>
                <p className="text-3xl font-semibold tabular-nums text-content-primary">{telemetry.edge.admin_actions_last_hour}</p>
                <p className="text-xs text-content-tertiary">Admin actions in the last hour.</p>
                <div className="border border-surface-border bg-surface-base p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-content-tertiary">Interpretation</p>
                  <p className="mt-1 text-xs leading-5 text-content-secondary">
                    Elevated counts should be checked against audit logs before assuming automated abuse.
                  </p>
                </div>
              </div>
            </AdminPanel>
          </div>

          <AdminPanel title="Warning queue" description="No hidden magic here: this view only shows what the current telemetry endpoint exposes.">
            {warningCount === 0 ? (
              <AdminEmptyState icon={RefreshCw} title="No telemetry warnings" description="Plaid, Stripe cadence, and admin edge volume are inside the current thresholds." />
            ) : (
              <div className="divide-y divide-surface-border">
                {plaidWarning ? (
                  <div className="flex items-start gap-3 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-200" />
                    <div>
                      <p className="text-sm font-semibold text-content-primary">Plaid attention needed</p>
                      <p className="mt-1 text-xs leading-5 text-content-tertiary">Check relink and error queues before blaming user-side refresh problems.</p>
                    </div>
                  </div>
                ) : null}
                {stripeWarning ? (
                  <div className="flex items-start gap-3 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-200" />
                    <div>
                      <p className="text-sm font-semibold text-content-primary">Stripe cadence is dense</p>
                      <p className="mt-1 text-xs leading-5 text-content-tertiary">Compare with recent billing deploys and webhook retries.</p>
                    </div>
                  </div>
                ) : null}
                {edgeBurst ? (
                  <div className="flex items-start gap-3 p-4">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-200" />
                    <div>
                      <p className="text-sm font-semibold text-content-primary">Admin action burst</p>
                      <p className="mt-1 text-xs leading-5 text-content-tertiary">Open audit logs and verify the actor pattern.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </AdminPanel>
        </>
      ) : null}
    </section>
  );
}
