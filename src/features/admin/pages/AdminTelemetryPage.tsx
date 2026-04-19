import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

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
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <header className="glass-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-content-primary">System Telemetry</h1>
            <p className="mt-1 text-xs text-content-tertiary">
              Live operational pulse for Plaid, Stripe webhooks, and edge admin activity.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 transition-colors duration-200 hover:border-content-secondary/40">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Refresh</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">30s</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 transition-colors duration-200 hover:border-content-secondary/40">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Warnings</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">{warningCount}</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-base px-3 py-2 transition-colors duration-200 hover:border-content-secondary/40">
              <p className="text-[10px] uppercase tracking-wide text-content-tertiary">Status</p>
              <p className="mt-1 text-sm font-semibold text-content-primary">
                {warningCount > 0 ? 'Attention needed' : 'Nominal'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? <p className="text-xs text-content-muted">Loading telemetry…</p> : null}
      {error ? <p className="text-xs text-rose-300">Failed to load telemetry.</p> : null}

      {!isLoading && !error && telemetry ? (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-content-tertiary">Plaid sync health</p>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    plaidWarning
                      ? 'border-rose-500/40 bg-rose-500/20 text-rose-200'
                      : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {plaidWarning ? 'Warning' : 'Healthy'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-content-primary">{telemetry.plaid.error_items}</p>
              <p className="mt-1 text-[11px] text-content-muted">Error items</p>
              <p className="mt-2 text-xs text-content-secondary">Relink needed: {telemetry.plaid.relink_items}</p>
              <p className="mt-1 text-xs text-content-secondary">
                Rate-limit pressure: {telemetry.plaid.rate_limit_near ? 'Near threshold' : 'Normal'}
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-content-tertiary">Stripe webhooks</p>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    stripeWarning
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                      : 'border-surface-border bg-surface-base text-content-tertiary'
                  }`}
                >
                  {stripeWarning ? 'Dense cadence' : 'Normal cadence'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-content-primary">{telemetry.stripe.webhook_events_24h}</p>
              <p className="mt-1 text-[11px] text-content-muted">Events in last 24h</p>
              <p className="mt-2 text-xs text-content-secondary">
                Avg spacing: {telemetry.stripe.avg_webhook_spacing_ms ?? '—'} ms
              </p>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-content-tertiary">Admin edge traffic</p>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                    edgeBurst ? 'border-amber-500/40 bg-amber-500/15 text-amber-200' : 'border-surface-border bg-surface-base text-content-tertiary'
                  }`}
                >
                  {edgeBurst ? 'Elevated' : 'Baseline'}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-content-primary">{telemetry.edge.admin_actions_last_hour}</p>
              <p className="mt-1 text-[11px] text-content-muted">Admin actions in last hour</p>
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-content-primary">Operational Notes</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary">
                Plaid syncs are healthy when error and relink queues stay near zero.
              </div>
              <div className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary">
                Stripe spacing values trending down can indicate burst retries or delivery spikes.
              </div>
              <div className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-secondary">
                Edge admin action counts help distinguish routine operations from incident response periods.
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
